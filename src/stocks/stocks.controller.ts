import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListStocksQueryDto } from './dto/list-stocks-query.dto';
import { SetFavouriteDto } from './dto/set-favourite.dto';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Public()
  @Get()
  findAll(@Query() query: ListStocksQueryDto) {
    return this.stocksService.findStocks(query);
  }

  @Public()
  @Get('favourites')
  findFavourites(@Query() query: ListStocksQueryDto) {
    return this.stocksService.findFavourites(query);
  }

  /** @deprecated Prefer GET /sectors */
  @Public()
  @Get('sectors')
  findSectorsLegacy() {
    return this.stocksService.findAllSectors();
  }

  @Public()
  @Get('search')
  search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 3) {
      throw new BadRequestException(
        'Search query "q" must be at least 3 characters',
      );
    }
    return this.stocksService.searchStocks(term);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stocksService.findOneStock(id);
  }

  @Patch(':id/favourite')
  setFavourite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFavouriteDto,
  ) {
    return this.stocksService.setFavourite(id, dto.isFavourite);
  }
}
