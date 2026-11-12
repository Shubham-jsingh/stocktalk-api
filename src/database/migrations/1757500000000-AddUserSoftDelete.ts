import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 30-day account deletion grace period.
 * email/username stay unique for ACTIVE and PENDING_DELETION rows only, so a
 * later tombstone can anonymize those columns without blocking a new signup.
 */
export class AddUserSoftDelete1757500000000 implements MigrationInterface {
  name = 'AddUserSoftDelete1757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deletion_status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "scheduled_deletion_date" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_deletion_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_deletion_status"
      CHECK ("deletion_status" IN ('ACTIVE', 'PENDING_DELETION', 'DELETED'))
    `);

    // TypeORM synchronize created UNIQUE constraints with generated names.
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
          WHERE n.nspname = 'public'
            AND t.relname = 'users'
            AND c.contype = 'u'
            AND a.attname IN ('email', 'username')
        LOOP
          EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT i.relname AS index_name
          FROM pg_index ix
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_class t ON t.oid = ix.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (ix.indkey)
          WHERE n.nspname = 'public'
            AND t.relname = 'users'
            AND ix.indisunique
            AND a.attname IN ('email', 'username')
            AND i.relname NOT IN (
              'UQ_users_email_not_deleted',
              'UQ_users_username_not_deleted'
            )
        LOOP
          EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email_not_deleted"
      ON "users" ("email")
      WHERE "deletion_status" <> 'DELETED'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_username_not_deleted"
      ON "users" ("username")
      WHERE "deletion_status" <> 'DELETED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_users_email_not_deleted"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_users_username_not_deleted"`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      ADD CONSTRAINT "UQ_users_username" UNIQUE ("username")
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_deletion_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "scheduled_deletion_date",
      DROP COLUMN IF EXISTS "deletion_requested_at",
      DROP COLUMN IF EXISTS "deletion_status"
    `);
  }
}
