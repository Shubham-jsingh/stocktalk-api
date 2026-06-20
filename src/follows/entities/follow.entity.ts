import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FollowTargetType {
  STOCK = 'stock',
  SECTOR = 'sector',
}

// A single user follows either a stock or a sector. One row per follow.
@Entity('follows')
@Index(['userId', 'targetType', 'targetId'], { unique: true })
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'target_type', type: 'enum', enum: FollowTargetType })
  targetType: FollowTargetType;

  @Column({ name: 'target_id' })
  targetId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
