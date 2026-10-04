import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the polymorphic follows table with three foreign-key tables and
 * adds feed indexes. Existing follow rows are mock data and are dropped.
 */
export class FollowTablesAndFeedIndexes1756900000000
  implements MigrationInterface
{
  name = 'FollowTablesAndFeedIndexes1756900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "follows"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_follows" (
        "follower_id" character varying NOT NULL,
        "followee_id" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_follows" PRIMARY KEY ("follower_id", "followee_id"),
        CONSTRAINT "FK_user_follows_follower" FOREIGN KEY ("follower_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_follows_followee" FOREIGN KEY ("followee_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_user_follows_not_self" CHECK ("follower_id" <> "followee_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_follows_followee"
      ON "user_follows" ("followee_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_follows" (
        "user_id" character varying NOT NULL,
        "stock_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_follows" PRIMARY KEY ("user_id", "stock_id"),
        CONSTRAINT "FK_stock_follows_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_follows_stock" FOREIGN KEY ("stock_id")
          REFERENCES "stocks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_follows_stock"
      ON "stock_follows" ("stock_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sector_follows" (
        "user_id" character varying NOT NULL,
        "sector_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sector_follows" PRIMARY KEY ("user_id", "sector_id"),
        CONSTRAINT "FK_sector_follows_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sector_follows_sector" FOREIGN KEY ("sector_id")
          REFERENCES "sectors"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sector_follows_sector"
      ON "sector_follows" ("sector_id")
    `);

    await queryRunner.query(`UPDATE "users" SET "follower_count" = 0`);
    await queryRunner.query(`UPDATE "stocks" SET "follower_count" = 0`);
    await queryRunner.query(`UPDATE "sectors" SET "follower_count" = 0`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_feed"
      ON "posts" ("created_at" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_author_feed"
      ON "posts" ("author_id", "created_at" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_sector_feed"
      ON "posts" ("sector_id", "created_at" DESC, "id" DESC)
      WHERE "sector_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_stock_feed"
      ON "posts" ("stock_id", "created_at" DESC, "id" DESC)
      WHERE "stock_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comments_thread"
      ON "comments" ("post_id", "parent_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comments_thread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_stock_feed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_sector_feed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_author_feed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_feed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sector_follows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_follows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_follows"`);
  }
}
