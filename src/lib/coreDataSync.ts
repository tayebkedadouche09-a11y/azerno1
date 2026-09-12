import { dataRepository } from './dataRepository';
import { getDeviceId } from './device';
import { api } from './api';
import { offlineQueue } from './offlineQueue';

export type CoreData = Awaited<ReturnType<typeof loadCoreData>>;

export async function loadCoreData() {
  const [customers, products, orders] = await Promise.all([
    dataRepository.customers(),
    dataRepository.products(),
    dataRepository.orders(),
  ]);
  return { customers: customers.items, products: products.items, orders: orders.items };
}

export async function refreshCoreData() {
  if (!navigator.onLine) return loadCoreData();
  return loadCoreData();
}

export async function flushCoreCreateQueue() {
  if (!navigator.onLine) return { applied: 0, remaining: offlineQueue.list().length };

  const pending = offlineQueue.list().filter(operation => operation.status !== 'failed');
  let applied = 0;

  for (const operation of pending) {
    if (operation.action !== 'create') continue;
    try {
      if (operation.entity === 'customer') await api.createCustomer(operation.payload);
      else if (operation.entity === 'product') await api.createProduct(operation.payload);
      else if (operation.entity === 'order') await api.createOrder(operation.payload);
      else continue;
      offlineQueue.remove(operation.id);
      applied += 1;
    } catch (error) {
      offlineQueue.update(operation.id, {
        status: 'failed',
        attempts: operation.attempts + 1,
        lastError: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  if (applied) await loadCoreData();
  return { applied, remaining: offlineQueue.list().length };
}

export function startCoreDataSync(onRefresh?: () => void) {
  const handleOnline = async () => {
    await flushCoreCreateQueue();
    await refreshCoreData();
    onRefresh?.();
  };

  window.addEventListener('online', handleOnline);
  if (navigator.onLine) void handleOnline();

  return () => window.removeEventListener('online', handleOnline);
}

export { getDeviceId };
