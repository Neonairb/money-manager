import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    // Prisma 7 requires a driver adapter for direct DB connectivity.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
