import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { SectorFollow } from '../follows/entities/sector-follow.entity';
import { StockFollow } from '../follows/entities/stock-follow.entity';
import { UserFollow } from '../follows/entities/user-follow.entity';
import { Comment } from '../posts/entities/comment.entity';
import { PostReaction } from '../posts/entities/post-reaction.entity';
import { Post } from '../posts/entities/post.entity';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';

config();

const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;

// ts-node uses src/.../*.ts; compiled runs use dist/database/migrations/*.js
const migrationsDir = __filename.endsWith('.js')
  ? join(__dirname, 'migrations', '*.js')
  : join(__dirname, 'migrations', '*.ts');

export default new DataSource({
  type: 'postgres',
  ...(instanceConnectionName
    ? { host: `/cloudsql/${instanceConnectionName}` }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
      }),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Stock,
    Sector,
    UserFollow,
    StockFollow,
    SectorFollow,
    Post,
    PostReaction,
    Comment,
  ],
  migrations: [migrationsDir],
});
