import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListSectorsQueryDto } from './dto/list-sectors-query.dto';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { SectorsService } from './sectors.service';

@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Get()
  findAll(@Query() query: ListSectorsQueryDto) {
    return this.sectorsService.findAll(query);
  }

  @Get(':idOrSlug/stocks')
  findStocks(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ListStocksQueryDto,
  ) {
    return this.sectorsService.findStocksInSector(idOrSlug, query);
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.sectorsService.findOneByIdOrSlug(idOrSlug);
  }
}
