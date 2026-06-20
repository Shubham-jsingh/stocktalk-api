// Predefined sectors and stocks seeded into the database on startup.
export interface SeedStock {
  symbol: string;
  name: string;
  exchange: string;
}

export interface SeedSector {
  name: string;
  slug: string;
  stocks: SeedStock[];
}

export const STOCK_SEED: SeedSector[] = [
  {
    name: 'Technology',
    slug: 'technology',
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
      { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
      { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE' },
    ],
  },
  {
    name: 'Consumer Discretionary',
    slug: 'consumer-discretionary',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
      { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE' },
      { symbol: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ' },
    ],
  },
  {
    name: 'Financials',
    slug: 'financials',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
      { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE' },
      { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
      { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE' },
    ],
  },
  {
    name: 'Healthcare',
    slug: 'healthcare',
    stocks: [
      { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
      { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE' },
      { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE' },
    ],
  },
  {
    name: 'Energy',
    slug: 'energy',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE' },
      { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE' },
    ],
  },
];
