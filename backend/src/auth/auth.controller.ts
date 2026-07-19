import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface AuthCredentials {
  email: string;
  password: string;
  role?: string;
}

function validateCredentials(body: AuthCredentials) {
  if (!body?.email || !body?.password) {
    throw new HttpException(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
        },
        meta: { timestamp: new Date().toISOString() },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: AuthCredentials) {
    validateCredentials(body);
    const user = await this.authService.register(
      body.email,
      body.password,
      body.role,
    );

    return {
      success: true,
      data: user,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: AuthCredentials) {
    validateCredentials(body);
    const result = await this.authService.login(body.email, body.password);

    return {
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
