import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import dataSource from './data-source';
import { Sector } from '../stocks/entities/sector.entity';
import { Stock } from '../stocks/entities/stock.entity';

const SECTOR_CSV = 'SectorDB.csv';
const STOCK_CSV = 'StocksDB.csv';
const INSERT_CHUNK = 400;

/** CSV names that do not match SectorDB exactly. */
const SECTOR_NAME_ALIASES: Record<string, string> = {
  'pipes & tubes': 'Pipes (Steel)',
  fertlizers: 'Fertilizers',
  sugar: 'Sugar & Ethanol',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function loadCsv(fileName: string): string[][] {
  const filePath = join(__dirname, 'data', fileName);
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    throw new Error(`${fileName} has no data rows`);
  }
  return rows;
}

function headerIndex(header: string[], ...names: string[]): number {
  const normalized = header.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = normalized.indexOf(name.toLowerCase());
    if (idx >= 0) {
      return idx;
    }
  }
  throw new Error(`CSV header missing ${names.join(' / ')}: ${header.join(',')}`);
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function seed(): Promise<void> {
  const sectorRows = loadCsv(SECTOR_CSV);
  const stockRows = loadCsv(STOCK_CSV);

  const sectorHeader = sectorRows[0];
  const csvSectorId = headerIndex(sectorHeader, 'sector_id');
  const csvSectorName = headerIndex(sectorHeader, 'sector_name');
  const csvSectorSlug = headerIndex(sectorHeader, 'sector_slug');

  const stockHeader = stockRows[0];
  const csvStockSymbol = headerIndex(stockHeader, 'stock_symbol');
  const csvStockName = headerIndex(stockHeader, 'stock_name');
  const csvStockExchange = headerIndex(stockHeader, 'stock_exchange');
  const csvMarketCap = headerIndex(stockHeader, 'market_cap');
  const csvStockSectorName = headerIndex(stockHeader, 'sector_name');
  const csvStockSectorId = headerIndex(stockHeader, 'sector_id');
  const csvStockAbout = headerIndex(stockHeader, 'stock_about');
  const csvIsFavourite = stockHeader.findIndex(
    (h) => h.trim().toLowerCase() === 'is_favourite' || h.trim().toLowerCase() === 'is_favorite',
  );
  const csvFollowerCount = stockHeader.findIndex(
    (h) => h.trim().toLowerCase() === 'follower_count',
  );
  const csvSectorFollowerCount = sectorHeader.findIndex(
    (h) => h.trim().toLowerCase() === 'follower_count',
  );

  const sectorByCsvId = new Map<string, Sector>();
  const sectorByName = new Map<string, Sector>();
  const sectors: Sector[] = [];

  for (const row of sectorRows.slice(1)) {
    const csvId = row[csvSectorId]?.trim();
    const name = row[csvSectorName]?.trim();
    const slug = row[csvSectorSlug]?.trim();
    if (!csvId || !name || !slug) {
      throw new Error(`Incomplete sector row: ${JSON.stringify(row)}`);
    }

    const sector = new Sector();
    sector.id = randomUUID();
    sector.name = name;
    sector.slug = slug;
    sector.followerCount =
      csvSectorFollowerCount >= 0
        ? parseInt(row[csvSectorFollowerCount] || '0', 10) || 0
        : 0;

    sectors.push(sector);
    sectorByCsvId.set(csvId, sector);
    sectorByName.set(normalizeName(name), sector);
  }

  const resolveSector = (csvId: string, csvName: string): Sector | null => {
    const named = sectorByName.get(normalizeName(csvName));
    if (named) {
      return named;
    }
    const alias = SECTOR_NAME_ALIASES[normalizeName(csvName)];
    if (alias && sectorByName.get(normalizeName(alias))) {
      return sectorByName.get(normalizeName(alias))!;
    }
    if (csvId && sectorByCsvId.has(csvId)) {
      return sectorByCsvId.get(csvId)!;
    }
    return null;
  };

  const stocks: Stock[] = [];
  const joinRows: { stock_id: string; sector_id: string }[] = [];
  const seenSymbols = new Set<string>();

  for (const row of stockRows.slice(1)) {
    const symbol = row[csvStockSymbol]?.trim().toUpperCase();
    const name = row[csvStockName]?.trim();
    if (!symbol || !name) {
      throw new Error(`Incomplete stock row: ${JSON.stringify(row.slice(0, 4))}`);
    }
    if (seenSymbols.has(symbol)) {
      throw new Error(`Duplicate stock symbol in CSV: ${symbol}`);
    }
    seenSymbols.add(symbol);

    const sector = resolveSector(
      row[csvStockSectorId]?.trim() ?? '',
      row[csvStockSectorName]?.trim() ?? '',
    );

    const marketCapRaw = row[csvMarketCap]?.trim();
    const stock = new Stock();
    stock.id = randomUUID();
    stock.symbol = symbol;
    stock.name = name;
    stock.exchange = row[csvStockExchange]?.trim() || 'NASDAQ';
    stock.about = row[csvStockAbout]?.trim() || null;
    stock.marketCap = marketCapRaw ? marketCapRaw : null;
    stock.isFavourite =
      csvIsFavourite >= 0
        ? ['1', 'true', 'yes'].includes(
            (row[csvIsFavourite] || '').trim().toLowerCase(),
          )
        : false;
    stock.followerCount =
      csvFollowerCount >= 0
        ? parseInt(row[csvFollowerCount] || '0', 10) || 0
        : 0;
    stock.sectorId = sector?.id ?? null;

    stocks.push(stock);
    if (sector) {
      joinRows.push({ stock_id: stock.id, sector_id: sector.id });
    }
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(
      'TRUNCATE TABLE stock_sectors, stocks, sectors CASCADE;',
    );

    for (const batch of chunk(sectors, INSERT_CHUNK)) {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Sector)
        .values(
          batch.map((sector) => ({
            id: sector.id,
            name: sector.name,
            slug: sector.slug,
            followerCount: sector.followerCount,
          })),
        )
        .execute();
    }

    for (const batch of chunk(stocks, INSERT_CHUNK)) {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Stock)
        .values(
          batch.map((s) => ({
            id: s.id,
            symbol: s.symbol,
            name: s.name,
            exchange: s.exchange,
            about: s.about,
            marketCap: s.marketCap,
            isFavourite: s.isFavourite,
            followerCount: s.followerCount,
            sectorId: s.sectorId,
          })),
        )
        .execute();
    }

    for (const batch of chunk(joinRows, INSERT_CHUNK)) {
      await queryRunner.query(
        `
        INSERT INTO stock_sectors (stock_id, sector_id)
        SELECT * FROM UNNEST($1::uuid[], $2::uuid[])
        `,
        [batch.map((r) => r.stock_id), batch.map((r) => r.sector_id)],
      );
    }

    await queryRunner.commitTransaction();
    console.log(
      `Seed complete: ${sectors.length} sectors, ${stocks.length} stocks, ${joinRows.length} stock_sectors links`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await seed();
  } finally {
    await dataSource.destroy();
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  /[\\/]seed\.(ts|js)$/.test(process.argv[1]);

if (isCli) {
  run().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}
