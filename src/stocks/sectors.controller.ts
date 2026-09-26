import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListSectorsQueryDto } from './dto/list-sectors-query.dto';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { SectorsService } from './sectors.service';

@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Public()
  @Get()
  findAll(@Query() query: ListSectorsQueryDto) {
    return this.sectorsService.findAll(query);
  }

  @Public()
  @Get(':idOrSlug/stocks')
  findStocks(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ListStocksQueryDto,
  ) {
    return this.sectorsService.findStocksInSector(idOrSlug, query);
  }

  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.sectorsService.findOneByIdOrSlug(idOrSlug);
  }
}
