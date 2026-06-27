import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';
import { STOCK_SEED } from './stocks.seed';

@Injectable()
export class StocksService implements OnModuleInit {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
  ) {}

  // Seed predefined sectors/stocks once, if the tables are empty.
  async onModuleInit(): Promise<void> {
    const existing = await this.stocksRepository.count();
    if (existing > 0) {
      return;
    }

    this.logger.log('Seeding predefined sectors and stocks...');
    for (const seedSector of STOCK_SEED) {
      const sector = await this.sectorsRepository.save(
        this.sectorsRepository.create({
          name: seedSector.name,
          slug: seedSector.slug,
        }),
      );

      const stocks = seedSector.stocks.map((s) =>
        this.stocksRepository.create({
          symbol: s.symbol.toUpperCase(),
          name: s.name,
          exchange: s.exchange,
          sector,
        }),
      );
      await this.stocksRepository.save(stocks);
    }
    this.logger.log('Seeding complete.');
  }

  findAllStocks(): Promise<Stock[]> {
    return this.stocksRepository.find({ order: { symbol: 'ASC' } });
  }

  findAllSectors(): Promise<Sector[]> {
    return this.sectorsRepository.find({ order: { name: 'ASC' } });
  }

  // Prefix/contains search by symbol or company name. Caller enforces min length.
  searchStocks(query: string): Promise<Stock[]> {
    const term = `${query.trim()}%`;
    return this.stocksRepository.find({
      where: [{ symbol: ILike(term) }, { name: ILike(term) }],
      order: { symbol: 'ASC' },
      take: 20,
    });
  }

  findFavourites(): Promise<Stock[]> {
    return this.stocksRepository.find({
      where: { isFavourite: true },
      order: { symbol: 'ASC' },
    });
  }

  async setFavourite(id: string, isFavourite: boolean): Promise<Stock> {
    const stock = await this.stocksRepository.findOne({ where: { id } });
    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }
    stock.isFavourite = isFavourite;
    return this.stocksRepository.save(stock);
  }
}
