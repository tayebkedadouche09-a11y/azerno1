import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { offlineQueue, type QueueOperation } from '../../lib/offlineQueue';
import { api } from '../../lib/api';

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
        await (api as any).syncPull();
      }
      setLastSync(new Date().toISOString());
      setMessage('File actualisée — les opérations pending seront poussées par le moteur de sync');
    } catch (e: any) {
      setMessage(e?.message || 'Échec');
    } finally {
      refresh();
      setSyncing(false);
    }
  };

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const failed = items.filter((i) => i.status === 'failed');

  return (
    <div className="space-y-4 p-4 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Centre de synchronisation</h1>
          <p className="text-sm text-slate-500">File hors ligne et état serveur</p>
        </div>
        <button type="button" onClick={retryAll} disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Réessayer
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 text-sm col-span-2 sm:col-span-1">
          <div className="text-slate-500">Échecs</div>
          <div className="text-lg font-bold">{failed.length}</div>
        </div>
      </div>
      {lastSync && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          Dernière action : {new Date(lastSync).toLocaleString()}
        </p>
      )}
      {message && <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Opérations</h2>
        {items.length === 0 && (
          <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 p-6 text-center">
            Aucune opération en file
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{item.entity}/{item.action}</span>
              <span className="text-xs uppercase tracking-wide text-slate-500">{item.status}</span>
            </div>
            {item.lastError && (
              <p className="mt-1 text-xs text-amber-700 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {item.lastError}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">{item.createdAt} · tentatives {item.attempts}</p>
            {item.status === 'failed' && (
              <button type="button" className="mt-2 text-xs font-semibold text-teal-700"
                onClick={() => { offlineQueue.retry(item.id); refresh(); }}>
                Réessayer cette opération
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SyncCenter;
