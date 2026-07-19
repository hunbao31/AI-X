const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
  meta: Record<string, unknown>;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (proxy error page, empty body, etc.) — fall
    // through to the generic HTTP-status message below instead of
    // throwing a raw parse error.
  }

  const parsed = (body ?? {}) as Partial<ApiSuccess<T>> & Partial<ApiError> & {
    message?: string;
  };

  if (res.ok && parsed.success === true) {
    return parsed.data as T;
  }

  // Covers three shapes: our own {success:false, error:{message}} envelope,
  // Nest's default exception filter ({statusCode, message}) for anything
  // that bypassed our envelope (unhandled errors, framework-level 4xx),
  // and a total non-response — always resolves to a readable string
  // instead of crashing on a missing nested field.
  const message =
    parsed.error?.message ??
    (typeof parsed.message === 'string' ? parsed.message : null) ??
    `Request failed (HTTP ${res.status}).`;

  throw new Error(message);
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
