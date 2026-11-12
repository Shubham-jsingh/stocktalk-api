import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { ILike, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeletionStatus, User } from './entities/user.entity';

export type SafeUser = Omit<User, 'password'>;

const DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOne({
      where: [
        {
          email: createUserDto.email,
          deletionStatus: Not(DeletionStatus.DELETED),
        },
        {
          username: createUserDto.username,
          deletionStatus: Not(DeletionStatus.DELETED),
        },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'A user with this email or username already exists',
      );
    }

    const { password, ...profile } = createUserDto;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...profile,
      id: randomUUID(),
      password: passwordHash,
      deletionStatus: DeletionStatus.ACTIVE,
    });

    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const taken = await this.usersRepository.existsBy({
      username,
      deletionStatus: Not(DeletionStatus.DELETED),
    });
    return !taken;
  }

  async findEntityById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async upsertFromFirebase(data: {
    uid: string;
    email: string | null;
    fullName?: string | null;
    profilePhotoUrl?: string | null;
    /** Firebase `auth_time` in seconds. Changes on sign-in, not on token refresh. */
    authTime?: number;
  }): Promise<SafeUser> {
    if (!data.email) {
      throw new UnauthorizedException('Firebase token is missing email');
    }

    const existing = await this.usersRepository.findOne({
      where: { id: data.uid },
    });

    if (existing) {
      if (existing.deletionStatus === DeletionStatus.DELETED) {
        throw new UnauthorizedException('This account has been deleted');
      }

      this.restoreIfSignedInAgain(existing, data.authTime);
      if (data.fullName && !existing.fullName) {
        existing.fullName = data.fullName;
      }
      if (data.profilePhotoUrl && !existing.profilePhotoUrl) {
        existing.profilePhotoUrl = data.profilePhotoUrl;
      }
      const saved = await this.usersRepository.save(existing);
      return this.stripPassword(saved);
    }

    const username = await this.generateUniqueUsername(data.email);
    const created = this.usersRepository.create({
      id: data.uid,
      username,
      email: data.email,
      fullName: data.fullName ?? null,
      profilePhotoUrl: data.profilePhotoUrl ?? null,
      password: null,
      deletionStatus: DeletionStatus.ACTIVE,
    });

    const saved = await this.usersRepository.save(created);
    return this.stripPassword(saved);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user || user.deletionStatus === DeletionStatus.DELETED) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.stripPassword(user);
  }

  /**
   * Starts the 30-day grace period. A later sign-in (new Firebase auth_time)
   * cancels it. Calling this again does not move the scheduled date.
   */
  async requestDeletion(id: string, authTime?: number): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user || user.deletionStatus === DeletionStatus.DELETED) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (user.deletionStatus === DeletionStatus.PENDING_DELETION) {
      return this.stripPassword(user);
    }

    // Never earlier than this token's auth_time, so the current session
    // (same auth_time) cannot satisfy the "signed in again" check.
    const now = Date.now();
    const authMs = authTime != null ? authTime * 1000 : now;
    const requestedAt = new Date(Math.max(now, authMs));
    user.deletionStatus = DeletionStatus.PENDING_DELETION;
    user.deletionRequestedAt = requestedAt;
    user.scheduledDeletionDate = new Date(
      requestedAt.getTime() + DELETION_GRACE_MS,
    );
    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  // Prefix search by username or display name (fullName). Caller enforces min length.
  async searchUsers(query: string): Promise<SafeUser[]> {
    const term = `${query.trim()}%`;
    const users = await this.usersRepository.find({
      where: [
        {
          username: ILike(term),
          deletionStatus: Not(DeletionStatus.DELETED),
        },
        {
          fullName: ILike(term),
          deletionStatus: Not(DeletionStatus.DELETED),
        },
      ],
      order: { username: 'ASC' },
      take: 20,
    });
    return users.map((user) => this.stripPassword(user));
  }

  async update(
    actorId: string,
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<SafeUser> {
    if (actorId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    for (const [key, value] of Object.entries(updateUserDto)) {
      if (value !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = value;
      }
    }
    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  toSafeUser(user: User): SafeUser {
    return this.stripPassword(user);
  }

  /**
   * Firebase `auth_time` stays put across token refresh and moves only when
   * the user signs in again. Restore only after that new sign-in, so the
   * request that starts deletion does not immediately cancel itself.
   */
  private restoreIfSignedInAgain(user: User, authTimeSeconds?: number): boolean {
    if (user.deletionStatus !== DeletionStatus.PENDING_DELETION) {
      return false;
    }
    if (!user.deletionRequestedAt || authTimeSeconds == null) {
      return false;
    }
    if (authTimeSeconds * 1000 <= user.deletionRequestedAt.getTime()) {
      return false;
    }

    user.deletionStatus = DeletionStatus.ACTIVE;
    user.deletionRequestedAt = null;
    user.scheduledDeletionDate = null;
    return true;
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const localPart = email.split('@')[0] ?? 'user';
    const sanitized =
      localPart.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_') || 'user';
    const base = sanitized.slice(0, 15);

    let candidate = base;
    let suffix = 0;

    while (!(await this.isUsernameAvailable(candidate))) {
      suffix += 1;
      const suffixText = `_${suffix}`;
      candidate = `${base.slice(0, 20 - suffixText.length)}${suffixText}`;
    }

    return candidate;
  }

  private stripPassword(user: User): SafeUser {
    const { password: _password, ...safe } = user;
    return safe;
  }
}
