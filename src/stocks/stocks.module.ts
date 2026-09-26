import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';
import { SectorsController } from './sectors.controller';
import { SectorsService } from './sectors.service';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Sector])],
  controllers: [StocksController, SectorsController],
  providers: [StocksService, SectorsService],
  exports: [StocksService, SectorsService, TypeOrmModule],
})
export class StocksModule {}
