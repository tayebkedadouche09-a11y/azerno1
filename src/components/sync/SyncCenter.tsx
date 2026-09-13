import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { offlineQueue, type QueueOperation } from '../../lib/offlineQueue';
import { api } from '../../lib/api';

function payloadPreview(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.slice(0, 400);
  try {
    return JSON.stringify(payload).slice(0, 400);
  } catch {
    return String(payload).slice(0, 400);
  }
}

export function SyncCenter() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [items, setItems] = useState<QueueOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setItems(offlineQueue.list());
  }, []);

  useEffect(() => {
    refresh();
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const t = setInterval(refresh, 4000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(t);
    };
  }, [refresh]);

  const retryAll = async () => {
    setSyncing(true);
    setMessage(null);
    offlineQueue.retryFailed();
    try {
      if (online && typeof (api as any).syncPull === 'function') {
        await (api as any).syncPull('default-device', new Date(0).toISOString());
      }
      setLastSync(new Date().toISOString());
      setMessage('File actualisee');
    } catch (e: any) {
      setMessage(e?.message || 'Echec');
    } finally {
      refresh();
      setSyncing(false);
    }
  };

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const conflicts = items.filter((i) => i.status === 'conflict' || i.status === 'rejected');
  const failed = items.filter((i) => i.status === 'failed');

  return (
    <div className="space-y-4 p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Centre de synchronisation</h1>
          <p className="text-sm text-slate-500">File hors ligne et etat serveur</p>
        </div>
        <button type="button" onClick={retryAll} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Reessayer tout
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium">
            {online ? <Cloud className="w-4 h-4 text-teal-600" /> : <CloudOff className="w-4 h-4 text-amber-600" />}
            {online ? 'En ligne' : 'Hors ligne'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 text-sm">
          <div className="text-slate-500">En attente</div>
          <div className="text-lg font-bold">{pending.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 text-sm">
          <div className="text-slate-500">Echecs</div>
          <div className="text-lg font-bold">{failed.length}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 p-4 bg-amber-50 dark:bg-amber-950/30 text-sm">
          <div className="text-amber-700 dark:text-amber-300">Conflits</div>
          <div className="text-lg font-bold text-amber-800 dark:text-amber-200">{conflicts.length}</div>
        </div>
      </div>
      {lastSync && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          Derniere action : {new Date(lastSync).toLocaleString()}
        </p>
      )}
      {message && <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Operations</h2>
        {items.length === 0 && (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 p-6 text-center">Aucune operation en file</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium break-all">{item.entity}/{item.action}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500 shrink-0">{item.status}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono break-all">id: {item.id}</p>
            {(item.status === 'conflict' || item.status === 'rejected' || item.status === 'failed') && item.payload != null && (
              <pre className="mt-2 max-h-28 overflow-auto text-[10px] bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-left whitespace-pre-wrap">{payloadPreview(item.payload)}</pre>
            )}
            {item.lastError && (
              <p className="mt-1 text-xs text-amber-700 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{item.lastError}</span>
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">{item.createdAt} · tentatives {item.attempts}</p>
            {(item.status === 'failed' || item.status === 'conflict' || item.status === 'rejected') && (
              <button type="button" className="mt-2 min-h-[40px] text-xs font-semibold text-teal-700" onClick={() => { offlineQueue.retry(item.id); refresh(); }}>
                Reessayer cette operation
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SyncCenter;
