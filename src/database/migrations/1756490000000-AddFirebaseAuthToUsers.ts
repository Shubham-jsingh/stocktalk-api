import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirebaseAuthToUsers1756490000000 implements MigrationInterface {
  name = 'AddFirebaseAuthToUsers1756490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "firebase_uid" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_firebase_uid" ON "users" ("firebase_uid") WHERE "firebase_uid" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_firebase_uid"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firebase_uid"`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
  }
}
