import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const BUILTIN_ICONS = [
  { key: 'wallet', label: 'Wallet' },
  { key: 'bank', label: 'Bank' },
  { key: 'food', label: 'Food' },
  { key: 'car', label: 'Car' },
  { key: 'salary', label: 'Salary' },
  { key: 'gift', label: 'Gift' },
];

@Injectable()
export class IconsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.icon.findMany({ orderBy: { label: 'asc' } });
  }

  async seed() {
    for (const icon of BUILTIN_ICONS) {
      await this.prisma.icon.upsert({
        where: { key: icon.key },
        create: icon,
        update: { label: icon.label },
      });
    }
    return this.list();
  }
}
