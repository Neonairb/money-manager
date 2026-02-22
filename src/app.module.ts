import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { IconsModule } from './modules/icons/icons.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './shared/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    IconsModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    TransfersModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
