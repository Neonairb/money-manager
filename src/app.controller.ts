import { Controller, Get } from '@nestjs/common';
import { Public } from './shared/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  health() {
    return { success: true, data: { status: 'ok' } };
  }
}
