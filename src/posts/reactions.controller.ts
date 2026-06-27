import { Body, Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ReactionDto } from './dto/reaction.dto';
import { ReactionType } from './entities/post-reaction.entity';
import { ReactionsService } from './reactions.service';

@Controller('posts/:postId')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post('like')
  like(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.reactionsService.setReaction(
      postId,
      dto.userId,
      ReactionType.LIKE,
    );
  }

  @Post('dislike')
  dislike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.reactionsService.setReaction(
      postId,
      dto.userId,
      ReactionType.DISLIKE,
    );
  }

  // Remove the caller's like/dislike from the post.
  @Delete('reaction')
  remove(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.reactionsService.removeReaction(postId, dto.userId);
  }
}
