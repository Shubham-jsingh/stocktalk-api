import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DeletionStatus {
  ACTIVE = 'ACTIVE',
  PENDING_DELETION = 'PENDING_DELETION',
  DELETED = 'DELETED',
}

export enum InvestingStyle {
  VALUE = 'value',
  GROWTH = 'growth',
  DIVIDEND = 'dividend',
  DAY_TRADING = 'day_trading',
  SWING_TRADING = 'swing_trading',
  LONG_TERM = 'long_term',
  INDEX = 'index',
  OPTIONS = 'options',
  CRYPTO = 'crypto',
}

// Full UNIQUE on email/username would block reusing those values after a
// tombstone. Uniqueness applies only while the account is not DELETED.
@Index('UQ_users_email_not_deleted', ['email'], {
  unique: true,
  where: `"deletion_status" <> 'DELETED'`,
})
@Index('UQ_users_username_not_deleted', ['username'], {
  unique: true,
  where: `"deletion_status" <> 'DELETED'`,
})
@Entity('users')
export class User {
  // Firebase Auth UID. This is both the Firebase identity and our primary key.
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  username: string;

  @Column()
  email: string;

  // Hashed password for optional email/password sign-up. Null for Firebase accounts.
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({
    name: 'investing_style',
    type: 'enum',
    enum: InvestingStyle,
    nullable: true,
  })
  investingStyle: InvestingStyle | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'youtube_link', type: 'varchar', nullable: true })
  youtubeLink: string | null;

  @Column({ name: 'instagram_link', type: 'varchar', nullable: true })
  instagramLink: string | null;

  @Column({ name: 'website_link', type: 'varchar', nullable: true })
  websiteLink: string | null;

  @Column({ name: 'twitter_link', type: 'varchar', nullable: true })
  twitterLink: string | null;

  @Column({ name: 'profile_photo_url', type: 'varchar', nullable: true })
  profilePhotoUrl: string | null;

  // Denormalized so "how many users follow this user" is a single column read.
  @Column({ name: 'follower_count', type: 'int', default: 0 })
  followerCount: number;

  @Column({
    name: 'deletion_status',
    type: 'varchar',
    length: 32,
    default: DeletionStatus.ACTIVE,
  })
  deletionStatus: DeletionStatus;

  @Column({
    name: 'deletion_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletionRequestedAt: Date | null;

  @Column({
    name: 'scheduled_deletion_date',
    type: 'timestamptz',
    nullable: true,
  })
  scheduledDeletionDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
