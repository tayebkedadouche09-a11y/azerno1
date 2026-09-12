export type ApiUser = { id: string; name: string; role: 'owner' | 'manager' | 'worker' };

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'azrnou_access_token';

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(value: string | null) {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken() {
  return token();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(body?.error ?? `API request failed (${response.status})`);
  return body as T;
}

export const api = {
  health: () => request<{ ok: boolean; service: string; database: string; timestamp: string }>('/health'),
  login: async (identifier: string, password: string) => {
    const result = await request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, password }),
    });
    setAccessToken(result.token);
    return result.user;
  },
  me: () => request<{ user: ApiUser }>('/auth/me'),
  logout: async () => {
    try { await request('/auth/logout', { method: 'POST' }); } finally { setAccessToken(null); }
  },
  customers: () => request<{ items: unknown[] }>('/business/customers'),
  products: () => request<{ items: unknown[] }>('/business/products'),
  orders: () => request<{ items: unknown[] }>('/business/orders'),
  createCustomer: (payload: unknown) => request('/business/customers', { method: 'POST', body: JSON.stringify(payload) }),
  createProduct: (payload: unknown) => request('/business/products', { method: 'POST', body: JSON.stringify(payload) }),
  createOrder: (payload: unknown) => request('/business/orders', { method: 'POST', body: JSON.stringify(payload) }),
  createPayment: (payload: unknown) => request('/business/payments', { method: 'POST', body: JSON.stringify(payload) }),
};
