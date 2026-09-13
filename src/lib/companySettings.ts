import { CompanySettings } from '../types';

const CACHE_KEY = 'azrnou_company_settings_cache_v1';
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

const defaults: CompanySettings = {
  name: 'AZRNOU Entreprise',
  slogan: '',
  phone: '',
  phoneSecondary: '',
  address: '',
  wilaya: '',
  email: '',
  nif: '',
  nis: '',
  rc: '',
  rib: '',
  currency: 'DZD / DA',
  documentPrefixes: {},
  documentCounters: {},
  defaultTerms: '',
  whatsappMessageTemplate: '',
};

function authHeaders(body = false) {
  const headers = new Headers();
  if (body) headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('azrnou_access_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export function getCachedCompanySettings(): CompanySettings {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Partial<CompanySettings>) };
  } catch {
    return { ...defaults };
  }
}

function cache(settings: CompanySettings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch { /* cache only */ }
}

export async function loadCompanySettings(): Promise<CompanySettings> {
  const response = await fetch(`${API_BASE}/business-core/company-settings`, { headers: authHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `API request failed (${response.status})`);
  const settings = { ...defaults, ...(body?.settings ?? {}) } as CompanySettings;
  cache(settings);
  return settings;
}

export async function saveCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
  const response = await fetch(`${API_BASE}/business-core/company-settings`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify({ settings }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `API request failed (${response.status})`);
  const saved = { ...defaults, ...(body?.settings ?? settings) } as CompanySettings;
  cache(saved);
  return saved;
}
