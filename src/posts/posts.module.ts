import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsModule } from '../follows/follows.module';
import { Sector } from '../stocks/entities/sector.entity';
import { User } from '../users/entities/user.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { Post } from './entities/post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostReaction, Comment, User, Sector]),
    FollowsModule,
  ],
  controllers: [PostsController, ReactionsController, CommentsController],
  providers: [PostsService, ReactionsService, CommentsService],
})
export class PostsModule {}
