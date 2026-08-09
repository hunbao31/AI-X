const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// For the rare non-JSON call (file downloads) that needs the base + token.
export const API_BASE_URL = API_URL;
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

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

async function requestFull<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const token = getToken();
  // A FormData body (file uploads) must NOT get a hand-set Content-Type —
  // the browser derives the multipart boundary itself only when it's left
  // alone. Every existing JSON call site sends a string body (or none), so
  // this never changes behavior for them.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    return { data: parsed.data as T, meta: parsed.meta ?? {} };
  }

  // Covers three shapes: our own {success:false, error:{message}} envelope,
  // Nest's default exception filter ({statusCode, message}) for anything
  // that bypassed our envelope (unhandled errors, framework-level 4xx),
  // and a total non-response — always resolves to a readable string
  // instead of crashing on a missing nested field.
  const message =
    parsed.error?.message ??
    (typeof parsed.message === 'string' ? parsed.message : null) ??
    `Yêu cầu thất bại (HTTP ${res.status}).`;

  throw new Error(message);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await requestFull<T>(path, options)).data;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

// Like apiGet, but also surfaces the response envelope's `meta` (pagination
// flags, counts, etc) instead of discarding it.
export function apiGetWithMeta<T>(
  path: string,
): Promise<{ data: T; meta: Record<string, unknown> }> {
  return requestFull<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// Multipart upload (forum image posts/answers, Excel exercise import).
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form });
}

// Resolves a backend-relative path (e.g. "/uploads/forum/xyz.jpg") to a full
// URL against the API origin. Already-absolute URLs pass through unchanged
// (future cloud-storage URLs will be absolute).
export function resolveImageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}
