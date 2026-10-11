import 'reflect-metadata';
import { FeedOrder, FeedType } from './dto/feed-query.dto';
import { PostsService } from './posts.service';

function queryBuilder(rows: unknown[]) {
  const qb = {
    leftJoinAndSelect: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.addOrderBy.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  return qb;
}

describe('PostsService feed', () => {
  const postsRepository = { createQueryBuilder: jest.fn() };
  const usersRepository = { existsBy: jest.fn() };
  const sectorsRepository = { existsBy: jest.fn() };
  const stocksRepository = { existsBy: jest.fn() };
  const followsService = {
    getFollowedUserIds: jest.fn(),
    getFollowedSectorIds: jest.fn(),
    getFollowedStockIds: jest.fn(),
  };
  const mentionsService = {
    attachToPosts: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {};

  const service = new PostsService(
    postsRepository as never,
    usersRepository as never,
    sectorsRepository as never,
    stocksRepository as never,
    followsService as never,
    mentionsService as never,
    dataSource as never,
  );

  const query = { limit: 10, order: FeedOrder.DESC };

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.existsBy.mockResolvedValue(true);
    postsRepository.createQueryBuilder.mockReturnValue(
      queryBuilder([
        { id: 'p1', createdAt: new Date('2026-01-01T00:00:00.000Z'), author: { password: 'secret' } },
      ]),
    );
  });

  it('loads the default feed with keyset order and hides the author password', async () => {
    const result = await service.feed('user-1', {
      feed: FeedType.ALL,
      ...query,
    });

    const qb = postsRepository.createQueryBuilder.mock.results[0].value;
    expect(qb.orderBy).toHaveBeenCalledWith('post.created_at', 'DESC');
    expect(qb.take).toHaveBeenCalledWith(11);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.items[0].author.password).toBeUndefined();
  });

  it('returns a next cursor when more than one page of posts exists', async () => {
    postsRepository.createQueryBuilder.mockReturnValue(
      queryBuilder([
        { id: 'p1', createdAt: new Date('2026-01-02T00:00:00.000Z'), author: {} },
        { id: 'p2', createdAt: new Date('2026-01-01T00:00:00.000Z'), author: {} },
      ]),
    );

    const result = await service.feed('user-1', {
      feed: FeedType.ALL,
      limit: 1,
      order: FeedOrder.DESC,
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('falls back to the latest posts when the user follows nobody', async () => {
    followsService.getFollowedUserIds.mockResolvedValue([]);
    followsService.getFollowedSectorIds.mockResolvedValue([]);
    followsService.getFollowedStockIds.mockResolvedValue([]);

    const result = await service.feed('user-1', {
      feed: FeedType.FOLLOWING,
      ...query,
    });

    expect(result.fallback).toBe(true);
    expect(postsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('falls back when followed targets have no posts', async () => {
    followsService.getFollowedUserIds.mockResolvedValue(['user-2']);
    followsService.getFollowedSectorIds.mockResolvedValue([]);
    followsService.getFollowedStockIds.mockResolvedValue([]);
    postsRepository.createQueryBuilder
      .mockReturnValueOnce(queryBuilder([]))
      .mockReturnValueOnce(
        queryBuilder([
          { id: 'latest', createdAt: new Date('2026-01-01T00:00:00.000Z'), author: {} },
        ]),
      );

    const result = await service.feed('user-1', {
      feed: FeedType.FOLLOWING,
      ...query,
    });

    expect(result.fallback).toBe(true);
    expect(result.items[0].id).toBe('latest');
  });

  it('returns an empty page for following_users when the user follows nobody', async () => {
    followsService.getFollowedUserIds.mockResolvedValue([]);

    const result = await service.feed('user-1', {
      feed: FeedType.FOLLOWING_USERS,
      ...query,
    });

    expect(result).toEqual({ items: [], limit: 10, nextCursor: null });
    expect(postsRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
