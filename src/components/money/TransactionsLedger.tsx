import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileText,
  ShoppingBag,
  CreditCard,
  Banknote,
  Building2,
  X
} from 'lucide-react';
import { Expense, QuickSale, Order } from '../../types';
import { formatDZD, formatDate, triggerHaptic } from '../../lib/utils';

export interface UnifiedTransaction {
  id: string;
  type: 'revenue' | 'expense';
  subType: 'quick_sale' | 'order' | 'expense';
  date: string;
  createdAt: string;
  ref: string;
  title: string;
  details: string;
  amount: number; // positive for revenue, negative for expense
  paymentMethod: string;
}

interface TransactionsLedgerProps {
  expenses: Expense[];
  quickSales: QuickSale[];
  orders: Order[];
  periodStartDate: string;
  periodEndDate: string;
  periodLabel: string;
}

const ITEMS_PER_PAGE = 8;

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({
  expenses,
  quickSales,
  orders,
  periodStartDate,
  periodEndDate,
  periodLabel
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'period' | 'all' | 'today' | 'last7' | 'custom'>('period');
  const [customDate, setCustomDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Build unified transaction list
  const allTransactions = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    // 1. Quick Sales
    quickSales.forEach((s) => {
      const d = (s.date || s.createdAt || '').slice(0, 10);
      list.push({
        id: `qs-${s.id}`,
        type: 'revenue',
        subType: 'quick_sale',
        date: d,
        createdAt: s.createdAt || s.date,
        ref: s.saleNumber || 'VNT',
        title: `Vente Comptoir ${s.saleNumber || ''}`,
        details: `${s.items?.length || 1} article(s) · ${s.customerName || 'Client Comptoir'}`,
        amount: s.total || 0,
        paymentMethod: s.paymentMethod || 'cash'
      });
    });

    // 2. Orders (non-cancelled)
    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const d = (o.deliveryDate || o.createdAt || '').slice(0, 10);
      list.push({
        id: `ord-${o.id}`,
        type: 'revenue',
        subType: 'order',
        date: d,
        createdAt: o.createdAt || o.deliveryDate,
        ref: o.orderNumber || 'BC',
        title: `Commande Client ${o.orderNumber || ''}`,
        details: `Client : ${o.customerName || 'Client'}`,
        amount: o.total || 0,
        paymentMethod: o.paymentMethod || 'bank_transfer'
      });
    });

    // 3. Expenses
    expenses.forEach((e) => {
      const d = (e.date || e.createdAt || '').slice(0, 10);
      const desc = (e as any).description || e.notes || 'Dépense d\'exploitation';
      list.push({
        id: `exp-${e.id}`,
        type: 'expense',
        subType: 'expense',
        date: d,
        createdAt: e.createdAt || e.date,
        ref: `DEP-${e.id.slice(-5).toUpperCase()}`,
        title: desc,
        details: `Charge : ${e.category || 'Générale'} ${e.supplierName ? '· ' + e.supplierName : ''}`,
        amount: -(e.amount || 0),
        paymentMethod: e.paymentMethod || (e as any).paidVia || 'cash'
      });
    });

    // Sort descending by date & creation
    return list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [expenses, quickSales, orders]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 7 days ago
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      // 1. Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // 2. Date filter
      if (dateFilterMode === 'period') {
        if (t.date < periodStartDate || t.date > periodEndDate) {
          return false;
        }
      } else if (dateFilterMode === 'today') {
        if (t.date !== todayStr) return false;
      } else if (dateFilterMode === 'last7') {
        if (t.date < sevenDaysAgoStr || t.date > todayStr) return false;
      } else if (dateFilterMode === 'custom') {
        if (customDate && t.date !== customDate) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesRef = t.ref.toLowerCase().includes(q);
        const matchesDetails = t.details.toLowerCase().includes(q);
        if (!matchesTitle && !matchesRef && !matchesDetails) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, typeFilter, dateFilterMode, customDate, searchQuery, periodStartDate, periodEndDate, todayStr, sevenDaysAgoStr]);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, dateFilterMode, customDate, searchQuery]);

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Statistics for current filtered view
  const currentSummary = useMemo(() => {
    let rev = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'revenue') rev += t.amount;
      else exp += Math.abs(t.amount);
    });
    return { rev, exp, net: rev - exp };
  }, [filteredTransactions]);

  // Method icon & label
  const renderMethodBadge = (method: string) => {
    const isCash = method === 'cash';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
        {isCash ? (
          <>
            <Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Espèces</span>
          </>
        ) : (
          <>
            <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Virement / Banque</span>
          </>
        )}
      </span>
    );
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>Journal Détaillé des Dernières Transactions</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {totalItems} écriture(s)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historique consolidé des flux financiers : ventes directes, commandes et dépenses d'exploitation
          </p>
        </div>

        {/* Aggregate Mini Badges */}
        <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            + {formatDZD(currentSummary.rev)}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            - {formatDZD(currentSummary.exp)}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl self-start sm:self-auto flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Type :</span>
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setTypeFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tous les flux
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setTypeFilter('revenue');
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              typeFilter === 'revenue'
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revenus</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setTypeFilter('expense');
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              typeFilter === 'expense'
                ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
            <span>Dépenses</span>
          </button>
        </div>

        {/* Date Filter Pills & Custom Date */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDateFilterMode('period');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'period'
                  ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`Filtrer selon ${periodLabel}`}
            >
              Période active
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDateFilterMode('today');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDateFilterMode('last7');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'last7'
                  ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 jours
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDateFilterMode('all');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Date Picker for Exact Date */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                triggerHaptic();
                setCustomDate(e.target.value);
                if (e.target.value) setDateFilterMode('custom');
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            />
            {customDate && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setCustomDate('');
                  setDateFilterMode('period');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyword Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par référence, client, description de dépense ou mot-clé..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Transactions Table / List */}
      {currentItems.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Aucune transaction trouvée
          </p>
          <p className="text-xs text-slate-400">
            Modifiez vos filtres de type ou de date pour afficher des écritures.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/30">
          {currentItems.map((t) => {
            const isRev = t.type === 'revenue';
            return (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
              >
                {/* Left: Icon, Date, Title & Details */}
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isRev
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40'
                    }`}
                  >
                    {isRev ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">
                        {t.title}
                      </strong>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isRev
                            ? 'bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {isRev ? 'REVENU' : 'DÉPENSE'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        {t.ref}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                      <span>{formatDate(t.date)}</span>
                      <span>·</span>
                      <span>{t.details}</span>
                      <span>·</span>
                      {renderMethodBadge(t.paymentMethod)}
                    </div>
                  </div>
                </div>

                {/* Right: Amount */}
                <div className="text-left sm:text-right pl-12 sm:pl-0">
                  <span
                    className={`text-base font-black tracking-tight ${
                      isRev
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {isRev ? `+ ${formatDZD(t.amount)}` : `- ${formatDZD(Math.abs(t.amount))}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Affichage de{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {startIndex + 1}
            </strong>{' '}
            à{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}
            </strong>{' '}
            sur{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {totalItems}
            </strong>{' '}
            transactions
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
