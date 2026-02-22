import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../../shared/current-user.decorator';
import { TransfersService } from './transfers.service';

type RangeType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

class CreateTransferDto {
  @IsString()
  fromAccountId!: string;

  @IsString()
  toAccountId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

class UpdateTransferDto {
  @IsOptional()
  @IsString()
  fromAccountId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

class ListTransfersQuery {
  @IsIn(['DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'])
  range!: RangeType;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateTransferDto) {
    return { success: true, data: await this.transfersService.create(user.id, dto) };
  }

  @Get()
  async list(@CurrentUser() user: { id: string }, @Query() query: ListTransfersQuery) {
    return { success: true, data: await this.transfersService.list(user.id, query) };
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.transfersService.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateTransferDto,
  ) {
    return { success: true, data: await this.transfersService.update(user.id, id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.transfersService.remove(user.id, id) };
  }
}
