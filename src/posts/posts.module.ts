import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsModule } from '../follows/follows.module';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CommentMention } from './entities/comment-mention.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { PostMention } from './entities/post-mention.entity';
import { Post } from './entities/post.entity';
import { MentionsService } from './mentions.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostMention,
      PostReaction,
      Comment,
      CommentMention,
      User,
      Sector,
      Stock,
    ]),
    FollowsModule,
  ],
  controllers: [PostsController, ReactionsController, CommentsController],
  providers: [PostsService, ReactionsService, CommentsService, MentionsService],
})
export class PostsModule {}
