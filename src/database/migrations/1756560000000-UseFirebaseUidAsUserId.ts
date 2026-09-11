import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseFirebaseUidAsUserId1756560000000 implements MigrationInterface {
  name = 'UseFirebaseUidAsUserId1756560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT tc.table_name, tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
        ) LOOP
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firebase_uid" character varying
    `);

    await queryRunner.query(`
      UPDATE posts SET author_id = u.firebase_uid
      FROM users u
      WHERE posts.author_id::text = u.id::text
        AND u.firebase_uid IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE comments SET author_id = u.firebase_uid
      FROM users u
      WHERE comments.author_id::text = u.id::text
        AND u.firebase_uid IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE post_reactions SET user_id = u.firebase_uid
      FROM users u
      WHERE post_reactions.user_id::text = u.id::text
        AND u.firebase_uid IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE follows SET user_id = u.firebase_uid
      FROM users u
      WHERE follows.user_id::text = u.id::text
        AND u.firebase_uid IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE follows SET target_id = u.firebase_uid
      FROM users u
      WHERE follows.target_type = 'user'
        AND follows.target_id::text = u.id::text
        AND u.firebase_uid IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE users SET id = firebase_uid
      WHERE firebase_uid IS NOT NULL AND id::text <> firebase_uid
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" TYPE character varying USING id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "author_id" TYPE character varying USING author_id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ALTER COLUMN "author_id" TYPE character varying USING author_id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reactions" ALTER COLUMN "user_id" TYPE character varying USING user_id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ALTER COLUMN "user_id" TYPE character varying USING user_id::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "follows" ALTER COLUMN "target_id" TYPE character varying USING target_id::text`,
    );

    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_posts_author_id" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_author_id" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reactions" ADD CONSTRAINT "FK_post_reactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_firebase_uid"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "firebase_uid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'Reverting UseFirebaseUidAsUserId is not supported; restore from backup',
    );
  }
}
