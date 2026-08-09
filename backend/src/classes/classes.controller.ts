import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ClassesService } from './classes.service';
import { CreateClassDto, JoinClassDto } from './dto/class.dto';
import { ok } from '../common/api-envelope';

@Controller('api/v1/classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async create(@Body() dto: CreateClassDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.classesService.createClass(req.user.sub, dto?.name));
  }

  // Open to any authenticated user — this is how students enter a class.
  @Post('join')
  @HttpCode(200)
  async join(@Body() dto: JoinClassDto, @Req() req: AuthenticatedRequest) {
    return ok(await this.classesService.joinByCode(req.user.sub, dto?.code));
  }

  @Get()
  async listMine(@Req() req: AuthenticatedRequest) {
    const classes = await this.classesService.listForUser(req.user.sub);
    return ok(classes, { count: classes.length });
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.classesService.getDetail(id, req.user));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('teacher')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.classesService.deleteClass(id, req.user);
    return ok({ id });
  }

  // Hoc sinh tu roi lop -- giao vien dung DELETE /:id (xoa han lop) thay vi
  // API nay, xem ClassesService.leaveClass.
  @Post(':id/leave')
  @HttpCode(200)
  async leave(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.classesService.leaveClass(id, req.user.sub);
    return ok({ id });
  }
}
