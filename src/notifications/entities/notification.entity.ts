import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comment } from '../../posts/entities/comment.entity';
import { Post } from '../../posts/entities/post.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  // Someone left a top-level comment on the recipient's post.
  POST_COMMENT = 'post_comment',
  // Someone started following the recipient.
  NEW_FOLLOWER = 'new_follower',
  // A user the recipient follows published a post.
  FOLLOWED_USER_POST = 'followed_user_post',
}

// One row per alert shown in a user's Alerts tab. Push delivery is
// best-effort; this table is the source of truth.
@Entity('notifications')
@Index(['recipientId', 'createdAt', 'id'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'post_id' })
  post: Post | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId: string | null;

  @ManyToOne(() => Comment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment | null;

  @Column({ name: 'comment_id', type: 'uuid', nullable: true })
  commentId: string | null;

  // Set when the recipient opens the Alerts tab (or reads it). Drives the
  // tab badge; readAt drives the per-row unread style.
  @Column({ name: 'seen_at', type: 'timestamp', nullable: true })
  seenAt: Date | null;

  // Set when the recipient taps this notification (row or push).
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
