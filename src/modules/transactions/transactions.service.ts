import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildRange, RangeType } from '../../shared/date-range';
import { toDecimal, toNumber } from '../../shared/money';

type TransactionType = 'EXPENSE' | 'INCOME';

interface CreateTransactionInput {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  occurredAt: string;
  comment?: string;
  receiptUrl?: string;
}

interface UpdateTransactionInput extends Partial<CreateTransactionInput> {}

interface ListQuery {
  type?: TransactionType;
  range: RangeType;
  date?: string;
  from?: string;
  to?: string;
  groupBy?: 'DATE';
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateTransactionInput) {
    if (input.amount <= 0) {
      throw new BadRequestException('INVALID_AMOUNT');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }
      const category = await tx.category.findFirst({
        where: { id: input.categoryId, userId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException('CATEGORY_NOT_FOUND');
      }
      if (category.type !== input.type) {
        throw new BadRequestException('CATEGORY_TYPE_MISMATCH');
      }

      const amountDec = toDecimal(input.amount.toFixed(2));
      const nextBalance =
        input.type === 'EXPENSE'
          ? account.balance.sub(amountDec)
          : account.balance.add(amountDec);

      await tx.account.update({
        where: { id: account.id },
        data: { balance: nextBalance },
      });

      const created = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          categoryId: category.id,
          type: input.type,
          amount: amountDec,
          occurredAt: new Date(input.occurredAt),
          comment: input.comment,
          receiptUrl: input.receiptUrl,
        },
        include: { account: true, category: true },
      });
      return this.serialize(created);
    });
  }

  async list(userId: string, query: ListQuery) {
    const { start, end } = buildRange(query.range, query.date, query.from, query.to);
    const items = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        type: query.type,
        occurredAt: { gte: start, lt: end },
      },
      include: { account: true, category: true },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    const mapped = items.map((it) => this.serialize(it));

    if (query.groupBy === 'DATE') {
      const groups = new Map<string, typeof mapped>();
      for (const item of mapped) {
        const key = item.occurredAt.toISOString().slice(0, 10);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      }
      return Array.from(groups.entries()).map(([date, values]) => ({
        date,
        items: values,
      }));
    }
    return mapped;
  }

  async get(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { account: true, category: true },
    });
    if (!transaction) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }
    return this.serialize(transaction);
  }

  async update(userId: string, id: string, input: UpdateTransactionInput) {
    const current = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }

    const next = {
      accountId: input.accountId ?? current.accountId,
      categoryId: input.categoryId ?? current.categoryId,
      type: input.type ?? current.type,
      amount: input.amount ?? toNumber(current.amount),
      occurredAt: input.occurredAt ?? current.occurredAt.toISOString(),
      comment: input.comment ?? current.comment ?? undefined,
      receiptUrl: input.receiptUrl ?? current.receiptUrl ?? undefined,
    };

    if (next.amount <= 0) {
      throw new BadRequestException('INVALID_AMOUNT');
    }

    return this.prisma.$transaction(async (tx) => {
      const previousAccount = await tx.account.findFirst({
        where: { id: current.accountId, userId, deletedAt: null },
      });
      if (!previousAccount) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }

      const previousAmount = current.amount;
      const previousRestored =
        current.type === 'EXPENSE'
          ? previousAccount.balance.add(previousAmount)
          : previousAccount.balance.sub(previousAmount);
      await tx.account.update({
        where: { id: previousAccount.id },
        data: { balance: previousRestored },
      });

      const nextAccount = await tx.account.findFirst({
        where: { id: next.accountId, userId, deletedAt: null },
      });
      if (!nextAccount) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }
      const category = await tx.category.findFirst({
        where: { id: next.categoryId, userId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException('CATEGORY_NOT_FOUND');
      }
      if (category.type !== next.type) {
        throw new BadRequestException('CATEGORY_TYPE_MISMATCH');
      }

      const nextAmountDec = toDecimal(next.amount.toFixed(2));
      const nextBalance =
        next.type === 'EXPENSE'
          ? nextAccount.balance.sub(nextAmountDec)
          : nextAccount.balance.add(nextAmountDec);
      await tx.account.update({
        where: { id: nextAccount.id },
        data: { balance: nextBalance },
      });

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          accountId: next.accountId,
          categoryId: next.categoryId,
          type: next.type,
          amount: nextAmountDec,
          occurredAt: new Date(next.occurredAt),
          comment: next.comment,
          receiptUrl: next.receiptUrl,
        },
        include: { account: true, category: true },
      });
      return this.serialize(updated);
    });
  }

  async remove(userId: string, id: string) {
    const current = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }

    await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: current.accountId, userId, deletedAt: null },
      });
      if (!account) {
        throw new NotFoundException('ACCOUNT_NOT_FOUND');
      }
      const restored =
        current.type === 'EXPENSE'
          ? account.balance.add(current.amount)
          : account.balance.sub(current.amount);
      await tx.account.update({ where: { id: account.id }, data: { balance: restored } });
      await tx.transaction.update({
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
