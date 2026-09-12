import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Download, Loader2, Plus, RefreshCw, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { offlineQueue } from '../../lib/offlineQueue';
import { triggerHaptic, formatDZD, formatDate } from '../../lib/utils';
import { downloadFinancialReportPDF, FinancialReportData } from '../../lib/pdfGenerator';
import { db } from '../../lib/storage';

export type PeriodFilterType = 'month' | 'quarter' | 'year' | 'all';

type FinanceRow = Record<string, unknown>;

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const money = (value: unknown) => formatDZD(Number(value ?? 0));
const dateValue = (value: unknown) => String(value ?? '').slice(0, 10);

export const MoneyView: React.FC = () => {
  const now = useMemo(() => new Date(), []);
  const [periodType, setPeriodType] = useState<PeriodFilterType>('month');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [expenses, setExpenses] = useState<FinanceRow[]>([]);
  const [purchases, setPurchases] = useState<FinanceRow[]>([]);
  const [summary, setSummary] = useState<FinanceRow | null>(null);
  const [cashSummary, setCashSummary] = useState<FinanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('feed');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [offlineExpenseCount, setOfflineExpenseCount] = useState(0);

  const periodInfo = useMemo(() => {
    if (periodType === 'all') return { label: 'Historique complet', start: '1970-01-01', end: '2999-12-31' };
    if (periodType === 'year') return { label: `Année ${selectedYear}`, start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
    if (periodType === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      const endMonth = startMonth + 2;
      const endDay = new Date(selectedYear, endMonth + 1, 0).getDate();
      return {
        label: `T${selectedQuarter} ${selectedYear}`,
        start: `${selectedYear}-${String(startMonth + 1).padStart(2, '0')}-01`,
        end: `${selectedYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
      };
    }
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return {
      label: `${MONTHS_FR[selectedMonth]} ${selectedYear}`,
      start: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`,
      end: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  const loadFinance = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true); else setRefreshing(true);
      setError('');
      const [nextSummary, nextExpenses, nextPurchases, nextCash] = await Promise.all([
        api.reportSummary(periodInfo.start, periodInfo.end),
        api.expenses(),
        api.purchases(),
        api.cashSummary(),
      ]);
      setSummary(nextSummary);
      setExpenses(nextExpenses.items ?? []);
      setPurchases(nextPurchases.items ?? []);
      setCashSummary(nextCash);
      localStorage.setItem('azrnou_finance_cache_v1', JSON.stringify({ summary: nextSummary, expenses: nextExpenses.items ?? [], purchases: nextPurchases.items ?? [], cash: nextCash, cachedAt: new Date().toISOString() }));
    } catch (e) {
      try {
        const cached = JSON.parse(localStorage.getItem('azrnou_finance_cache_v1') ?? 'null');
        if (cached) {
          setSummary(cached.summary ?? null);
          setExpenses(cached.expenses ?? []);
          setPurchases(cached.purchases ?? []);
          setCashSummary(cached.cash ?? null);
          setError('Mode hors ligne : dernières données financières synchronisées affichées.');
        } else {
          setError(e instanceof Error ? e.message : 'Impossible de charger les finances.');
        }
      } catch {
        setError(e instanceof Error ? e.message : 'Impossible de charger les finances.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setOfflineExpenseCount(offlineQueue.list().filter(x => x.entity === 'expense' && x.action === 'create' && x.status !== 'failed').length);
    }
  }, [periodInfo]);

  useEffect(() => { void loadFinance(); }, [loadFinance]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const d = dateValue(e.expense_date ?? e.date ?? e.created_at);
    return periodType === 'all' || (d >= periodInfo.start && d <= periodInfo.end);
  }), [expenses, periodInfo, periodType]);

  const expenseTotal = useMemo(() => filteredExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0), [filteredExpenses]);
  const revenue = Number(summary?.sales && (summary.sales as FinanceRow).revenue ?? 0);
  const cost = Number(summary?.sales && (summary.sales as FinanceRow).cost ?? 0);
  const gross = Number(summary?.sales && (summary.sales as FinanceRow).grossMargin ?? revenue - cost);
  const net = Number(summary?.netProfit ?? gross - Number(summary?.expenses ?? expenseTotal));
  const incoming = Number(cashSummary?.incoming ?? 0);
  const purchasesPaid = Number(cashSummary?.purchases_paid ?? 0);
  const cashExpenses = Number(cashSummary?.expenses ?? 0);

  const changePeriod = (direction: -1 | 1) => {
    triggerHaptic();
    if (periodType === 'month') {
      const next = new Date(selectedYear, selectedMonth + direction, 1);
      setSelectedYear(next.getFullYear());
      setSelectedMonth(next.getMonth());
    } else if (periodType === 'quarter') {
      const q = selectedQuarter + direction;
      if (q < 1) { setSelectedQuarter(4); setSelectedYear(y => y - 1); }
      else if (q > 4) { setSelectedQuarter(1); setSelectedYear(y => y + 1); }
      else setSelectedQuarter(q);
    } else if (periodType === 'year') setSelectedYear(y => y + direction);
  };

  const createExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSavingExpense(true);
    const payload = {
      id: crypto.randomUUID(),
      category: expenseCategory,
      amount,
      date: new Date().toISOString().slice(0, 10),
      note: expenseNote.trim() || 'Dépense d’exploitation',
    };
    try {
      if (!navigator.onLine) throw new Error('offline');
      await api.createExpense({ ...payload, idempotencyKey: payload.id });
    } catch {
      offlineQueue.enqueue('expense', 'create', payload);
    } finally {
      setSavingExpense(false);
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseNote('');
      setOfflineExpenseCount(offlineQueue.list().filter(x => x.entity === 'expense' && x.action === 'create').length);
      triggerHaptic();
      void loadFinance(true);
    }
  };

  const exportPDF = async () => {
    try {
      const settings = db.getSettings();
      const data: FinancialReportData = {
        periodMonth: periodInfo.label,
        generationDate: new Date().toISOString(),
        quickSalesRevenue: 0,
        ordersRevenue: revenue,
        totalRevenue: revenue,
        quickSalesCOGS: 0,
        ordersCOGS: cost,
        totalCOGS: cost,
        quickSalesGrossMargin: 0,
        ordersGrossMargin: gross,
        grossMargin: gross,
        grossMarginPercent: revenue > 0 ? Math.round((gross / revenue) * 100) : 0,
        totalExpenses: Number(summary?.expenses ?? expenseTotal),
        expensesByCategory: Object.entries(filteredExpenses.reduce<Record<string, number>>((acc, item) => {
          const key = String(item.category ?? 'other');
          acc[key] = (acc[key] ?? 0) + Number(item.amount ?? 0);
          return acc;
        }, {})).map(([category, amount]) => ({ category, label: category, amount, percentage: expenseTotal > 0 ? Math.round(amount / expenseTotal * 1000) / 10 : 0 })),
        netProfit: net,
        netMarginPercent: revenue > 0 ? Math.round(net / revenue * 100) : 0,
        cashBalance: incoming - cashExpenses,
        bankBalance: 0,
        totalTreasury: incoming - cashExpenses,
      };
      downloadFinancialReportPDF(data, settings);
      triggerHaptic();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Wallet className="w-6 h-6 text-emerald-700" /> Finances & Trésorerie</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Source de vérité PostgreSQL • dépenses, achats, ventes et trésorerie</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadFinance(true)} disabled={refreshing} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold text-sm"><RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />Actualiser</button>
          <button onClick={() => void exportPDF()} className="px-3 py-2 rounded-xl bg-emerald-800 text-white font-semibold text-sm"><Download className="w-4 h-4 inline mr-1" />PDF</button>
          <button onClick={() => setShowExpenseModal(true)} className="px-3 py-2 rounded-xl bg-amber-700 text-white font-bold text-sm"><Plus className="w-4 h-4 inline mr-1" />Nouvelle dépense</button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
      {offlineExpenseCount > 0 && <div className="rounded-2xl border border-blue-200 bg-blue-50 text-blue-900 px-4 py-3 text-sm">{offlineExpenseCount} dépense(s) en attente de synchronisation. Elles seront envoyées automatiquement au retour du réseau.</div>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900 p-2">
        {(['month','quarter','year','all'] as PeriodFilterType[]).map(type => <button key={type} onClick={() => setPeriodType(type)} className={`px-3 py-2 rounded-xl text-sm font-semibold ${periodType === type ? 'bg-white dark:bg-slate-700 shadow text-emerald-800' : 'text-slate-500'}`}>{type === 'month' ? 'Mois' : type === 'quarter' ? 'Trimestre' : type === 'year' ? 'Année' : 'Tout'}</button>)}
        {periodType !== 'all' && <>
          <button onClick={() => changePeriod(-1)} className="px-2 py-2 rounded-xl bg-white dark:bg-slate-800">‹</button>
          <span className="px-2 text-sm font-bold flex items-center gap-1"><CalendarDays className="w-4 h-4" />{periodInfo.label}</span>
          <button onClick={() => changePeriod(1)} className="px-2 py-2 rounded-xl bg-white dark:bg-slate-800">›</button>
        </>}
      </div>

      {loading ? <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" />Chargement des finances…</div> : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['CA', revenue], ['Coût des ventes', cost], ['Marge brute', gross], ['Dépenses', Number(summary?.expenses ?? expenseTotal)], ['Résultat net', net],
          ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-xl font-black mt-2">{money(value)}</p></div>)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800"><h2 className="font-bold">Dépenses réelles</h2><p className="text-xs text-slate-500 mt-1">Données provenant de PostgreSQL</p></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-auto">
              {filteredExpenses.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucune dépense sur cette période.</p> : filteredExpenses.map((expense, index) => <div key={String(expense.id ?? index)} className="p-4 flex items-center justify-between gap-4"><div><p className="font-semibold text-sm">{String(expense.note ?? expense.category ?? 'Dépense')}</p><p className="text-xs text-slate-500">{String(expense.category ?? 'other')} • {formatDate(dateValue(expense.expense_date ?? expense.date ?? expense.created_at))}</p></div><strong className="text-amber-700">{money(expense.amount)}</strong></div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800"><h2 className="font-bold">Trésorerie cumulée</h2><p className="text-xs text-slate-500 mt-1">Calculée depuis les paiements, dépenses et achats payés</p></div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Encaissements</p><p className="font-black mt-1">{money(incoming)}</p></div>
              <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Dépenses</p><p className="font-black mt-1">{money(cashExpenses)}</p></div>
              <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs text-blue-700">Achats payés</p><p className="font-black mt-1">{money(purchasesPaid)}</p></div>
              <div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-600">Flux net</p><p className="font-black mt-1">{money(incoming - cashExpenses - purchasesPaid)}</p></div>
            </div>
            <div className="px-5 pb-5 text-xs text-slate-500">Les soldes de caisse/bank historiques locaux ne sont plus utilisés comme source de vérité.</div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"><div><h2 className="font-bold">Achats fournisseurs</h2><p className="text-xs text-slate-500 mt-1">Réception et coûts enregistrés côté serveur</p></div><span className="text-sm font-bold">{purchases.length} achats</span></div>
          <div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50"><tr><th className="text-left p-3">N°</th><th className="text-left p-3">Fournisseur</th><th className="text-left p-3">Date</th><th className="text-right p-3">Total</th><th className="text-right p-3">Payé</th></tr></thead><tbody>{purchases.filter(p => periodType === 'all' || (dateValue(p.purchase_date ?? p.created_at) >= periodInfo.start && dateValue(p.purchase_date ?? p.created_at) <= periodInfo.end)).map((purchase, index) => <tr key={String(purchase.id ?? index)} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-semibold">{String(purchase.number ?? '—')}</td><td className="p-3">{String(purchase.supplier_name ?? 'Sans fournisseur')}</td><td className="p-3">{formatDate(dateValue(purchase.purchase_date ?? purchase.created_at))}</td><td className="p-3 text-right font-semibold">{money(purchase.total)}</td><td className="p-3 text-right">{money(purchase.paid_total)}</td></tr>)}</tbody></table></div>
        </section>
      </>}

      {showExpenseModal && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form onSubmit={createExpense} className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Nouvelle dépense</h2><button type="button" onClick={() => setShowExpenseModal(false)}>✕</button></div><select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full rounded-xl border p-3"><option value="feed">Alimentation & fourrage</option><option value="veterinary">Vétérinaire</option><option value="raw_materials">Matières premières</option><option value="packaging">Emballages</option><option value="energy">Énergie</option><option value="labor">Main d’œuvre</option><option value="maintenance">Maintenance</option><option value="transport">Transport</option><option value="other">Autre</option></select><input required min="0.01" type="number" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="Montant (DZD)" className="w-full rounded-xl border p-3" /><textarea value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Description / note" className="w-full rounded-xl border p-3 min-h-24" /><div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100">Annuler</button><button disabled={savingExpense} className="px-4 py-2 rounded-xl bg-amber-700 text-white font-bold">{savingExpense ? 'Enregistrement…' : 'Enregistrer'}</button></div></form></div>}
    </div>
  );
};

export default MoneyView;
