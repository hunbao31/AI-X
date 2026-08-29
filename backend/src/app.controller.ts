import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  // 👉 THÊM ĐOẠN NÀY
  @Get('version')
  getVersion() {
    return {
      version: '2099bd6',
      time: new Date().toISOString(),
    };
  }
}