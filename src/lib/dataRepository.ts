import { api } from './api';
import { offlineQueue } from './offlineQueue';

type CacheKey = 'customers' | 'products' | 'orders';
type RecordMap = Record<string, unknown>;

const CACHE_PREFIX = 'azrnou_api_cache_v1:';

function cacheKey(key: CacheKey) { return `${CACHE_PREFIX}${key}`; }

function readCache<T extends RecordMap[]>(key: CacheKey): T {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    return raw ? JSON.parse(raw) as T : [] as T;
  } catch {
    return [] as T;
  }
}

function writeCache(key: CacheKey, items: RecordMap[]) {
  try { localStorage.setItem(cacheKey(key), JSON.stringify(items)); } catch { /* cache is best effort */ }
}

function isOfflineError(error: unknown) {
  return !navigator.onLine || error instanceof TypeError || /network|failed to fetch|offline|fetch/i.test(error instanceof Error ? error.message : String(error));
}

async function read<T extends RecordMap[]>(key: CacheKey, loader: () => Promise<{ items: T }>): Promise<{ items: T; source: 'api' | 'cache' }> {
  if (navigator.onLine) {
    try {
      const result = await loader();
      writeCache(key, result.items);
      return { items: result.items, source: 'api' };
    } catch (error) {
      if (!isOfflineError(error)) throw error;
    }
  }
  return { items: readCache<T>(key), source: 'cache' };
}

async function createWithFallback(
  key: CacheKey,
  entity: 'customer' | 'product' | 'order',
  payload: RecordMap,
  creator: () => Promise<RecordMap>,
) {
  if (navigator.onLine) {
    try {
      const created = await creator();
      const items = readCache<RecordMap[]>(key);
      writeCache(key, [created, ...items]);
      return { item: created, source: 'api' as const, queued: false };
    } catch (error) {
      if (!isOfflineError(error)) throw error;
    }
  }

  const localId = `${entity}_offline_${crypto.randomUUID()}`;
  const localItem = { ...payload, id: localId, _offline: true, created_at: new Date().toISOString() };
  const items = readCache<RecordMap[]>(key);
  writeCache(key, [localItem, ...items]);
  await offlineQueue.enqueue({
    entity,
    action: 'create',
    payload: { ...payload, clientId: localId },
  });
  return { item: localItem, source: 'cache' as const, queued: true };
}

export const dataRepository = {
  customers: () => read('customers', api.customers),
  products: () => read('products', api.products),
  orders: () => read('orders', api.orders),
  createCustomer: (payload: RecordMap) => createWithFallback('customers', 'customer', payload, () => api.createCustomer(payload) as Promise<RecordMap>),
  createProduct: (payload: RecordMap) => createWithFallback('products', 'product', payload, () => api.createProduct(payload) as Promise<RecordMap>),
  createOrder: (payload: RecordMap) => createWithFallback('orders', 'order', payload, () => api.createOrder(payload) as Promise<RecordMap>),
  clearCache: () => {
    (['customers', 'products', 'orders'] as CacheKey[]).forEach(key => localStorage.removeItem(cacheKey(key)));
  },
};

export type DataRepository = typeof dataRepository;
