import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // Create a comment, or a reply when parentCommentId is provided.
  @Post()
  create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, dto);
  }

  // List top-level comments (paginated), each with its one-level replies.
  @Get()
  list(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.commentsService.listForPost(postId, pagination);
  }
}
