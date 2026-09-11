import { Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { ReactionType } from './entities/post-reaction.entity';
import { ReactionsService } from './reactions.service';

@Controller('posts/:postId')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post('like')
  like(@GetUser() auth: AuthUser, @Param('postId', ParseUUIDPipe) postId: string) {
    return this.reactionsService.setReaction(
      postId,
      auth.uid,
      ReactionType.LIKE,
    );
  }

  @Post('dislike')
  dislike(
    @GetUser() auth: AuthUser,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.reactionsService.setReaction(
      postId,
      auth.uid,
      ReactionType.DISLIKE,
    );
  }

  @Delete('reaction')
  remove(
    @GetUser() auth: AuthUser,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.reactionsService.removeReaction(postId, auth.uid);
  }
}
