import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from './post.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

// One reaction per (user, post). Switching like<->dislike updates this row.
@Entity('post_reactions')
@Index(['postId', 'userId'], { unique: true })
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ReactionType })
  type: ReactionType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
