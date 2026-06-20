import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  // GET /stocks  -> all predefined stocks
  @Get()
  findAll() {
    return this.stocksService.findAllStocks();
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
}
