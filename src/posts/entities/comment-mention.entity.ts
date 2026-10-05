import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';

@Entity('comment_mentions')
@Index(['mentionedUserId'])
export class CommentMention {
  @PrimaryColumn({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @PrimaryColumn({ name: 'mentioned_user_id' })
  mentionedUserId: string;

  @ManyToOne(() => Comment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
