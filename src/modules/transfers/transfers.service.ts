import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildRange, RangeType } from '../../shared/date-range';
import { toDecimal, toNumber } from '../../shared/money';

interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAt: string;
  comment?: string;
}

interface UpdateTransferInput extends Partial<CreateTransferInput> {}

interface ListTransfersQuery {
  range: RangeType;
  date?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateTransferInput) {
    if (input.fromAccountId === input.toAccountId) {
      throw new BadRequestException('INVALID_TRANSFER_ACCOUNTS');
    }
    if (input.amount <= 0) {
      throw new BadRequestException('INVALID_AMOUNT');
    }
    return this.prisma.$transaction(async (tx) => {
      const from = await tx.account.findFirst({
        where: { id: input.fromAccountId, userId, deletedAt: null },
      });
      const to = await tx.account.findFirst({
        where: { id: input.toAccountId, userId, deletedAt: null },
      });
      if (!from || !to) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }

      const amount = toDecimal(input.amount.toFixed(2));
      await tx.account.update({
        where: { id: from.id },
        data: { balance: from.balance.sub(amount) },
      });
      await tx.account.update({
        where: { id: to.id },
        data: { balance: to.balance.add(amount) },
      });
      const transfer = await tx.transfer.create({
        data: {
          userId,
          fromAccountId: from.id,
          toAccountId: to.id,
          amount,
          occurredAt: new Date(input.occurredAt),
          comment: input.comment,
        },
        include: { fromAccount: true, toAccount: true },
      });
      return this.serialize(transfer);
    });
  }

  async list(userId: string, query: ListTransfersQuery) {
    const { start, end } = buildRange(query.range, query.date, query.from, query.to);
    const items = await this.prisma.transfer.findMany({
      where: {
        userId,
        deletedAt: null,
        occurredAt: { gte: start, lt: end },
      },
      include: { fromAccount: true, toAccount: true },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map((item) => this.serialize(item));
  }

  async get(userId: string, id: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, userId, deletedAt: null },
      include: { fromAccount: true, toAccount: true },
    });
    if (!transfer) {
      throw new NotFoundException('TRANSFER_NOT_FOUND');
    }
    return this.serialize(transfer);
  }

  async update(userId: string, id: string, input: UpdateTransferInput) {
    const current = await this.prisma.transfer.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException('TRANSFER_NOT_FOUND');
    }
    const next = {
      fromAccountId: input.fromAccountId ?? current.fromAccountId,
      toAccountId: input.toAccountId ?? current.toAccountId,
      amount: input.amount ?? toNumber(current.amount),
      occurredAt: input.occurredAt ?? current.occurredAt.toISOString(),
      comment: input.comment ?? current.comment ?? undefined,
    };
    if (next.fromAccountId === next.toAccountId) {
      throw new BadRequestException('INVALID_TRANSFER_ACCOUNTS');
    }
    if (next.amount <= 0) {
      throw new BadRequestException('INVALID_AMOUNT');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldFrom = await tx.account.findFirst({
        where: { id: current.fromAccountId, userId, deletedAt: null },
      });
      const oldTo = await tx.account.findFirst({
        where: { id: current.toAccountId, userId, deletedAt: null },
      });
      if (!oldFrom || !oldTo) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }

      await tx.account.update({
        where: { id: oldFrom.id },
        data: { balance: oldFrom.balance.add(current.amount) },
      });
      await tx.account.update({
        where: { id: oldTo.id },
        data: { balance: oldTo.balance.sub(current.amount) },
      });

      const newFrom = await tx.account.findFirst({
        where: { id: next.fromAccountId, userId, deletedAt: null },
      });
      const newTo = await tx.account.findFirst({
        where: { id: next.toAccountId, userId, deletedAt: null },
      });
      if (!newFrom || !newTo) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }
      const amount = toDecimal(next.amount.toFixed(2));
      await tx.account.update({
        where: { id: newFrom.id },
        data: { balance: newFrom.balance.sub(amount) },
      });
      await tx.account.update({
        where: { id: newTo.id },
        data: { balance: newTo.balance.add(amount) },
      });

      const updated = await tx.transfer.update({
        where: { id },
        data: {
          fromAccountId: next.fromAccountId,
          toAccountId: next.toAccountId,
          amount,
          occurredAt: new Date(next.occurredAt),
          comment: next.comment,
        },
        include: { fromAccount: true, toAccount: true },
      });
      return this.serialize(updated);
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.prisma.transfer.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException('TRANSFER_NOT_FOUND');
    }

    await this.prisma.$transaction(async (tx) => {
      const from = await tx.account.findFirst({
        where: { id: current.fromAccountId, userId, deletedAt: null },
      });
      const to = await tx.account.findFirst({
        where: { id: current.toAccountId, userId, deletedAt: null },
      });
      if (!from || !to) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }
      await tx.account.update({
        where: { id: from.id },
        data: { balance: from.balance.add(current.amount) },
      });
      await tx.account.update({
        where: { id: to.id },
        data: { balance: to.balance.sub(current.amount) },
      });
      await tx.transfer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    return { id };
  }

  private serialize<T extends { amount: { toString: () => string }; [k: string]: any }>(
    item: T,
  ) {
    return { ...item, amount: toNumber(item.amount) };
  }
}
