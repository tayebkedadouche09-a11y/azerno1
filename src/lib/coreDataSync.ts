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
  return loadCoreData();
}

export async function flushCoreCreateQueue() {
  if (!navigator.onLine) return { applied: 0, rejected: 0, remaining: offlineQueue.list().length };
  const pending = offlineQueue.list().filter(operation => operation.status !== 'failed');
  if (!pending.length) return { applied: 0, rejected: 0, remaining: 0 };

  const deviceId = getDeviceId();
  const operations = pending.map(operation => ({
    operationId: operation.id,
    entityType: operation.entity,
    operationType: operation.action,
    payload: operation.payload,
  }));

  try {
    const result = await api.syncPush(deviceId, operations);
    const accepted = new Set(result.accepted ?? []);
    const duplicates = new Set(result.duplicates ?? []);
    const rejected = new Map((result.rejected ?? []).map(item => [item.operationId, item.reason]));

    for (const operation of pending) {
      if (accepted.has(operation.id) || duplicates.has(operation.id)) {
        offlineQueue.remove(operation.id);
      } else if (rejected.has(operation.id)) {
        offlineQueue.update(operation.id, {
          status: 'failed',
          attempts: operation.attempts + 1,
          lastError: rejected.get(operation.id),
        });
      }
    }

    const applied = accepted.size + duplicates.size;
    if (applied) await refreshCoreData();
    return { applied, rejected: rejected.size, remaining: offlineQueue.list().length };
  } catch (error) {
    for (const operation of pending) {
      offlineQueue.update(operation.id, {
        status: 'pending',
        attempts: operation.attempts + 1,
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
    return { applied: 0, rejected: 0, remaining: offlineQueue.list().length };
  }
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
