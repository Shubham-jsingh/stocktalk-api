import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sector } from './sector.entity';

@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ticker symbol, e.g. AAPL. Uppercased and unique.
  @Index({ unique: true })
  @Column()
  symbol: string;

  @Index()
  @Column()
  name: string;

  @Column({ default: 'NASDAQ' })
  exchange: string;

  @Index()
  @Column({ name: 'is_favourite', type: 'boolean', default: false })
  isFavourite: boolean;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  // USD market cap. bigint is returned as a string by the pg driver.
  @Column({ name: 'market_cap', type: 'bigint', nullable: true })
  marketCap: string | null;

  // Denormalized so "how many users follow this stock" is a single column read.
  @Column({ name: 'follower_count', type: 'int', default: 0 })
  followerCount: number;

  // Primary sector kept for older clients. Membership itself lives in stock_sectors.
  @ManyToOne(() => Sector, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @ManyToMany(() => Sector, (sector) => sector.stocks)
  @JoinTable({
    name: 'stock_sectors',
    joinColumn: { name: 'stock_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'sector_id', referencedColumnName: 'id' },
  })
  sectors: Sector[];
}
