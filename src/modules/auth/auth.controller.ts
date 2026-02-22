import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../../shared/current-user.decorator';
import { Public } from '../../shared/public.decorator';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return { success: true, data: await this.authService.register(dto.email, dto.password) };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return { success: true, data: await this.authService.login(dto.email, dto.password) };
  }
  
  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    return { success: true, data: await this.authService.me(user.id) };
  }
}

