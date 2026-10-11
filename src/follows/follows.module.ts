import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { User } from '../users/entities/user.entity';
import { SectorFollow } from './entities/sector-follow.entity';
import { StockFollow } from './entities/stock-follow.entity';
import { UserFollow } from './entities/user-follow.entity';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserFollow,
      StockFollow,
      SectorFollow,
      User,
      Stock,
      Sector,
    ]),
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
