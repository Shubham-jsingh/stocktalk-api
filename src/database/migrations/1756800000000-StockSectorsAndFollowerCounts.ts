import { MigrationInterface, QueryRunner } from 'typeorm';

export class StockSectorsAndFollowerCounts1756800000000
  implements MigrationInterface
{
  name = 'StockSectorsAndFollowerCounts1756800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_sectors" (
        "stock_id" uuid NOT NULL,
        "sector_id" uuid NOT NULL,
        CONSTRAINT "PK_stock_sectors" PRIMARY KEY ("stock_id", "sector_id"),
        CONSTRAINT "FK_stock_sectors_stock" FOREIGN KEY ("stock_id")
          REFERENCES "stocks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_sectors_sector" FOREIGN KEY ("sector_id")
          REFERENCES "sectors"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_sectors_sector_id"
      ON "stock_sectors" ("sector_id")
    `);
    await queryRunner.query(`
      INSERT INTO "stock_sectors" ("stock_id", "sector_id")
      SELECT "id", "sector_id" FROM "stocks"
      WHERE "sector_id" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "sectors" ADD COLUMN IF NOT EXISTS "about" text
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors" ADD COLUMN IF NOT EXISTS "market_cap" bigint
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "follower_count" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "stocks"
      ADD COLUMN IF NOT EXISTS "follower_count" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors"
      ADD COLUMN IF NOT EXISTS "follower_count" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "users" u SET "follower_count" = c.cnt
      FROM (
        SELECT "target_id", COUNT(*)::int AS cnt
        FROM "follows" WHERE "target_type" = 'user'
        GROUP BY "target_id"
      ) c
      WHERE u."id" = c."target_id"
    `);
    await queryRunner.query(`
      UPDATE "stocks" s SET "follower_count" = c.cnt
      FROM (
        SELECT "target_id", COUNT(*)::int AS cnt
        FROM "follows" WHERE "target_type" = 'stock'
        GROUP BY "target_id"
      ) c
      WHERE s."id"::text = c."target_id"
    `);
    await queryRunner.query(`
      UPDATE "sectors" s SET "follower_count" = c.cnt
      FROM (
        SELECT "target_id", COUNT(*)::int AS cnt
        FROM "follows" WHERE "target_type" = 'sector'
        GROUP BY "target_id"
      ) c
      WHERE s."id"::text = c."target_id"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follows_target"
      ON "follows" ("target_type", "target_id")
    `);

    await queryRunner.query(`
      UPDATE "sectors" SET
        "about" = 'Companies that design software, semiconductors, devices, and internet platforms.',
        "market_cap" = 20000000000000
      WHERE "slug" = 'technology' AND "about" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "sectors" SET
        "about" = 'Retail, autos, restaurants, and other spending that is not essential.',
        "market_cap" = 8000000000000
      WHERE "slug" = 'consumer-discretionary' AND "about" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "sectors" SET
        "about" = 'Banks, payment networks, and other financial services companies.',
        "market_cap" = 9000000000000
      WHERE "slug" = 'financials' AND "about" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "sectors" SET
        "about" = 'Drug makers, health insurers, and medical product companies.',
        "market_cap" = 7000000000000
      WHERE "slug" = 'healthcare' AND "about" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "sectors" SET
        "about" = 'Oil, gas, and other energy producers and refiners.',
        "market_cap" = 3000000000000
      WHERE "slug" = 'energy' AND "about" IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO "stock_sectors" ("stock_id", "sector_id")
      SELECT s."id", sec."id"
      FROM "stocks" s
      JOIN "sectors" sec ON sec."slug" = 'technology'
      WHERE s."symbol" IN ('AMZN', 'TSLA')
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "stock_sectors" ("stock_id", "sector_id")
      SELECT s."id", sec."id"
      FROM "stocks" s
      JOIN "sectors" sec ON sec."slug" = 'consumer-discretionary'
      WHERE s."symbol" = 'GOOGL'
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "stock_sectors" ("stock_id", "sector_id")
      SELECT s."id", sec."id"
      FROM "stocks" s
      JOIN "sectors" sec ON sec."slug" = 'energy'
      WHERE s."symbol" = 'TSLA'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_follows_target"`);
    await queryRunner.query(`
      ALTER TABLE "sectors" DROP COLUMN IF EXISTS "follower_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "stocks" DROP COLUMN IF EXISTS "follower_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "follower_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors" DROP COLUMN IF EXISTS "market_cap"
    `);
    await queryRunner.query(`
      ALTER TABLE "sectors" DROP COLUMN IF EXISTS "about"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_sectors"`);
  }
}
