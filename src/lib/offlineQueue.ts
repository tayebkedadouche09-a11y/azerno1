export type QueueOperation = {
  id: string;
  entity: string;
  action: string;
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  lastError?: string;
};

const KEY = 'azrnou_offline_queue_v2';

function read(): QueueOperation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueueOperation[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueueOperation[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const offlineQueue = {
  list(): QueueOperation[] {
    return read();
  },
  enqueue(entity: string, action: string, payload: unknown): QueueOperation {
    const operation: QueueOperation = {
      id: crypto.randomUUID(),
      entity,
      action,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
    };
    const items = read();
    items.push(operation);
    write(items);
    return operation;
  },
  update(id: string, patch: Partial<QueueOperation>) {
    write(read().map(item => item.id === id ? { ...item, ...patch } : item));
  },
  remove(id: string) {
    write(read().filter(item => item.id !== id));
  },
  retry(id: string) {
    const item = read().find(operation => operation.id === id);
    if (!item) return;
    write(read().map(operation => operation.id === id
      ? { ...operation, status: 'pending' as const, lastError: undefined }
      : operation));
  },
  retryFailed() {
    write(read().map(operation => operation.status === 'failed'
      ? { ...operation, status: 'pending' as const, lastError: undefined }
      : operation));
  },
  clear() {
    write([]);
  },
};
