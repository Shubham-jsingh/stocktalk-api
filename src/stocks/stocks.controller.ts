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
import { SetFavouriteDto } from './dto/set-favourite.dto';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  // GET /stocks  -> all predefined stocks
  @Get()
  findAll() {
    return this.stocksService.findAllStocks();
  }

  // GET /stocks/favourites -> all stocks flagged as favourite
  @Get('favourites')
  findFavourites() {
    return this.stocksService.findFavourites();
  }

  // GET /stocks/sectors -> all sectors
  @Get('sectors')
  findSectors() {
    return this.stocksService.findAllSectors();
  }

  // GET /stocks/search?q=app -> prefix search, requires at least 3 chars
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

  // PATCH /stocks/:id/favourite  body: { "isFavourite": true }
  @Patch(':id/favourite')
  setFavourite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFavouriteDto,
  ) {
    return this.stocksService.setFavourite(id, dto.isFavourite);
  }
}
