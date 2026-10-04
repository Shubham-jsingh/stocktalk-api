import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_follows')
@Index(['followeeId'])
export class UserFollow {
  @PrimaryColumn({ name: 'follower_id' })
  followerId: string;

  @PrimaryColumn({ name: 'followee_id' })
  followeeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followee_id' })
  followee: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
