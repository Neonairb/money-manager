import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '../../shared/current-user.decorator';
import { AccountsService } from './accounts.service';

class CreateAccountDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  iconId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBalance!: number;
}

class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  iconId?: string | null;
}

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateAccountDto) {
    return { success: true, data: await this.accountsService.create(user.id, dto) };
  }

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    return { success: true, data: await this.accountsService.list(user.id) };
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.accountsService.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return { success: true, data: await this.accountsService.update(user.id, id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.accountsService.remove(user.id, id) };
  }
}
