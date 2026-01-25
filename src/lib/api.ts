/**
 * KLINEO API client — baseURL from VITE_API_BASE_URL, Bearer from session, 401 → logout.
 */

import { supabase } from './supabase';
import { triggerLogout } from './authEvents';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!baseURL?.trim()) {
    throw new Error('VITE_API_BASE_URL not set — API calls disabled');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const base = baseURL.replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    triggerLogout();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
