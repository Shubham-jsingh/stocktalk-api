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

// Comments are at most one level deep: a comment is either top-level
// (parentId = null) or a direct reply to a top-level comment.
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ type: 'text' })
  body: string;

  // Null for top-level comments; set to the parent comment id for replies.
  @Index()
  @ManyToOne(() => Comment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  // Denormalized count of direct replies for top-level comments.
  @Column({ name: 'reply_count', type: 'int', default: 0 })
  replyCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
