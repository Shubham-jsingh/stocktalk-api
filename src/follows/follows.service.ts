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
import { Follow, FollowTargetType } from './entities/follow.entity';

// User shape without the password field.
type PublicUser = Omit<User, 'password'>;

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
  ) {}

  async followStock(userId: string, stockId: string): Promise<Follow> {
    await this.ensureUser(userId);
    const stock = await this.stocksRepository.findOne({
      where: { id: stockId },
    });
    if (!stock) {
      throw new NotFoundException(`Stock ${stockId} not found`);
    }
    return this.upsertFollow(userId, FollowTargetType.STOCK, stockId);
  }

  async unfollowStock(userId: string, stockId: string): Promise<void> {
    await this.removeFollow(userId, FollowTargetType.STOCK, stockId);
  }

  async followSector(userId: string, sectorId: string): Promise<Follow> {
    await this.ensureUser(userId);
    const sector = await this.sectorsRepository.findOne({
      where: { id: sectorId },
    });
    if (!sector) {
      throw new NotFoundException(`Sector ${sectorId} not found`);
    }
    return this.upsertFollow(userId, FollowTargetType.SECTOR, sectorId);
  }

  async unfollowSector(userId: string, sectorId: string): Promise<void> {
    await this.removeFollow(userId, FollowTargetType.SECTOR, sectorId);
  }

  async followUser(userId: string, targetUserId: string): Promise<Follow> {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    await this.ensureUser(userId);
    const target = await this.usersRepository.existsBy({ id: targetUserId });
    if (!target) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }
    return this.upsertFollow(userId, FollowTargetType.USER, targetUserId);
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    await this.removeFollow(userId, FollowTargetType.USER, targetUserId);
  }

  // Returns the IDs of users that the given user follows. Used by the feed.
  async getFollowedUserIds(userId: string): Promise<string[]> {
    const follows = await this.followsRepository.find({
      where: { userId, targetType: FollowTargetType.USER },
    });
    return follows.map((f) => f.targetId);
  }

  // Returns the IDs of sectors that the given user follows. Used by the feed.
  async getFollowedSectorIds(userId: string): Promise<string[]> {
    const follows = await this.followsRepository.find({
      where: { userId, targetType: FollowTargetType.SECTOR },
    });
    return follows.map((f) => f.targetId);
  }

  // Returns the resolved stocks, sectors, and users a user follows.
  async listFollows(userId: string): Promise<{
    stocks: Stock[];
    sectors: Sector[];
    users: PublicUser[];
  }> {
    await this.ensureUser(userId);
    const follows = await this.followsRepository.find({ where: { userId } });

    const idsByType = (type: FollowTargetType) =>
      follows.filter((f) => f.targetType === type).map((f) => f.targetId);

    const stockIds = idsByType(FollowTargetType.STOCK);
    const sectorIds = idsByType(FollowTargetType.SECTOR);
    const userIds = idsByType(FollowTargetType.USER);

    const [stocks, sectors, users] = await Promise.all([
      stockIds.length
        ? this.stocksRepository.find({ where: { id: In(stockIds) } })
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
      users: users.map((u) => this.stripPassword(u)),
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

  private async upsertFollow(
    userId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<Follow> {
    const existing = await this.followsRepository.findOne({
      where: { userId, targetType, targetId },
    });
    if (existing) {
      return existing;
    }
    return this.followsRepository.save(
      this.followsRepository.create({ userId, targetType, targetId }),
    );
  }

  private async removeFollow(
    userId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<void> {
    await this.ensureUser(userId);
    await this.followsRepository.delete({ userId, targetType, targetId });
  }
}
