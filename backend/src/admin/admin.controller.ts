import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { ok } from '../common/api-envelope';

// Toan bo controller nay CHI danh cho admin (khac cac module khac dung
// @Roles('teacher') roi de RolesGuard tu bypass cho admin) -- day la du lieu
// toan he thong, xuyen lop/xuyen giao vien, khong phai thu giao vien thuong
// nen duoc xem.
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('attempts')
  async getAllAttempts() {
    const rows = await this.adminService.getAllAttempts();
    return ok(rows, { count: rows.length });
  }
}
