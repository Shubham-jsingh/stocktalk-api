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
import { SetFavouriteDto } from './dto/set-favourite.dto';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Public()
  @Get()
  findAll() {
    return this.stocksService.findAllStocks();
  }

  @Public()
  @Get('favourites')
  findFavourites() {
    return this.stocksService.findFavourites();
  }

  @Public()
  @Get('sectors')
  findSectors() {
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

  // PATCH /stocks/:id/favourite  body: { "isFavourite": true }
  @Patch(':id/favourite')
  setFavourite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFavouriteDto,
  ) {
    return this.stocksService.setFavourite(id, dto.isFavourite);
  }
}
