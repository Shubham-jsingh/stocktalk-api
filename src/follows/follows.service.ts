import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { SectorFollow } from './entities/sector-follow.entity';
import { StockFollow } from './entities/stock-follow.entity';
import { UserFollow } from './entities/user-follow.entity';

type PublicUser = Omit<User, 'password'>;

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(UserFollow)
    private readonly userFollows: Repository<UserFollow>,
    @InjectRepository(StockFollow)
    private readonly stockFollows: Repository<StockFollow>,
    @InjectRepository(SectorFollow)
    private readonly sectorFollows: Repository<SectorFollow>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
  ) {}

  async followStock(userId: string, stockId: string): Promise<StockFollow> {
    await this.ensureUser(userId);
    const stock = await this.stocksRepository.existsBy({ id: stockId });
    if (!stock) {
      throw new NotFoundException(`Stock ${stockId} not found`);
    }
    return this.insertFollow(
      this.stockFollows,
      { userId, stockId },
      'stocks',
      stockId,
    );
  }

  async unfollowStock(userId: string, stockId: string): Promise<void> {
    await this.deleteFollow(
      this.stockFollows,
      { userId, stockId },
      'stocks',
      stockId,
      userId,
    );
  }

  async followSector(userId: string, sectorId: string): Promise<SectorFollow> {
    await this.ensureUser(userId);
    const sector = await this.sectorsRepository.existsBy({ id: sectorId });
    if (!sector) {
      throw new NotFoundException(`Sector ${sectorId} not found`);
    }
    return this.insertFollow(
      this.sectorFollows,
      { userId, sectorId },
      'sectors',
      sectorId,
    );
  }

  async unfollowSector(userId: string, sectorId: string): Promise<void> {
    await this.deleteFollow(
      this.sectorFollows,
      { userId, sectorId },
      'sectors',
      sectorId,
      userId,
    );
  }

  async followUser(userId: string, targetUserId: string): Promise<UserFollow> {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    await this.ensureUser(userId);
    const target = await this.usersRepository.existsBy({ id: targetUserId });
    if (!target) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }
    return this.insertFollow(
      this.userFollows,
      { followerId: userId, followeeId: targetUserId },
      'users',
      targetUserId,
    );
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    await this.deleteFollow(
      this.userFollows,
      { followerId: userId, followeeId: targetUserId },
      'users',
      targetUserId,
      userId,
    );
  }

  async getFollowedUserIds(userId: string): Promise<string[]> {
    const rows = await this.userFollows.find({
      where: { followerId: userId },
      select: { followerId: true, followeeId: true },
    });
    return rows.map((row) => row.followeeId);
  }

  async getFollowedSectorIds(userId: string): Promise<string[]> {
    const rows = await this.sectorFollows.find({
      where: { userId },
      select: { userId: true, sectorId: true },
    });
    return rows.map((row) => row.sectorId);
  }

  async getFollowedStockIds(userId: string): Promise<string[]> {
    const rows = await this.stockFollows.find({
      where: { userId },
      select: { userId: true, stockId: true },
    });
    return rows.map((row) => row.stockId);
  }

  async listFollows(userId: string): Promise<{
    stocks: Stock[];
    sectors: Sector[];
    users: PublicUser[];
  }> {
    await this.ensureUser(userId);
    const [stockIds, sectorIds, userIds] = await Promise.all([
      this.getFollowedStockIds(userId),
      this.getFollowedSectorIds(userId),
      this.getFollowedUserIds(userId),
    ]);

    const [stocks, sectors, users] = await Promise.all([
      stockIds.length
        ? this.stocksRepository.find({
            where: { id: In(stockIds) },
            relations: { sector: true, sectors: true },
          })
        : Promise.resolve([]),
      sectorIds.length
        ? this.sectorsRepository.find({ where: { id: In(sectorIds) } })
        : Promise.resolve([]),
      userIds.length
        ? this.usersRepository.find({ where: { id: In(userIds) } })
        : Promise.resolve([]),
    ]);

    return {
      stocks,
      sectors,
      users: users.map((user) => this.stripPassword(user)),
    };
  }

  private stripPassword(user: User): PublicUser {
    const { password: _password, ...safe } = user;
    return safe;
  }

  private async ensureUser(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsBy({ id: userId });
    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  private async insertFollow<T extends object>(
    repo: Repository<T>,
    keys: object,
    countTable: 'users' | 'stocks' | 'sectors',
    countId: string,
  ): Promise<T> {
    const existing = await repo.findOne({ where: keys as never });
    if (existing) {
      return existing;
    }
    const saved = await repo.save(repo.create(keys as never));
    await this.adjustFollowerCount(repo, countTable, countId, 1);
    return saved as T;
  }

  private async deleteFollow<T extends object>(
    repo: Repository<T>,
    keys: object,
    countTable: 'users' | 'stocks' | 'sectors',
    countId: string,
    actorId: string,
  ): Promise<void> {
    await this.ensureUser(actorId);
    const result = await repo.delete(keys as never);
    if (result.affected) {
      await this.adjustFollowerCount(repo, countTable, countId, -1);
    }
  }

  private async adjustFollowerCount(
    repo: Repository<object>,
    table: 'users' | 'stocks' | 'sectors',
    id: string,
    delta: number,
  ): Promise<void> {
    await repo.query(
      `UPDATE "${table}" SET follower_count = GREATEST(follower_count + $1, 0) WHERE id = $2`,
      [delta, id],
    );
  }
}
