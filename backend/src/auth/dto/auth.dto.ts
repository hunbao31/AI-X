export class RegisterDto {
  username!: string;
  password!: string;
  email?: string | null;
  role?: string;
}

export class LoginDto {
  // Any one of these three carries the login identifier.
  identifier?: string;
  username?: string;
  email?: string;
  password!: string;
}
