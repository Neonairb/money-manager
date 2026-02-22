import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    const token = auth.slice(7);

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });
      if (!user) {
        throw new UnauthorizedException('UNAUTHORIZED');
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}
