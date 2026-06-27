import {
  Column,
  Entity,
  Index,
  JoinColumn,
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

  @ManyToOne(() => Sector, (sector) => sector.stocks, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector | null;
}
