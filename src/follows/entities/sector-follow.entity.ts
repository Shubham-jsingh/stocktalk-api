import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Sector } from '../../stocks/entities/sector.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sector_follows')
@Index(['sectorId'])
export class SectorFollow {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'sector_id', type: 'uuid' })
  sectorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Sector, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
