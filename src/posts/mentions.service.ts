import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CommentMention } from './entities/comment-mention.entity';
import { Comment } from './entities/comment.entity';
import { PostMention } from './entities/post-mention.entity';
import { Post } from './entities/post.entity';
import { MAX_MENTIONS, MentionUser } from './mention-user';

@Injectable()
export class MentionsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PostMention)
    private readonly postMentions: Repository<PostMention>,
    @InjectRepository(CommentMention)
    private readonly commentMentions: Repository<CommentMention>,
  ) {}

  async resolveIds(
    authorId: string,
    mentionedUserIds?: string[],
  ): Promise<string[]> {
    if (!mentionedUserIds?.length) {
      return [];
    }

    const unique = [
      ...new Set(mentionedUserIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (unique.length > MAX_MENTIONS) {
      throw new BadRequestException(
        `You can mention at most ${MAX_MENTIONS} users`,
      );
    }
    if (unique.includes(authorId)) {
      throw new BadRequestException('You cannot mention yourself');
    }

    const found = await this.usersRepository.find({
      where: { id: In(unique) },
      select: { id: true },
    });
    const foundIds = new Set(found.map((user) => user.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new NotFoundException(`User ${missing[0]} not found`);
    }
    return unique;
  }

  async replacePostMentions(
    postId: string,
    mentionedUserIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(PostMention)
      : this.postMentions;
    await repo.delete({ postId });
    if (!mentionedUserIds.length) {
      return;
    }
    await repo.save(
      mentionedUserIds.map((mentionedUserId) =>
        repo.create({ postId, mentionedUserId }),
      ),
    );
  }

  async replaceCommentMentions(
    commentId: string,
    mentionedUserIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(CommentMention)
      : this.commentMentions;
    await repo.delete({ commentId });
    if (!mentionedUserIds.length) {
      return;
    }
    await repo.save(
      mentionedUserIds.map((mentionedUserId) =>
        repo.create({ commentId, mentionedUserId }),
      ),
    );
  }

  async attachToPosts(posts: Post[]): Promise<void> {
    if (!posts.length) {
      return;
    }
    const rows = await this.postMentions.find({
      where: { postId: In(posts.map((post) => post.id)) },
      relations: { mentionedUser: true },
      order: { createdAt: 'ASC' },
    });
    const byPost = new Map<string, MentionUser[]>();
    for (const row of rows) {
      const list = byPost.get(row.postId) ?? [];
      list.push(toMentionUser(row.mentionedUser));
      byPost.set(row.postId, list);
    }
    for (const post of posts) {
      post.mentions = byPost.get(post.id) ?? [];
    }
  }

  async attachToComments(comments: Comment[]): Promise<void> {
    if (!comments.length) {
      return;
    }
    const rows = await this.commentMentions.find({
      where: { commentId: In(comments.map((comment) => comment.id)) },
      relations: { mentionedUser: true },
      order: { createdAt: 'ASC' },
    });
    const byComment = new Map<string, MentionUser[]>();
    for (const row of rows) {
      const list = byComment.get(row.commentId) ?? [];
      list.push(toMentionUser(row.mentionedUser));
      byComment.set(row.commentId, list);
    }
    for (const comment of comments) {
      comment.mentions = byComment.get(comment.id) ?? [];
    }
  }
}

function toMentionUser(user: User): MentionUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    profilePhotoUrl: user.profilePhotoUrl,
  };
}
