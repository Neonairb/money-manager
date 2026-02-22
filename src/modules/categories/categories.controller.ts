import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../../shared/current-user.decorator';
import { CategoriesService } from './categories.service';

const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
type CategoryType = (typeof CATEGORY_TYPES)[number];

class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(CATEGORY_TYPES)
  type!: CategoryType;

  @IsOptional()
  @IsString()
  iconId?: string;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  iconId?: string | null;
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreateCategoryDto) {
    return { success: true, data: await this.categoriesService.create(user.id, dto) };
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('type') type?: CategoryType,
  ) {
    return { success: true, data: await this.categoriesService.list(user.id, type) };
  }

  @Get(':id')
  async get(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.categoriesService.get(user.id, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return { success: true, data: await this.categoriesService.update(user.id, id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.categoriesService.remove(user.id, id) };
  }
}
