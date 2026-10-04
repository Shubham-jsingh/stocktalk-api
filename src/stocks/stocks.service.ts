import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Paginated } from '../common/types/paginated';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';
import { EXTRA_STOCK_SECTORS, STOCK_SEED } from './stocks.seed';

const STOCK_RELATIONS = { sector: true, sectors: true };

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
    const sectorBySlug = new Map<string, Sector>();
    const stockBySymbol = new Map<string, Stock>();

    for (const seedSector of STOCK_SEED) {
      const sector = await this.sectorsRepository.save(
        this.sectorsRepository.create({
          name: seedSector.name,
          slug: seedSector.slug,
        }),
      );
      sectorBySlug.set(sector.slug, sector);

      const stocks = seedSector.stocks.map((s) =>
        this.stocksRepository.create({
          symbol: s.symbol.toUpperCase(),
          name: s.name,
          exchange: s.exchange,
          about: s.about,
          marketCap: s.marketCap,
          sectorId: sector.id,
          sector,
          sectors: [sector],
        }),
      );
      const saved = await this.stocksRepository.save(stocks);
      for (const stock of saved) {
        stockBySymbol.set(stock.symbol, stock);
      }
    }

    for (const extra of EXTRA_STOCK_SECTORS) {
      const stock = stockBySymbol.get(extra.symbol);
      if (!stock) {
        continue;
      }
      const extras = extra.slugs
        .map((slug) => sectorBySlug.get(slug))
        .filter((sector): sector is Sector => Boolean(sector));
      const known = new Set((stock.sectors ?? []).map((sector) => sector.id));
      stock.sectors = [
        ...(stock.sectors ?? []),
        ...extras.filter((sector) => !known.has(sector.id)),
      ];
      await this.stocksRepository.save(stock);
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

    const membershipSectorId = await this.resolveSectorFilter(sectorId, sector);
    if (membershipSectorId === null) {
      return { items: [], page, limit, total: 0, totalPages: 0 };
    }

    if (membershipSectorId) {
      return this.pageStocks((qb) => {
        qb.andWhere(this.sectorMembershipSql(), {
          sectorId: membershipSectorId,
        });
      }, page, limit);
    }

    const [items, total] = await this.stocksRepository.findAndCount({
      relations: STOCK_RELATIONS,
      order: { symbol: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return this.page(items, total, page, limit);
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
    return this.stocksRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.sector', 'primarySector')
      .leftJoinAndSelect('stock.sectors', 'sectors')
      .where('stock.symbol ILIKE :term', { term })
      .orWhere('stock.name ILIKE :term', { term })
      .orderBy('stock.symbol', 'ASC')
      .take(20)
      .getMany();
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
    return this.page(items, total, page, limit);
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

  private async resolveSectorFilter(
    sectorId?: string,
    slug?: string,
  ): Promise<string | undefined | null> {
    if (sectorId) {
      return sectorId;
    }
    if (!slug) {
      return undefined;
    }
    const sectorRow = await this.sectorsRepository.findOne({
      where: { slug },
    });
    return sectorRow ? sectorRow.id : null;
  }

  private sectorMembershipSql(): string {
    return `(stock.id IN (
      SELECT ss.stock_id FROM stock_sectors ss WHERE ss.sector_id = :sectorId
    ) OR stock.sector_id = :sectorId)`;
  }

  private async pageStocks(
    apply: (qb: SelectQueryBuilder<Stock>) => void,
    page: number,
    limit: number,
  ): Promise<Paginated<Stock>> {
    const idsQuery = this.stocksRepository
      .createQueryBuilder('stock')
      .select('stock.id', 'id')
      .orderBy('stock.symbol', 'ASC');
    apply(idsQuery);

    const total = await idsQuery.clone().getCount();
    const rawIds = await idsQuery
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{ id: string }>();
    const ids = rawIds.map((row) => row.id);
    if (!ids.length) {
      return this.page([], total, page, limit);
    }

    const items = await this.stocksRepository.find({
      where: { id: In(ids) },
      relations: STOCK_RELATIONS,
      order: { symbol: 'ASC' },
    });
    return this.page(items, total, page, limit);
  }

  private page(
    items: Stock[],
    total: number,
    page: number,
    limit: number,
  ): Paginated<Stock> {
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
