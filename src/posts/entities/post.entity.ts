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
import { Sector } from '../../stocks/entities/sector.entity';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  // Arbitrary related links (e.g. articles, charts). Stored as a JSON array.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  links: string[];

  // Author of the post. Indexed for the "following users" feed.
  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  // Optional sector this post belongs to. Indexed for the "following sectors" feed.
  @Index()
  @ManyToOne(() => Sector, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  // Denormalized counters kept in sync on each reaction/comment change so that
  // feeds and "how many likes" reads are O(1) and don't need aggregate queries.
  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'dislike_count', type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount: number;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
