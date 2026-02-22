import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser } from '../../shared/current-user.decorator';
import { TransactionsService } from './transactions.service';

const TRANSACTION_TYPES = ['EXPENSE', 'INCOME'] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];
type RangeType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

class CreateTransactionDto {
  @IsString()
  accountId!: string;

  @IsString()
  categoryId!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: TransactionType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

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

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

class ListTransactionsQuery {
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

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

  @IsOptional()
  @IsIn(['DATE'])
  groupBy?: 'DATE';
}

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTransactionDto,
  ) {
    return { success: true, data: await this.transactionsService.create(user.id, dto) };
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query() query: ListTransactionsQuery,
  ) {
    return { success: true, data: await this.transactionsService.list(user.id, query) };
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.transactionsService.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return { success: true, data: await this.transactionsService.update(user.id, id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.transactionsService.remove(user.id, id) };
  }
}
