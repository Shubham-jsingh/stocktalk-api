import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Follow } from '../follows/entities/follow.entity';
import { Comment } from '../posts/entities/comment.entity';
import { PostReaction } from '../posts/entities/post-reaction.entity';
import { Post } from '../posts/entities/post.entity';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';

config();

const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;

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
  entities: [User, Stock, Sector, Follow, Post, PostReaction, Comment],
  migrations: ['src/database/migrations/*.ts'],
});
