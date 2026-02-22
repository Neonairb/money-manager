import { Controller, Get, Post } from '@nestjs/common';
import { IconsService } from './icons.service';

@Controller('icons')
export class IconsController {
  constructor(private readonly iconsService: IconsService) {}

  @Get()
  async list() {
    return { success: true, data: await this.iconsService.list() };
  }

  @Post('seed')
  async seed() {
    return { success: true, data: await this.iconsService.seed() };
  }
}
