import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { FeedPage } from '../common/types/feed-page';
import { Post } from '../posts/entities/post.entity';
import { decodeFeedCursor, encodeFeedCursor } from '../posts/feed-cursor';
import { User } from '../users/entities/user.entity';
import { DevicePlatform, DeviceToken } from './entities/device-token.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { PushService } from './push.service';

// A user who unfollows and re-follows within this window is not re-announced.
const FOLLOW_DEDUPE_MS = 24 * 60 * 60 * 1000;
const SNIPPET_LENGTH = 120;

export interface NotificationView {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  actor: {
    id: string;
    username: string;
    fullName: string | null;
    profilePhotoUrl: string | null;
  };
  post: {
    id: string;
    title: string;
    imageUrl: string | null;
    links: string[];
  } | null;
  comment: { id: string; body: string } | null;
}

interface CreatedPost {
  id: string;
  authorId: string;
  title: string;
  imageUrl?: string | null;
  links?: string[];
}

interface CreatedComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokens: Repository<DeviceToken>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly pushService: PushService,
  ) {}

  // ---- Event hooks. Callers do not await these; failures are only logged so
  // that a notification problem never fails the comment/follow/post itself.

  onCommentCreated(comment: CreatedComment): void {
    this.runInBackground('comment', () => this.handleComment(comment));
  }

  onUserFollowed(followerId: string, followeeId: string): void {
    this.runInBackground('follow', () =>
      this.handleFollow(followerId, followeeId),
    );
  }

  onPostCreated(post: CreatedPost): void {
    this.runInBackground('post', () => this.handlePost(post));
  }

  // ---- Alerts tab API

  async list(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<FeedPage<NotificationView>> {
    const qb = this.notifications
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.actor', 'actor')
      .leftJoinAndSelect('n.post', 'post')
      .leftJoinAndSelect('n.comment', 'comment')
      .where('n.recipient_id = :userId', { userId });

    if (cursor) {
      let parsed: { createdAt: string; id: string };
      try {
        parsed = decodeFeedCursor(cursor);
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
      // created_at is a timestamp without time zone holding the DB session's
      // wall-clock time, while the cursor is a UTC ISO instant. Convert the
      // cursor to that wall-clock time, or a non-UTC database skips rows.
      qb.andWhere(
        `(n.created_at, n.id) < ((:cursorAt)::timestamptz AT TIME ZONE current_setting('TimeZone'), :cursorId)`,
        { cursorAt: parsed.createdAt, cursorId: parsed.id },
      );
    }

    const rows = await qb
      .orderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .take(limit + 1)
      .getMany();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => this.toView(row)),
      limit,
      nextCursor:
        hasMore && last ? encodeFeedCursor(last.createdAt, last.id) : null,
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notifications.count({
      where: { recipientId: userId, readAt: IsNull() },
    });
    return { count };
  }

  // Badge count: notifications that arrived since the Alerts tab was last opened.
  async unseenCount(userId: string): Promise<{ count: number }> {
    const count = await this.notifications.count({
      where: { recipientId: userId, seenAt: IsNull() },
    });
    return { count };
  }

  // Opening the Alerts tab clears the badge but leaves rows unread.
  async markSeen(userId: string): Promise<{ count: number }> {
    await this.notifications.update(
      { recipientId: userId, seenAt: IsNull() },
      { seenAt: new Date() },
    );
    return { count: 0 };
  }

  // Marks notifications read (and seen). With neither ids nor postIds, marks
  // everything. Returns the remaining badge (unseen) count.
  async markRead(
    userId: string,
    ids?: string[],
    postIds?: string[],
  ): Promise<{ count: number }> {
    const filters = [
      ...(ids?.length ? [{ id: In(ids) }] : []),
      ...(postIds?.length ? [{ postId: In(postIds) }] : []),
    ];
    const scoped = <T extends object>(base: T) =>
      filters.length ? filters.map((f) => ({ ...base, ...f })) : base;

    const now = new Date();
    await this.notifications.update(
      scoped({ recipientId: userId, readAt: IsNull() }),
      { readAt: now },
    );
    await this.notifications.update(
      scoped({ recipientId: userId, seenAt: IsNull() }),
      { seenAt: now },
    );
    return this.unseenCount(userId);
  }

  // ---- Device tokens

  async registerDevice(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<void> {
    // A token moves to whoever signed in on the device most recently.
    await this.deviceTokens.query(
      `INSERT INTO device_tokens (token, user_id, platform, last_seen_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             last_seen_at = now()`,
      [token, userId, platform],
    );
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.deviceTokens.delete({ token, userId });
  }

  // ---- Handlers

  private async handleComment(comment: CreatedComment): Promise<void> {
    // Only direct comments on a post alert the post owner; replies do not.
    if (comment.parentId) {
      return;
    }
    const post = await this.postsRepository.findOne({
      where: { id: comment.postId },
      select: { id: true, authorId: true },
    });
    if (!post || post.authorId === comment.authorId) {
      return;
    }

    const saved = await this.notifications.save(
      this.notifications.create({
        recipientId: post.authorId,
        actorId: comment.authorId,
        type: NotificationType.POST_COMMENT,
        postId: post.id,
        commentId: comment.id,
      }),
    );

    const actorName = await this.displayName(comment.authorId);
    await this.pushService.sendToUsers([post.authorId], {
      title: `${actorName} commented on your post`,
      body: snippet(comment.body),
      data: {
        type: NotificationType.POST_COMMENT,
        notificationId: saved.id,
        postId: post.id,
        commentId: comment.id,
        actorId: comment.authorId,
      },
    });
  }

  private async handleFollow(
    followerId: string,
    followeeId: string,
  ): Promise<void> {
    const recentlyNotified = await this.notifications.exists({
      where: {
        recipientId: followeeId,
        actorId: followerId,
        type: NotificationType.NEW_FOLLOWER,
        createdAt: MoreThan(new Date(Date.now() - FOLLOW_DEDUPE_MS)),
      },
    });
    if (recentlyNotified) {
      return;
    }

    const saved = await this.notifications.save(
      this.notifications.create({
        recipientId: followeeId,
        actorId: followerId,
        type: NotificationType.NEW_FOLLOWER,
      }),
    );

    const actorName = await this.displayName(followerId);
    await this.pushService.sendToUsers([followeeId], {
      title: 'New follower',
      body: `${actorName} started following you`,
      data: {
        type: NotificationType.NEW_FOLLOWER,
        notificationId: saved.id,
        actorId: followerId,
      },
    });
  }

  private async handlePost(post: CreatedPost): Promise<void> {
    // Fan out in SQL so followers never have to be loaded into memory.
    // Explicit casts: $1 appears both as a value and in the WHERE clause, and
    // Postgres can't infer one type for it otherwise.
    const inserted: unknown[] = await this.notifications.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, post_id)
       SELECT follower_id, $1::varchar, $2::notifications_type_enum, $3::uuid
         FROM user_follows
        WHERE followee_id = $1::varchar
       RETURNING id`,
      [post.authorId, NotificationType.FOLLOWED_USER_POST, post.id],
    );
    if (!inserted.length) {
      return;
    }

    const actorName = await this.displayName(post.authorId);
    const link = post.links?.find((url) => url.trim().length > 0);
    const imageUrl = post.imageUrl ?? undefined;
    await this.pushService.sendToFollowersOf(post.authorId, {
      title: `${actorName} shared a new post`,
      body: link
        ? `${snippet(post.title)}\n🔗 ${linkLabel(link)}`
        : snippet(post.title),
      imageUrl,
      data: {
        type: NotificationType.FOLLOWED_USER_POST,
        postId: post.id,
        actorId: post.authorId,
        ...(link ? { link } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
  }

  private async displayName(userId: string): Promise<string> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, username: true, fullName: true },
    });
    return user?.fullName?.trim() || user?.username || 'Someone';
  }

  private toView(row: Notification): NotificationView {
    return {
      id: row.id,
      type: row.type,
      read: row.readAt !== null,
      createdAt: row.createdAt,
      actor: {
        id: row.actor.id,
        username: row.actor.username,
        fullName: row.actor.fullName,
        profilePhotoUrl: row.actor.profilePhotoUrl,
      },
      post: row.post
        ? {
            id: row.post.id,
            title: row.post.title,
            imageUrl: row.post.imageUrl,
            links: row.post.links ?? [],
          }
        : null,
      comment: row.comment
        ? { id: row.comment.id, body: snippet(row.comment.body) }
        : null,
    };
  }

  private runInBackground(label: string, task: () => Promise<void>): void {
    task().catch((error: unknown) => {
      this.logger.error(
        `Failed to deliver ${label} notification`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }
}

// "www.tradingview.com/symbols/..." -> "tradingview.com"
function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET_LENGTH
    ? `${flat.slice(0, SNIPPET_LENGTH - 1)}…`
    : flat;
}
