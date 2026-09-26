import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paginated } from '../common/types/paginated';
import { ListSectorsQueryDto } from './dto/list-sectors-query.dto';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { Sector } from './entities/sector.entity';
import { Stock } from './entities/stock.entity';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class SectorsService {
  constructor(
    @InjectRepository(Sector)
    private readonly sectorsRepository: Repository<Sector>,
    @InjectRepository(Stock)
    private readonly stocksRepository: Repository<Stock>,
  ) {}

  async findAll(query: ListSectorsQueryDto): Promise<Paginated<Sector>> {
    const { page, limit } = query;
    const [items, total] = await this.sectorsRepository.findAndCount({
      order: { name: 'ASC' },
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

  async findOneByIdOrSlug(idOrSlug: string): Promise<Sector> {
    const sector = await this.sectorsRepository.findOne({
      where: this.whereIdOrSlug(idOrSlug),
    });
    if (!sector) {
      throw new NotFoundException(`Sector ${idOrSlug} not found`);
    }
    return sector;
  }

  async findStocksInSector(
    idOrSlug: string,
    query: ListStocksQueryDto,
  ): Promise<Paginated<Stock>> {
    const sector = await this.findOneByIdOrSlug(idOrSlug);
    const { page, limit } = query;

    const [items, total] = await this.stocksRepository.findAndCount({
      where: { sectorId: sector.id },
      relations: { sector: true },
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

  private whereIdOrSlug(idOrSlug: string): { id: string } | { slug: string } {
    return UUID_RE.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug };
  }
}
