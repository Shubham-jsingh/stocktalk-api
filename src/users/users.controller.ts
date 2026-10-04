import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user';
import { CheckUsernameDto } from './dto/check-username.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('check-username')
  async checkUsername(@Query() query: CheckUsernameDto) {
    const available = await this.usersService.isUsernameAvailable(
      query.username,
    );
    return { username: query.username, available };
  }

  @Get('search')
  search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 3) {
      throw new BadRequestException(
        'Search query "q" must be at least 3 characters',
      );
    }
    return this.usersService.searchUsers(term);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  update(@GetUser() auth: AuthUser, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(auth.uid, auth.uid, updateUserDto);
  }
}
