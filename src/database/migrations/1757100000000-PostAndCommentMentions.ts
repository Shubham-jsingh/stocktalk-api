import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostAndCommentMentions1757100000000 implements MigrationInterface {
  name = 'PostAndCommentMentions1757100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_mentions" (
        "post_id" uuid NOT NULL,
        "mentioned_user_id" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_mentions" PRIMARY KEY ("post_id", "mentioned_user_id"),
        CONSTRAINT "FK_post_mentions_post" FOREIGN KEY ("post_id")
          REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_mentions_user" FOREIGN KEY ("mentioned_user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_post_mentions_user"
      ON "post_mentions" ("mentioned_user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comment_mentions" (
        "comment_id" uuid NOT NULL,
        "mentioned_user_id" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comment_mentions" PRIMARY KEY ("comment_id", "mentioned_user_id"),
        CONSTRAINT "FK_comment_mentions_comment" FOREIGN KEY ("comment_id")
          REFERENCES "comments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_mentions_user" FOREIGN KEY ("mentioned_user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comment_mentions_user"
      ON "comment_mentions" ("mentioned_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "comment_mentions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_mentions"`);
  }
}
