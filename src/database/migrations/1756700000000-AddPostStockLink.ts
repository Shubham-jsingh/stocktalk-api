import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostStockLink1756700000000 implements MigrationInterface {
  name = 'AddPostStockLink1756700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "stock_id" uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_posts_stock_id'
        ) THEN
          ALTER TABLE "posts"
          ADD CONSTRAINT "FK_posts_stock_id"
          FOREIGN KEY ("stock_id") REFERENCES "stocks"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_stock_id" ON "posts" ("stock_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_stock_id"`);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_posts_stock_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "stock_id"
    `);
  }
}
