import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { Follow } from './follows/entities/follow.entity';
import { FollowsModule } from './follows/follows.module';
import { Comment } from './posts/entities/comment.entity';
import { PostReaction } from './posts/entities/post-reaction.entity';
import { Post } from './posts/entities/post.entity';
import { PostsModule } from './posts/posts.module';
import { Sector } from './stocks/entities/sector.entity';
import { Stock } from './stocks/entities/stock.entity';
import { StocksModule } from './stocks/stocks.module';
import { StorageModule } from './storage/storage.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Cloud SQL via Unix socket when INSTANCE_CONNECTION_NAME is set
        // (Cloud Run mounts /cloudsql/<project:region:instance>).
        const instanceConnectionName = config.get<string>(
          'INSTANCE_CONNECTION_NAME',
        );

        return {
          type: 'postgres' as const,
          ...(instanceConnectionName
            ? { host: `/cloudsql/${instanceConnectionName}` }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
              }),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          entities: [User, Stock, Sector, Follow, Post, PostReaction, Comment],
          synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        };
      },
    }),
    AuthModule,
    StorageModule,
    UsersModule,
    StocksModule,
    FollowsModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
})
export class AppModule {}
