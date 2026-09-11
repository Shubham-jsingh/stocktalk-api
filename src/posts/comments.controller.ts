import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @GetUser() auth: AuthUser,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, auth.uid, dto);
  }

  @Public()
  @Get()
  list(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.commentsService.listForPost(postId, pagination);
  }
}
