import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
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
    });

    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const taken = await this.usersRepository.existsBy({ username });
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
  }): Promise<SafeUser> {
    if (!data.email) {
      throw new UnauthorizedException('Firebase token is missing email');
    }

    const existing = await this.usersRepository.findOne({
      where: { id: data.uid },
    });

    if (existing) {
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
    });

    const saved = await this.usersRepository.save(created);
    return this.stripPassword(saved);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.stripPassword(user);
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
