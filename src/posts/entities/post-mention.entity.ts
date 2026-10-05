import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from './post.entity';

@Entity('post_mentions')
@Index(['mentionedUserId'])
export class PostMention {
  @PrimaryColumn({ name: 'post_id', type: 'uuid' })
  postId: string;

  @PrimaryColumn({ name: 'mentioned_user_id' })
  mentionedUserId: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
