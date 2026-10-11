import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separates "seen" (Alerts tab opened; clears the badge) from "read" (that
 * notification was tapped; clears its unread style).
 */
export class AddNotificationSeenAt1757400000000 implements MigrationInterface {
  name = 'AddNotificationSeenAt1757400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "seen_at" TIMESTAMP`,
    );
    // Anything already read counts as seen.
    await queryRunner.query(
      `UPDATE "notifications" SET "seen_at" = "read_at" WHERE "read_at" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_unseen"
      ON "notifications" ("recipient_id")
      WHERE "seen_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_unseen"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "seen_at"`,
    );
  }
}
