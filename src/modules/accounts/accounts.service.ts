import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toDecimal, toNumber } from '../../shared/money';

interface CreateAccountInput {
  name: string;
  iconId?: string;
  initialBalance: number;
}

interface UpdateAccountInput {
  name?: string;
  iconId?: string | null;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateAccountInput) {
    if (input.initialBalance < 0) {
      throw new BadRequestException('INVALID_AMOUNT');
    }
    if (input.iconId) {
      const icon = await this.prisma.icon.findUnique({ where: { id: input.iconId } });
      if (!icon) {
        throw new NotFoundException('ICON_NOT_FOUND');
      }
    }
    const account = await this.prisma.account.create({
      data: {
        userId,
        name: input.name,
        iconId: input.iconId,
        balance: toDecimal(input.initialBalance.toFixed(2)),
      },
      include: { icon: true },
    });
    return this.serialize(account);
  }

  async list(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      include: { icon: true },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.serialize(a));
  }

  async get(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
      include: { icon: true },
    });
    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }
    return this.serialize(account);
  }

  async update(userId: string, id: string, input: UpdateAccountInput) {
    await this.get(userId, id);
    if (input.iconId) {
      const icon = await this.prisma.icon.findUnique({ where: { id: input.iconId } });
      if (!icon) {
        throw new NotFoundException('ICON_NOT_FOUND');
      }
    }
    const account = await this.prisma.account.update({
      where: { id },
      data: {
        name: input.name,
        iconId: input.iconId,
      },
      include: { icon: true },
    });
    return this.serialize(account);
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  private serialize(account: { balance: any } & Record<string, any>) {
    return { ...account, balance: toNumber(account.balance) };
  }
}
