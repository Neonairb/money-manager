import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });

      await tx.account.create({
        data: {
          userId: created.id,
          name: 'main account',
          balance: new Prisma.Decimal(0),
        },
      });

      await tx.category.createMany({
        data: [
          { userId: created.id, name: 'gasoline', type: 'EXPENSE' },
          { userId: created.id, name: 'food', type: 'EXPENSE' },
          { userId: created.id, name: 'house services', type: 'EXPENSE' },
          { userId: created.id, name: 'salary', type: 'INCOME' },
        ],
      });

      return created;
    });
    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { user: { id: user.id, email: user.email }, token };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
