import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Sector])],
  controllers: [StocksController],
  providers: [StocksService],
  exports: [StocksService, TypeOrmModule],
})
export class StocksModule {}
