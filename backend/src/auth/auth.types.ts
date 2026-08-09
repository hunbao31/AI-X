// Single source of truth for role/actor typing across guards, decorators,
// and controllers.

export type Role = 'student' | 'teacher' | 'admin';

export const ALL_ROLES: Role[] = ['student', 'teacher', 'admin'];

// Roles a user may pick at self-signup. "admin" is deliberately excluded —
// admins are promoted directly in the database (or by another admin later).
export const SELF_SIGNUP_ROLES: Role[] = ['student', 'teacher'];

export interface AuthenticatedUser {
  sub: string;
  username: string;
  email: string | null;
  role: Role;
}

// Shape of every guarded request once JwtAuthGuard has run.
export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
