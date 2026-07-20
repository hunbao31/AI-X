import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ok, apiError } from '../common/api-envelope';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterDto) {
    if (!body?.username?.trim() || !body?.password) {
      throw apiError(
        'VALIDATION_ERROR',
        'Username and password are required.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (body.password.length < 6) {
      throw apiError(
        'VALIDATION_ERROR',
        'Password must be at least 6 characters.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const user = await this.authService.register(
      body.username.trim(),
      body.password,
      body.email,
      body.role,
    );
    return ok(user);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    // Accepts {identifier} (preferred), or {username} / {email} — the latter
    // keeps pre-upgrade clients that still send {email, password} working.
    const identifier = body?.identifier ?? body?.username ?? body?.email;

    if (!identifier?.trim() || !body?.password) {
      throw apiError(
        'VALIDATION_ERROR',
        'Username (or email) and password are required.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const result = await this.authService.login(identifier, body.password);
    return ok(result);
  }
}
