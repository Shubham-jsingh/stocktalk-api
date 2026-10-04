import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Stock } from './stock.entity';

@Entity('sectors')
export class Sector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  // Denormalized so "how many users follow this sector" is a single column read.
  @Column({ name: 'follower_count', type: 'int', default: 0 })
  followerCount: number;

  @ManyToMany(() => Stock, (stock) => stock.sectors)
  stocks: Stock[];
}
