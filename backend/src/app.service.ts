import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      success: true,
      data: { status: 'ok' },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
