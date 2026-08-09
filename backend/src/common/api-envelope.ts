import { HttpException, HttpStatus } from '@nestjs/common';

// Single place for the response envelope every controller returns. The
// per-file errorBody/errorEnvelope helpers that predate this file still work;
// new modules should use these.

export interface ApiMeta {
  timestamp: string;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export function ok<T>(data: T, extraMeta: Record<string, unknown> = {}): ApiSuccess<T> {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...extraMeta },
  };
}

export function apiError(
  code: string,
  message: string,
  status: HttpStatus,
): HttpException {
  return new HttpException(
    {
      success: false,
      error: { code, message },
      meta: { timestamp: new Date().toISOString() },
    },
    status,
  );
}
