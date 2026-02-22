import { BadRequestException } from '@nestjs/common';

export type RangeType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const startOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDays = (date: Date, days: number) => {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
};

export function buildRange(
  range: RangeType,
  anchorDate?: string,
  from?: string,
  to?: string,
) {
  if (range === 'CUSTOM') {
    if (!from || !to) {
      throw new BadRequestException('INVALID_RANGE');
    }
    const start = startOfDay(new Date(from));
    const end = addDays(startOfDay(new Date(to)), 1);
    return { start, end };
  }

  const anchor = startOfDay(anchorDate ? new Date(anchorDate) : new Date());
  if (range === 'DAY') {
    return { start: anchor, end: addDays(anchor, 1) };
  }
  if (range === 'WEEK') {
    const day = anchor.getUTCDay();
    const mondayDelta = day === 0 ? -6 : 1 - day;
    const start = addDays(anchor, mondayDelta);
    return { start, end: addDays(start, 7) };
  }
  if (range === 'MONTH') {
    const start = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
    );
    return {
      start,
      end: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1)),
    };
  }
  if (range === 'YEAR') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
    return { start, end: new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1)) };
  }
  throw new BadRequestException('INVALID_RANGE');
}
