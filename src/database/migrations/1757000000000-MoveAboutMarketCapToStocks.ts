import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * about and market_cap belong on stocks (company), not sectors.
 * Existing rows copy the old sector values, then known tickers get company text.
 */
export class MoveAboutMarketCapToStocks1757000000000
  implements MigrationInterface
{
  name = 'MoveAboutMarketCapToStocks1757000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "about" text
    `);
    await queryRunner.query(`
      ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "market_cap" bigint
    `);

    await queryRunner.query(`
      UPDATE "stocks" s
      SET
        "about" = sec."about",
        "market_cap" = sec."market_cap"
      FROM "sectors" sec
      WHERE s."sector_id" = sec."id"
        AND s."about" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Designs consumer electronics, software, and services including the iPhone, Mac, and App Store.',
        "market_cap" = 3400000000000
      WHERE "symbol" = 'AAPL'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Builds Windows, Office, Azure cloud, and enterprise software and services.',
        "market_cap" = 3100000000000
      WHERE "symbol" = 'MSFT'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Makes GPUs and AI accelerators used in gaming, data centers, and autonomous systems.',
        "market_cap" = 3000000000000
      WHERE "symbol" = 'NVDA'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Operates Google Search, YouTube, Android, and cloud advertising and infrastructure.',
        "market_cap" = 2100000000000
      WHERE "symbol" = 'GOOGL'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Runs Facebook, Instagram, WhatsApp, and related advertising and VR products.',
        "market_cap" = 1300000000000
      WHERE "symbol" = 'META'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Sells database, cloud applications, and enterprise software to businesses.',
        "market_cap" = 400000000000
      WHERE "symbol" = 'ORCL'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Operates e-commerce, AWS cloud, advertising, and subscription services.',
        "market_cap" = 1900000000000
      WHERE "symbol" = 'AMZN'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Manufactures electric vehicles, energy storage, and related software.',
        "market_cap" = 800000000000
      WHERE "symbol" = 'TSLA'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Designs and sells athletic footwear, apparel, and equipment.',
        "market_cap" = 120000000000
      WHERE "symbol" = 'NKE'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Operates coffeehouses and sells packaged coffee and beverages.',
        "market_cap" = 100000000000
      WHERE "symbol" = 'SBUX'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Global bank offering consumer, commercial, and investment banking.',
        "market_cap" = 600000000000
      WHERE "symbol" = 'JPM'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Provides consumer banking, wealth management, and capital markets services.',
        "market_cap" = 300000000000
      WHERE "symbol" = 'BAC'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Runs a global payments network for card and digital transactions.',
        "market_cap" = 550000000000
      WHERE "symbol" = 'V'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Operates a global payments network and related financial services.',
        "market_cap" = 450000000000
      WHERE "symbol" = 'MA'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Develops pharmaceuticals, medical devices, and consumer health products.',
        "market_cap" = 380000000000
      WHERE "symbol" = 'JNJ'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Discovers and manufactures prescription medicines and vaccines.',
        "market_cap" = 160000000000
      WHERE "symbol" = 'PFE'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Provides health insurance and Optum health-services businesses.',
        "market_cap" = 500000000000
      WHERE "symbol" = 'UNH'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Produces and refines oil and gas and sells fuels worldwide.',
        "market_cap" = 450000000000
      WHERE "symbol" = 'XOM'
    `);
    await queryRunner.query(`
      UPDATE "stocks" SET
        "about" = 'Integrated energy company in oil, gas, and related products.',
        "market_cap" = 270000000000
      WHERE "symbol" = 'CVX'
    `);

    await queryRunner.query(`
      ALTER TABLE "sectors" DROP COLUMN IF EXISTS "market_cap"
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors" DROP COLUMN IF EXISTS "about"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sectors" ADD COLUMN IF NOT EXISTS "about" text
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors" ADD COLUMN IF NOT EXISTS "market_cap" bigint
    `);
    await queryRunner.query(`
      ALTER TABLE "stocks" DROP COLUMN IF EXISTS "market_cap"
    `);
    await queryRunner.query(`
      ALTER TABLE "stocks" DROP COLUMN IF EXISTS "about"
    `);
  }
}
