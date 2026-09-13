import { dataRepository, DATA_CHANGED_EVENT } from './dataRepository';
import { getDeviceId } from './device';
import { api } from './api';
import { offlineQueue, type QueueOperation } from './offlineQueue';

export type CoreData = Awaited<ReturnType<typeof loadCoreData>>;
const PULL_CURSOR_KEY = 'azrnou_sync_pull_cursor_v1';
let flushInFlight: Promise<{ applied: number; rejected: number; remaining: number }> | null = null;
let pullInFlight: Promise<number> | null = null;

export async function loadCoreData() {
  const [customers, products, orders] = await Promise.all([dataRepository.customers(), dataRepository.products(), dataRepository.orders()]);
  return { customers: customers.items, products: products.items, orders: orders.items };
}
export async function refreshCoreData() { return loadCoreData(); }

function dependencyRank(operation: QueueOperation): number {
  const ranks: Record<string, number> = { customer:10, supplier:20, product:30, variant:40, order:50, expense:60, purchase:70, payment:80, production:90, production_completion:95, livestock_event:100, feed:100, return:100, waste:100 };
  return ranks[operation.entity] ?? 110;
}
function pendingOperations(): QueueOperation[] { return offlineQueue.list().filter(operation => operation.status !== 'failed').sort((a,b) => dependencyRank(a)-dependencyRank(b) || a.createdAt.localeCompare(b.createdAt)); }

async function flushQueueInternal() {
  if (!navigator.onLine) return { applied:0, rejected:0, remaining:offlineQueue.list().length };
  const pending = pendingOperations();
  if (!pending.length) return { applied:0, rejected:0, remaining:0 };
  const deviceId = getDeviceId(); let applied = 0, rejected = 0;
  for (const operation of pending) {
    offlineQueue.update(operation.id, { status:'syncing' });
    try {
      if (operation.entity === 'expense' && operation.action === 'create') {
        await api.createExpense({ ...(operation.payload as Record<string,unknown>), idempotencyKey:operation.id });
        offlineQueue.remove(operation.id); applied++; continue;
      }
      if (operation.entity === 'production_completion' && operation.action === 'create') {
        const payload = operation.payload as { batchId:string; outputVariantId:string };
        await api.completeProductionBatch(payload.batchId, payload.outputVariantId, operation.id);
        offlineQueue.remove(operation.id); applied++; continue;
      }
      const payload = operation.payload as { id?:string } | null;
      const result = await api.syncPush(deviceId, [{ operationId:operation.id, entityType:operation.entity, operationType:operation.action as 'create'|'update'|'delete', entityId:payload?.id ?? null, payload:operation.payload }]);
      if (result.accepted.includes(operation.id) || result.duplicates.includes(operation.id)) { offlineQueue.remove(operation.id); applied++; continue; }
      const failure = result.rejected.find(item => item.operationId === operation.id);
      if (failure) { offlineQueue.update(operation.id,{status:'failed',attempts:operation.attempts+1,lastError:failure.reason}); rejected++; break; }
      offlineQueue.update(operation.id,{status:'pending'}); break;
    } catch (error) {
      offlineQueue.update(operation.id,{status:'pending',attempts:operation.attempts+1,lastError:error instanceof Error ? error.message : String(error)}); break;
    }
  }
  if (applied) { await refreshCoreData(); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT)); }
  return { applied, rejected, remaining:offlineQueue.list().length };
}
export async function flushCoreCreateQueue() { if (flushInFlight) return flushInFlight; flushInFlight=flushQueueInternal().finally(()=>{flushInFlight=null;}); return flushInFlight; }
function getPullCursor() { return localStorage.getItem(PULL_CURSOR_KEY) ?? '1970-01-01T00:00:00.000Z'; }
function setPullCursor(value:string) { localStorage.setItem(PULL_CURSOR_KEY,value); }
export async function pullRemoteChanges() {
  if (!navigator.onLine) return 0; if (pullInFlight) return pullInFlight;
  pullInFlight=(async()=>{ let cursor=getPullCursor(), changed=0; try { for(let page=0;page<20;page++) { const result=await api.syncPull(getDeviceId(),cursor); changed+=result.items.length; cursor=result.nextSince||cursor; setPullCursor(cursor); if(!result.items.length || result.items.length<500) break; } if(changed) { await dataRepository.clearCache(); await refreshCoreData(); if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT)); } return changed; } finally { pullInFlight=null; }})();
  return pullInFlight;
}
export function startCoreDataSync(onRefresh?:()=>void) { const handleOnline=async()=>{ await flushCoreCreateQueue(); await pullRemoteChanges(); await refreshCoreData(); onRefresh?.(); }; window.addEventListener('online',handleOnline); if(navigator.onLine) void handleOnline(); return()=>window.removeEventListener('online',handleOnline); }
export { getDeviceId };
