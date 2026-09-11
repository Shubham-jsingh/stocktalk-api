import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FollowsService } from '../follows/follows.service';
import { Sector } from '../stocks/entities/sector.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedQueryDto, FeedType } from './dto/feed-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Sentinel meaning "the filter matched nothing, return an empty page".
const EMPTY_FEED = Symbol('EMPTY_FEED');

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
    private readonly followsService: FollowsService,
  ) {}

  async create(authorId: string, dto: CreatePostDto): Promise<Post> {
    const authorExists = await this.usersRepository.existsBy({
      id: authorId,
    });
    if (!authorExists) {
      throw new NotFoundException(`User ${authorId} not found`);
    }

    if (dto.sectorId) {
      const sectorExists = await this.sectorsRepository.existsBy({
        id: dto.sectorId,
      });
      if (!sectorExists) {
        throw new NotFoundException(`Sector ${dto.sectorId} not found`);
      }
    }

    const post = this.postsRepository.create({
      authorId,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl ?? null,
      links: dto.links ?? [],
      sectorId: dto.sectorId ?? null,
    });

    const saved = await this.postsRepository.save(post);
    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }

  async update(id: string, actorId: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);

    if (post.authorId !== actorId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    if (dto.sectorId) {
      const sectorExists = await this.sectorsRepository.existsBy({
        id: dto.sectorId,
      });
      if (!sectorExists) {
        throw new NotFoundException(`Sector ${dto.sectorId} not found`);
      }
    }

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        (post as unknown as Record<string, unknown>)[key] = value;
      }
    }

    await this.postsRepository.save(post);
    return this.findOne(id);
  }

  // Paginated feed. Modes:
  //  - all: every post, newest first
  //  - following_users: posts authored by users the given user follows
  //  - following_sectors: posts in sectors the given user follows
  async feed(query: FeedQueryDto): Promise<Paginated<Post>> {
    const { feed, userId, page, limit } = query;

    const where = await this.buildFeedWhere(feed, userId);
    if (where === EMPTY_FEED) {
      return { items: [], page, limit, total: 0, totalPages: 0 };
    }

    const [items, total] = await this.postsRepository.findAndCount({
      where: where ?? {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async buildFeedWhere(
    feed: FeedType,
    userId?: string,
  ): Promise<Record<string, unknown> | typeof EMPTY_FEED | null> {
    if (feed === FeedType.ALL) {
      return null;
    }

    if (!userId) {
      throw new NotFoundException(
        `userId is required for the "${feed}" feed`,
      );
    }
    await this.ensureUser(userId);

    if (feed === FeedType.FOLLOWING_USERS) {
      const userIds = await this.followsService.getFollowedUserIds(userId);
      return userIds.length ? { authorId: In(userIds) } : EMPTY_FEED;
    }

    // FOLLOWING_SECTORS
    const sectorIds = await this.followsService.getFollowedSectorIds(userId);
    return sectorIds.length ? { sectorId: In(sectorIds) } : EMPTY_FEED;
  }

  private async ensureUser(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsBy({ id: userId });
    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
