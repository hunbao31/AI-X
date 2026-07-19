import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersStore } from './users.store';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsersStore],
})
export class AuthModule {}
