import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FeedPage } from '../common/types/feed-page';
import { FollowsService } from '../follows/follows.service';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { FeedOrder, FeedQueryDto, FeedType } from './dto/feed-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';

// Sentinel meaning "the filter matched nothing, return an empty page".
const EMPTY_FEED = Symbol('EMPTY_FEED');

interface FeedFilter {
  authorIds?: string[];
  sectorIds?: string[];
  stockIds?: string[];
  authorsRequired?: boolean;
}

const POST_RELATIONS = {
  author: true,
  sector: true,
  stock: { sector: true, sectors: true },
};

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
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

    if (dto.stockId) {
      const stockExists = await this.stocksRepository.existsBy({
        id: dto.stockId,
      });
      if (!stockExists) {
        throw new NotFoundException(`Stock ${dto.stockId} not found`);
      }
    }

    const post = this.postsRepository.create({
      authorId,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl ?? null,
      links: dto.links ?? [],
      sectorId: dto.sectorId ?? null,
      stockId: dto.stockId ?? null,
    });

    const saved = await this.postsRepository.save(post);
    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: POST_RELATIONS,
    });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return this.stripAuthor(post);
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

    if (dto.stockId) {
      const stockExists = await this.stocksRepository.existsBy({
        id: dto.stockId,
      });
      if (!stockExists) {
        throw new NotFoundException(`Stock ${dto.stockId} not found`);
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
  //  - all: every post (optional sectorIds / stockIds filter)
  //  - following_users: posts authored by users the given user follows
  //  - following_sectors: posts in sectors the given user follows
  //  - following: posts from followed users, sectors, or stocks.
  //    If that set is empty, the latest posts overall are returned (fallback).
  async feed(viewerId: string, query: FeedQueryDto): Promise<FeedPage<Post>> {
    const { feed, limit, sectorIds, stockIds, order, cursor } = query;
    const direction = order === FeedOrder.ASC ? 'ASC' : 'DESC';

    if (feed === FeedType.FOLLOWING) {
      return this.followingFeed(viewerId, limit, direction, cursor);
    }

    const filter = await this.buildFeedFilter(feed, viewerId, sectorIds, stockIds);
    if (filter === EMPTY_FEED) {
      return this.emptyFeed(limit);
    }
    return this.loadFeed(filter, limit, direction, cursor);
  }

  private async followingFeed(
    viewerId: string,
    limit: number,
    direction: 'ASC' | 'DESC',
    cursor?: string,
  ): Promise<FeedPage<Post>> {
    await this.ensureUser(viewerId);
    const [authorIds, sectorIds, stockIds] = await Promise.all([
      this.followsService.getFollowedUserIds(viewerId),
      this.followsService.getFollowedSectorIds(viewerId),
      this.followsService.getFollowedStockIds(viewerId),
    ]);

    if (!authorIds.length && !sectorIds.length && !stockIds.length) {
      const latest = await this.loadFeed(null, limit, direction, cursor);
      return { ...latest, fallback: true };
    }

    const matched = await this.loadFeed(
      { authorIds, sectorIds, stockIds },
      limit,
      direction,
      cursor,
    );
    if (matched.items.length === 0 && !cursor) {
      const latest = await this.loadFeed(null, limit, direction);
      return { ...latest, fallback: true };
    }
    return matched;
  }

  private async loadFeed(
    filter: FeedFilter | null,
    limit: number,
    direction: 'ASC' | 'DESC',
    cursor?: string,
  ): Promise<FeedPage<Post>> {
    const qb = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.sector', 'sector')
      .leftJoinAndSelect('post.stock', 'stock')
      .leftJoinAndSelect('stock.sector', 'stockSector')
      .leftJoinAndSelect('stock.sectors', 'stockSectors');

    this.applyFeedFilter(qb, filter);
    this.applyCursor(qb, cursor, direction);
    qb.orderBy('post.created_at', direction)
      .addOrderBy('post.id', direction)
      .take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((post) => this.stripAuthor(post));
    const last = items[items.length - 1];
    return {
      items,
      limit,
      nextCursor:
        hasMore && last ? encodeFeedCursor(last.createdAt, last.id) : null,
    };
  }

  private applyFeedFilter(
    qb: SelectQueryBuilder<Post>,
    filter: FeedFilter | null,
  ): void {
    if (!filter) {
      return;
    }
    if (filter.authorsRequired && filter.authorIds?.length) {
      qb.andWhere('post.author_id IN (:...authorIds)', {
        authorIds: filter.authorIds,
      });
    }
    const branches: string[] = [];
    if (!filter.authorsRequired && filter.authorIds?.length) {
      branches.push('post.author_id IN (:...authorIds)');
    }
    if (filter.sectorIds?.length) {
      branches.push('post.sector_id IN (:...sectorIds)');
    }
    if (filter.stockIds?.length) {
      branches.push('post.stock_id IN (:...stockIds)');
    }
    if (!branches.length) {
      if (!filter.authorsRequired) {
        qb.andWhere('1 = 0');
      }
      return;
    }
    qb.andWhere(`(${branches.join(' OR ')})`, {
      authorIds: filter.authorIds ?? [],
      sectorIds: filter.sectorIds ?? [],
      stockIds: filter.stockIds ?? [],
    });
  }

  private applyCursor(
    qb: SelectQueryBuilder<Post>,
    cursor: string | undefined,
    direction: 'ASC' | 'DESC',
  ): void {
    if (!cursor) {
      return;
    }
    let parsed: { createdAt: string; id: string };
    try {
      parsed = decodeFeedCursor(cursor);
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
    const op = direction === 'ASC' ? '>' : '<';
    qb.andWhere(`(post.created_at, post.id) ${op} (:cursorAt, :cursorId)`, {
      cursorAt: parsed.createdAt,
      cursorId: parsed.id,
    });
  }

  private emptyFeed(limit: number): FeedPage<Post> {
    return { items: [], limit, nextCursor: null };
  }

  private stripAuthor(post: Post): Post {
    if (post.author) {
      delete (post.author as { password?: string | null }).password;
    }
    return post;
  }

  private async buildFeedFilter(
    feed: FeedType,
    viewerId: string,
    sectorIds?: string[],
    stockIds?: string[],
  ): Promise<FeedFilter | typeof EMPTY_FEED | null> {
    if (feed === FeedType.ALL) {
      if (!sectorIds?.length && !stockIds?.length) {
        return null;
      }
      return { sectorIds, stockIds };
    }

    await this.ensureUser(viewerId);

    if (feed === FeedType.FOLLOWING_USERS) {
      const authorIds = await this.followsService.getFollowedUserIds(viewerId);
      if (!authorIds.length) {
        return EMPTY_FEED;
      }
      return { authorIds, sectorIds, stockIds, authorsRequired: true };
    }

    const followedSectors =
      await this.followsService.getFollowedSectorIds(viewerId);
    if (!followedSectors.length) {
      return EMPTY_FEED;
    }
    const narrowed = sectorIds?.length
      ? followedSectors.filter((id) => sectorIds.includes(id))
      : followedSectors;
    if (!narrowed.length && !stockIds?.length) {
      return EMPTY_FEED;
    }
    return { sectorIds: narrowed, stockIds };
  }

  private async ensureUser(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsBy({ id: userId });
    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
