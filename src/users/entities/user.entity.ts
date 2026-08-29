import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  // Hashed password for email/password sign-up. Null for Firebase-only accounts.
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ name: 'firebase_uid', type: 'varchar', unique: true, nullable: true })
  firebaseUid: string | null;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
