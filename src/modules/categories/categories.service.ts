import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CategoryType = 'EXPENSE' | 'INCOME';

interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  iconId?: string;
}

interface UpdateCategoryInput {
  name?: string;
  iconId?: string | null;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateCategoryInput) {
    if (input.iconId) {
      const icon = await this.prisma.icon.findUnique({ where: { id: input.iconId } });
      if (!icon) {
        throw new NotFoundException('ICON_NOT_FOUND');
      }
    }
    return this.prisma.category.create({
      data: { ...input, userId },
      include: { icon: true },
    });
  }

  async list(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: { userId, type, deletedAt: null },
      include: { icon: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async get(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, deletedAt: null },
      include: { icon: true },
    });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async update(userId: string, id: string, input: UpdateCategoryInput) {
    await this.get(userId, id);
    if (input.iconId) {
      const icon = await this.prisma.icon.findUnique({ where: { id: input.iconId } });
      if (!icon) {
        throw new NotFoundException('ICON_NOT_FOUND');
      }
    }
    return this.prisma.category.update({
      where: { id },
      data: input,
      include: { icon: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }
}
