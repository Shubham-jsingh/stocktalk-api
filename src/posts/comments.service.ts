import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Comment } from './entities/comment.entity';
import { Post } from './entities/post.entity';
import { Paginated } from './posts.service';

export interface CommentWithReplies {
  comment: Comment;
  replies: Comment[];
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(postId: string, authorId: string, dto: CreateCommentDto): Promise<Comment> {
    await this.ensurePost(postId);
    await this.ensureUser(authorId);

    // A reply must point at a top-level comment on the same post; we never
    // allow replying to a reply (max depth = 1).
    if (dto.parentCommentId) {
      const parent = await this.commentsRepository.findOne({
        where: { id: dto.parentCommentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException(
          `Parent comment ${dto.parentCommentId} not found on this post`,
        );
      }
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Replies are only allowed one level deep (cannot reply to a reply)',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const comments = manager.getRepository(Comment);
      const saved = await comments.save(
        comments.create({
          postId,
          authorId,
          body: dto.body,
          parentId: dto.parentCommentId ?? null,
        }),
      );

      // Maintain denormalized counters.
      if (dto.parentCommentId) {
        await comments.increment(
          { id: dto.parentCommentId },
          'replyCount',
          1,
        );
      }
      await manager.getRepository(Post).increment(
        { id: postId },
        'commentCount',
        1,
      );

      return comments.findOneOrFail({ where: { id: saved.id } });
    });
  }

  // Returns top-level comments (paginated) for a post, each with its replies.
  async listForPost(
    postId: string,
    pagination: PaginationQueryDto,
  ): Promise<Paginated<CommentWithReplies>> {
    await this.ensurePost(postId);
    const { page, limit } = pagination;

    const [topLevel, total] = await this.commentsRepository.findAndCount({
      where: { postId, parentId: IsNull() },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const parentIds = topLevel.map((c) => c.id);
    const replies = parentIds.length
      ? await this.commentsRepository.find({
          where: parentIds.map((id) => ({ parentId: id })),
          order: { createdAt: 'ASC' },
        })
      : [];

    const items: CommentWithReplies[] = topLevel.map((comment) => ({
      comment,
      replies: replies.filter((r) => r.parentId === comment.id),
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async ensurePost(postId: string): Promise<void> {
    const exists = await this.postsRepository.existsBy({ id: postId });
    if (!exists) {
      throw new NotFoundException(`Post ${postId} not found`);
    }
  }

  private async ensureUser(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsBy({ id: userId });
    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
