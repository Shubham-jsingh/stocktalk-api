import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post as HttpPost,
  Query,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  // GET /posts?feed=all|following_users|following_sectors&userId=&page=&limit=
  @Get()
  feed(@Query() query: FeedQueryDto) {
    return this.postsService.feed(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, dto);
  }
}
