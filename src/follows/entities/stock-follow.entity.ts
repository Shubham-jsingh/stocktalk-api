import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Stock } from '../../stocks/entities/stock.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stock_follows')
@Index(['stockId'])
export class StockFollow {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'stock_id', type: 'uuid' })
  stockId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_id' })
  stock: Stock;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
