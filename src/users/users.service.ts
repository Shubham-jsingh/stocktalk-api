import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

// Shape returned to clients: the user without the password field.
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
      password: passwordHash,
    });

    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.stripPassword(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Only apply fields that were actually provided. class-transformer sets
    // omitted optional fields to `undefined`; assigning those would wipe data.
    for (const [key, value] of Object.entries(updateUserDto)) {
      if (value !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = value;
      }
    }
    const saved = await this.usersRepository.save(user);
    return this.stripPassword(saved);
  }

  private stripPassword(user: User): SafeUser {
    const { password: _password, ...safe } = user;
    return safe;
  }
}
