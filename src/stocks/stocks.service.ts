import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Paginated } from '../common/types/paginated';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';
import { STOCK_SEED } from './stocks.seed';

const STOCK_RELATIONS = { sector: true };

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
          sectorId: sector.id,
          sector,
        }),
      );
      await this.stocksRepository.save(stocks);
    }
    this.logger.log('Seeding complete.');
  }

  async findStocks(query: ListStocksQueryDto): Promise<Paginated<Stock>> {
    const { page, limit, sectorId, sector } = query;
    if (sectorId && sector) {
      throw new BadRequestException(
        'Use either sectorId or sector slug, not both',
      );
    }

    let where: FindOptionsWhere<Stock> | FindOptionsWhere<Stock>[] = {};
    if (sectorId) {
      where = { sectorId };
    } else if (sector) {
      const sectorRow = await this.sectorsRepository.findOne({
        where: { slug: sector },
      });
      if (!sectorRow) {
        return { items: [], page, limit, total: 0, totalPages: 0 };
      }
      where = { sectorId: sectorRow.id };
    }

    const [items, total] = await this.stocksRepository.findAndCount({
      where,
      relations: STOCK_RELATIONS,
      order: { symbol: 'ASC' },
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

  async findOneStock(id: string): Promise<Stock> {
    const stock = await this.stocksRepository.findOne({
      where: { id },
      relations: STOCK_RELATIONS,
    });
    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }
    return stock;
  }

  findAllSectors(): Promise<Sector[]> {
    return this.sectorsRepository.find({ order: { name: 'ASC' } });
  }

  searchStocks(query: string): Promise<Stock[]> {
    const term = `${query.trim()}%`;
    return this.stocksRepository.find({
      where: [{ symbol: ILike(term) }, { name: ILike(term) }],
      relations: STOCK_RELATIONS,
      order: { symbol: 'ASC' },
      take: 20,
    });
  }

  async findFavourites(query: ListStocksQueryDto): Promise<Paginated<Stock>> {
    const { page, limit } = query;
    const [items, total] = await this.stocksRepository.findAndCount({
      where: { isFavourite: true },
      relations: STOCK_RELATIONS,
      order: { symbol: 'ASC' },
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

  async setFavourite(id: string, isFavourite: boolean): Promise<Stock> {
    const stock = await this.stocksRepository.findOne({ where: { id } });
    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }
    stock.isFavourite = isFavourite;
    const saved = await this.stocksRepository.save(stock);
    return this.findOneStock(saved.id);
  }
}
