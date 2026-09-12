import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { getDeviceId } from '../../lib/device';
import { offlineQueue } from '../../lib/offlineQueue';
import { flushCoreCreateQueue } from '../../lib/coreDataSync';

export const SyncStatusPill: React.FC = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(() => offlineQueue.list().length);
  const [failed, setFailed] = useState(() => offlineQueue.list().filter(item => item.status === 'failed').length);
  const [rejected, setRejected] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const refresh = async () => {
    setOnline(navigator.onLine);
    const queue = offlineQueue.list();
    setPending(queue.length);
    setFailed(queue.filter(item => item.status === 'failed').length);
    if (!navigator.onLine) return;
    try {
      const status = await api.syncStatus(getDeviceId());
      setRejected(Number(status.rejected ?? 0));
    } catch {}
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    const onlineHandler = () => void refresh();
    const offlineHandler = () => void refresh();
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }, []);

  const retryFailed = async () => {
    if (!navigator.onLine || retrying) return;
    setRetrying(true);
    try {
      offlineQueue.retryFailed();
      await flushCoreCreateQueue();
    } finally {
      setRetrying(false);
      await refresh();
    }
  };

  if (!online) return <div className="fixed bottom-20 lg:bottom-4 right-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900 text-white shadow-lg text-[11px] font-bold"><CloudOff className="w-3.5 h-3.5" />Hors ligne{pending > 0 && ` · ${pending} en attente`}</div>;

  if (failed > 0 || rejected > 0) {
    return <div className="fixed bottom-20 lg:bottom-4 right-4 z-[60] z-[60] flex items-center gap-2 px-3 py-2 rounded-full bg-amber-100 text-amber-900 shadow-lg text-[11px] font-bold">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{failed > 0 ? `${failed} opération(s) en échec` : `${rejected} opération(s) à vérifier`}</span>
      {failed > 0 && <button type="button" onClick={() => void retryFailed()} disabled={retrying} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900 text-white disabled:opacity-60">
        <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
        Réessayer
      </button>}
    </div>;
  }

  if (pending > 0) return <div className="fixed bottom-20 lg:bottom-4 right-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-100 text-blue-800 shadow-lg text-[11px] font-bold"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Synchronisation · {pending}</div>;
  return <div className="fixed bottom-20 lg:bottom-4 right-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-100 text-emerald-800 shadow-lg text-[11px] font-bold"><Cloud className="w-3.5 h-3.5" />Synchronisé</div>;
};
