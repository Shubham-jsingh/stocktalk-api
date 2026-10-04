// Predefined sectors and stocks seeded into the database on startup.
export interface SeedStock {
  symbol: string;
  name: string;
  exchange: string;
  about: string;
  marketCap: string;
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
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        about:
          'Designs consumer electronics, software, and services including the iPhone, Mac, and App Store.',
        marketCap: '3400000000000',
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        about:
          'Builds Windows, Office, Azure cloud, and enterprise software and services.',
        marketCap: '3100000000000',
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        exchange: 'NASDAQ',
        about:
          'Makes GPUs and AI accelerators used in gaming, data centers, and autonomous systems.',
        marketCap: '3000000000000',
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        about:
          'Operates Google Search, YouTube, Android, and cloud advertising and infrastructure.',
        marketCap: '2100000000000',
      },
      {
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        exchange: 'NASDAQ',
        about:
          'Runs Facebook, Instagram, WhatsApp, and related advertising and VR products.',
        marketCap: '1300000000000',
      },
      {
        symbol: 'ORCL',
        name: 'Oracle Corporation',
        exchange: 'NYSE',
        about:
          'Sells database, cloud applications, and enterprise software to businesses.',
        marketCap: '400000000000',
      },
    ],
  },
  {
    name: 'Consumer Discretionary',
    slug: 'consumer-discretionary',
    stocks: [
      {
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        exchange: 'NASDAQ',
        about:
          'Operates e-commerce, AWS cloud, advertising, and subscription services.',
        marketCap: '1900000000000',
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        exchange: 'NASDAQ',
        about:
          'Manufactures electric vehicles, energy storage, and related software.',
        marketCap: '800000000000',
      },
      {
        symbol: 'NKE',
        name: 'Nike Inc.',
        exchange: 'NYSE',
        about: 'Designs and sells athletic footwear, apparel, and equipment.',
        marketCap: '120000000000',
      },
      {
        symbol: 'SBUX',
        name: 'Starbucks Corporation',
        exchange: 'NASDAQ',
        about: 'Operates coffeehouses and sells packaged coffee and beverages.',
        marketCap: '100000000000',
      },
    ],
  },
  {
    name: 'Financials',
    slug: 'financials',
    stocks: [
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase & Co.',
        exchange: 'NYSE',
        about:
          'Global bank offering consumer, commercial, and investment banking.',
        marketCap: '600000000000',
      },
      {
        symbol: 'BAC',
        name: 'Bank of America Corporation',
        exchange: 'NYSE',
        about:
          'Provides consumer banking, wealth management, and capital markets services.',
        marketCap: '300000000000',
      },
      {
        symbol: 'V',
        name: 'Visa Inc.',
        exchange: 'NYSE',
        about: 'Runs a global payments network for card and digital transactions.',
        marketCap: '550000000000',
      },
      {
        symbol: 'MA',
        name: 'Mastercard Incorporated',
        exchange: 'NYSE',
        about: 'Operates a global payments network and related financial services.',
        marketCap: '450000000000',
      },
    ],
  },
  {
    name: 'Healthcare',
    slug: 'healthcare',
    stocks: [
      {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        exchange: 'NYSE',
        about:
          'Develops pharmaceuticals, medical devices, and consumer health products.',
        marketCap: '380000000000',
      },
      {
        symbol: 'PFE',
        name: 'Pfizer Inc.',
        exchange: 'NYSE',
        about: 'Discovers and manufactures prescription medicines and vaccines.',
        marketCap: '160000000000',
      },
      {
        symbol: 'UNH',
        name: 'UnitedHealth Group Incorporated',
        exchange: 'NYSE',
        about:
          'Provides health insurance and Optum health-services businesses.',
        marketCap: '500000000000',
      },
    ],
  },
  {
    name: 'Energy',
    slug: 'energy',
    stocks: [
      {
        symbol: 'XOM',
        name: 'Exxon Mobil Corporation',
        exchange: 'NYSE',
        about: 'Produces and refines oil and gas and sells fuels worldwide.',
        marketCap: '450000000000',
      },
      {
        symbol: 'CVX',
        name: 'Chevron Corporation',
        exchange: 'NYSE',
        about: 'Integrated energy company in oil, gas, and related products.',
        marketCap: '270000000000',
      },
    ],
  },
];

// Extra sector memberships on top of each stock's primary sector.
export const EXTRA_STOCK_SECTORS: { symbol: string; slugs: string[] }[] = [
  { symbol: 'AMZN', slugs: ['technology'] },
  { symbol: 'GOOGL', slugs: ['consumer-discretionary'] },
  { symbol: 'TSLA', slugs: ['technology', 'energy'] },
];
