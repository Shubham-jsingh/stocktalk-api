import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Alerts tab rows (`notifications`) and FCM registration tokens
 * (`device_tokens`) for push notifications.
 */
export class AddNotifications1757100000000 implements MigrationInterface {
  name = 'AddNotifications1757100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notifications_type_enum" AS ENUM (
          'post_comment', 'new_follower', 'followed_user_post'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_id" character varying NOT NULL,
        "actor_id" character varying NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "post_id" uuid,
        "comment_id" uuid,
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_actor" FOREIGN KEY ("actor_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_post" FOREIGN KEY ("post_id")
          REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_comment" FOREIGN KEY ("comment_id")
          REFERENCES "comments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_recipient_feed"
      ON "notifications" ("recipient_id", "created_at" DESC, "id" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_unread"
      ON "notifications" ("recipient_id")
      WHERE "read_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "token" character varying NOT NULL,
        "user_id" character varying NOT NULL,
        "platform" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_seen_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("token"),
        CONSTRAINT "FK_device_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_tokens_user"
      ON "device_tokens" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
  }
}
