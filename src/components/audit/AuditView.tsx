import React, { useState, useMemo } from 'react';
import { ScrollText, Search, User, Clock, ShieldCheck, Filter } from 'lucide-react';
import { db } from '../../lib/storage';
import { AuditLog } from '../../types';
import { formatDate } from '../../lib/utils';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => db.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return log.details.toLowerCase().includes(q) || log.userName.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, filterAction, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          <span>Journal d'Audit & Traçabilité des Opérations</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Historique immuable de chaque modification : commandes, encaissements, ajustements de stocks et fabrications
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par utilisateur, action ou détail..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'all', label: 'Toutes les actions' },
            { key: 'create_order', label: 'Commandes' },
            { key: 'record_payment', label: 'Paiements' },
            { key: 'adjust_stock', label: 'Stocks' },
            { key: 'create_batch', label: 'Fabrications' },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilterAction(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterAction === f.key
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs timeline list */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-700">
          <span>{filteredLogs.length} événements enregistrés</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Traçabilité active
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredLogs.map((log) => (
            <div key={log.id} className="py-3.5 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Par {log.userName}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">
                      {log.action}
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 shrink-0">
                {formatDate(log.timestamp, true)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
