import { FollowsService } from './follows.service';

describe('FollowsService follower counts', () => {
  const stockFollows = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((row) => row),
    delete: jest.fn(),
    query: jest.fn(),
    find: jest.fn(),
  };
  const userFollows = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((row) => row),
    delete: jest.fn(),
    query: jest.fn(),
    find: jest.fn(),
  };
  const sectorFollows = { findOne: jest.fn(), query: jest.fn() };
  const usersRepository = { existsBy: jest.fn(), find: jest.fn() };
  const stocksRepository = { existsBy: jest.fn(), find: jest.fn() };
  const sectorsRepository = { existsBy: jest.fn(), find: jest.fn() };

  const service = new FollowsService(
    userFollows as never,
    stockFollows as never,
    sectorFollows as never,
    usersRepository as never,
    stocksRepository as never,
    sectorsRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.existsBy.mockResolvedValue(true);
    stockFollows.query.mockResolvedValue([]);
    userFollows.query.mockResolvedValue([]);
  });

  it('increments the stock follower count only when the follow is new', async () => {
    stocksRepository.existsBy.mockResolvedValue(true);
    stockFollows.findOne.mockResolvedValue(null);
    stockFollows.save.mockImplementation(async (row) => row);

    await service.followStock('user-1', 'stock-1');

    expect(stockFollows.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "stocks"'),
      [1, 'stock-1'],
    );
  });

  it('does not change the count when the follow already exists', async () => {
    stocksRepository.existsBy.mockResolvedValue(true);
    stockFollows.findOne.mockResolvedValue({ userId: 'user-1', stockId: 'stock-1' });

    await service.followStock('user-1', 'stock-1');

    expect(stockFollows.save).not.toHaveBeenCalled();
    expect(stockFollows.query).not.toHaveBeenCalled();
  });

  it('decrements the user follower count when a follow is removed', async () => {
    userFollows.delete.mockResolvedValue({ affected: 1 });

    await service.unfollowUser('user-1', 'user-2');

    expect(userFollows.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "users"'),
      [-1, 'user-2'],
    );
  });
});
