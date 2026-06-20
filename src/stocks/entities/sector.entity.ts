import {
  Column,
  Entity,
  Index,
  OneToMany,
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

  @OneToMany(() => Stock, (stock) => stock.sector)
  stocks: Stock[];
}
