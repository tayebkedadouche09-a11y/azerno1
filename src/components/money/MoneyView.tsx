import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, Plus, TrendingDown, TrendingUp, DollarSign,
  Receipt, CheckCircle2, AlertTriangle, Calendar, Download, FileText,
  ChevronLeft, ChevronRight, CalendarDays, Filter
} from 'lucide-react';
import { db } from '../../lib/storage';
import { Expense, CashRegister } from '../../types';
import { formatDZD, formatDate, triggerHaptic } from '../../lib/utils';
import { downloadFinancialReportPDF, FinancialReportData } from '../../lib/pdfGenerator';
import { MonthlyTrendsChart } from './MonthlyTrendsChart';
import { RealTimeKpiCards } from './RealTimeKpiCards';
import { BudgetAlertBanner } from './BudgetAlertBanner';
import { ExpenseCategoryPieChart } from './ExpenseCategoryPieChart';
import { TransactionsLedger } from './TransactionsLedger';

export type PeriodFilterType = 'month' | 'quarter' | 'year' | 'all';

const MONTHS_FR = [
  { value: 0, label: 'Janvier', short: 'Jan' },
  { value: 1, label: 'Février', short: 'Fév' },
  { value: 2, label: 'Mars', short: 'Mar' },
  { value: 3, label: 'Avril', short: 'Avr' },
  { value: 4, label: 'Mai', short: 'Mai' },
  { value: 5, label: 'Juin', short: 'Juin' },
  { value: 6, label: 'Juillet', short: 'Juil' },
  { value: 7, label: 'Août', short: 'Août' },
  { value: 8, label: 'Septembre', short: 'Sep' },
  { value: 9, label: 'Octobre', short: 'Oct' },
  { value: 10, label: 'Novembre', short: 'Nov' },
  { value: 11, label: 'Décembre', short: 'Déc' },
];

const QUARTERS_FR = [
  { value: 1, label: 'Trimestre 1', short: 'T1', period: 'Jan - Mar', startMonth: 0, endMonth: 2, endDay: 31 },
  { value: 2, label: 'Trimestre 2', short: 'T2', period: 'Avr - Juin', startMonth: 3, endMonth: 5, endDay: 30 },
  { value: 3, label: 'Trimestre 3', short: 'T3', period: 'Juil - Sep', startMonth: 6, endMonth: 8, endDay: 30 },
  { value: 4, label: 'Trimestre 4', short: 'T4', period: 'Oct - Déc', startMonth: 9, endMonth: 11, endDay: 31 },
];

export const MoneyView: React.FC = () => {
  const [cashRegister, setCashRegister] = useState<CashRegister>(() => db.getCashRegister());
  const [expenses, setExpenses] = useState<Expense[]>(() => db.getExpenses());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [stateTick, setStateTick] = useState(0);

  // Provisional Monthly Budget State (persisted locally)
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('azrnou_v1_monthly_expense_budget');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {}
    return 40000; // 40,000 DA default
  });

  const handleUpdateBudget = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    try {
      localStorage.setItem('azrnou_v1_monthly_expense_budget', String(newBudget));
    } catch (e) {}
  };

  // Period Filter State
  const now = useMemo(() => new Date(), []);
  const [periodType, setPeriodType] = useState<PeriodFilterType>('month');
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(() => Math.floor(now.getMonth() / 3) + 1);

  // Dynamic available years list based on records & defaults
  const availableYears = useMemo(() => {
    const years = new Set<number>([now.getFullYear(), 2026, 2025, 2024]);
    expenses.forEach(e => {
      if (e.date) {
        const y = parseInt(e.date.slice(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    const state = db.getState();
    (state.quickSales || []).forEach(s => {
      const y = parseInt((s.date || s.createdAt || '').slice(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    });
    (state.orders || []).forEach(o => {
      const y = parseInt((o.deliveryDate || o.createdAt || '').slice(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses, now]);

  // Period Information & Range Bounds
  const periodInfo = useMemo(() => {
    if (periodType === 'all') {
      return {
        label: 'Historique Complet',
        shortLabel: 'Global',
        dateRangeText: 'Toutes les dates enregistrées',
        startDate: '1970-01-01',
        endDate: '2099-12-31'
      };
    }

    if (periodType === 'year') {
      return {
        label: `Exercice Annuel ${selectedYear}`,
        shortLabel: `Année ${selectedYear}`,
        dateRangeText: `01/01/${selectedYear} au 31/12/${selectedYear}`,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
      };
    }

    if (periodType === 'quarter') {
      const q = QUARTERS_FR.find(item => item.value === selectedQuarter) || QUARTERS_FR[2];
      const startM = String(q.startMonth + 1).padStart(2, '0');
      const endM = String(q.endMonth + 1).padStart(2, '0');
      return {
        label: `${q.label} ${selectedYear} (${q.period})`,
        shortLabel: `${q.short} ${selectedYear}`,
        dateRangeText: `01/${startM}/${selectedYear} au ${q.endDay}/${endM}/${selectedYear}`,
        startDate: `${selectedYear}-${startM}-01`,
        endDate: `${selectedYear}-${endM}-${q.endDay}`
      };
    }

    // Default: month
    const m = MONTHS_FR[selectedMonth] || MONTHS_FR[now.getMonth()];
    const startM = String(selectedMonth + 1).padStart(2, '0');
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return {
      label: `${m.label} ${selectedYear}`,
      shortLabel: `${m.short} ${selectedYear}`,
      dateRangeText: `01/${startM}/${selectedYear} au ${lastDay}/${startM}/${selectedYear}`,
      startDate: `${selectedYear}-${startM}-01`,
      endDate: `${selectedYear}-${startM}-${String(lastDay).padStart(2, '0')}`
    };
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, now]);

  // Unique key identifying the active period configuration for fluid animations
  const periodKey = useMemo(() => {
    if (periodType === 'all') return 'all';
    if (periodType === 'year') return `year-${selectedYear}`;
    if (periodType === 'quarter') return `quarter-${selectedYear}-Q${selectedQuarter}`;
    return `month-${selectedYear}-${selectedMonth}`;
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  // Helper date checker
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (periodType === 'all') return true;
    const d = dateStr.slice(0, 10);
    return d >= periodInfo.startDate && d <= periodInfo.endDate;
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => isDateInPeriod(e.date || e.createdAt));
  }, [expenses, periodInfo]);

  // Expense form
  const [expenseCat, setExpenseCat] = useState<any>('feed');
  const [expenseAmount, setExpenseAmount] = useState<number>(5000);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<'cash' | 'bank_transfer'>('cash');

  // Close form
  const [countedCash, setCountedCash] = useState<number>(cashRegister.cashBalance);
  const [closeNotes, setCloseNotes] = useState('');

  const refresh = () => {
    setCashRegister({ ...db.getCashRegister() });
    setExpenses([...db.getExpenses()]);
    setStateTick(t => t + 1);
  };

  // Quick preset shortcuts
  const selectCurrentMonth = () => {
    triggerHaptic();
    setPeriodType('month');
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const selectPreviousMonth = () => {
    triggerHaptic();
    setPeriodType('month');
    if (now.getMonth() === 0) {
      setSelectedMonth(11);
      setSelectedYear(now.getFullYear() - 1);
    } else {
      setSelectedMonth(now.getMonth() - 1);
      setSelectedYear(now.getFullYear());
    }
  };

  const selectCurrentQuarter = () => {
    triggerHaptic();
    setPeriodType('quarter');
    setSelectedQuarter(Math.floor(now.getMonth() / 3) + 1);
    setSelectedYear(now.getFullYear());
  };

  const selectCurrentYear = () => {
    triggerHaptic();
    setPeriodType('year');
    setSelectedYear(now.getFullYear());
  };

  const selectAllTime = () => {
    triggerHaptic();
    setPeriodType('all');
  };

  // Navigation chevrons
  const handlePrev = () => {
    triggerHaptic();
    if (periodType === 'month') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(y => y - 1);
      } else {
        setSelectedMonth(m => m - 1);
      }
    } else if (periodType === 'quarter') {
      if (selectedQuarter === 1) {
        setSelectedQuarter(4);
        setSelectedYear(y => y - 1);
      } else {
        setSelectedQuarter(q => q - 1);
      }
    } else if (periodType === 'year') {
      setSelectedYear(y => y - 1);
    }
  };

  const handleNext = () => {
    triggerHaptic();
    if (periodType === 'month') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(y => y + 1);
      } else {
        setSelectedMonth(m => m + 1);
      }
    } else if (periodType === 'quarter') {
      if (selectedQuarter === 4) {
        setSelectedQuarter(1);
        setSelectedYear(y => y + 1);
      } else {
        setSelectedQuarter(q => q + 1);
      }
    } else if (periodType === 'year') {
      setSelectedYear(y => y + 1);
    }
  };

  const handleExportFinancialPDF = () => {
    try {
      setIsExportingPDF(true);
      triggerHaptic();
      const settings = db.getSettings();
      const state = db.getState();

      const quickSales = (state.quickSales || []).filter(s => isDateInPeriod(s.date || s.createdAt));
      const activeOrders = (state.orders || []).filter(o => o.status !== 'cancelled' && isDateInPeriod(o.deliveryDate || o.createdAt));
      const currentExpenses = filteredExpenses;

      const periodMonth = periodInfo.label;

      // Revenues and COGS calculations
      const quickSalesRevenue = quickSales.reduce((acc, s) => acc + s.total, 0);
      const quickSalesCOGS = quickSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
      const quickSalesGrossMargin = quickSalesRevenue - quickSalesCOGS;

      const ordersRevenue = activeOrders.reduce((acc, o) => acc + o.total, 0);
      const ordersCOGS = activeOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);
      const ordersGrossMargin = ordersRevenue - ordersCOGS;

      const totalRevenue = quickSalesRevenue + ordersRevenue;
      const totalCOGS = quickSalesCOGS + ordersCOGS;
      const grossMargin = totalRevenue - totalCOGS;
      const grossMarginPercent = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;

      const totalExp = currentExpenses.reduce((acc, e) => acc + e.amount, 0);
      const netProfit = grossMargin - totalExp;
      const netMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

      // Expenses categorized
      const catLabels: Record<string, string> = {
        feed: 'Alimentation & Fourrage Bétail',
        veterinary: 'Soins Vétérinaires & Traitements',
        raw_materials: 'Lait Collecté & Matières Premières',
        milk: 'Achat de Lait & Matières',
        packaging: 'Emballages, Moules & Étiquettes',
        energy: 'Électricité, Gaz & Énergie Frigorifique',
        electricity: 'Électricité & Énergie Frigorifique',
        labor: 'Salaires & Main d\'œuvre',
        salaries: 'Salaires & Main d\'œuvre',
        maintenance: 'Entretien & Réparation Matériel',
        transport: 'Transport, Logistique & Carburant',
        other: 'Charges Diverses & Administratives'
      };

      const catSums: Record<string, number> = {};
      currentExpenses.forEach(e => {
        catSums[e.category] = (catSums[e.category] || 0) + e.amount;
      });

      const expensesByCategory = Object.entries(catSums).map(([cat, amount]) => ({
        category: cat,
        label: catLabels[cat] || cat,
        amount,
        percentage: totalExp > 0 ? Math.round((amount / totalExp) * 1000) / 10 : 0
      })).sort((a, b) => b.amount - a.amount);

      if (expensesByCategory.length === 0) {
        expensesByCategory.push({
          category: 'other',
          label: `Aucune charge enregistrée pour ${periodInfo.label}`,
          amount: 0,
          percentage: 0
        });
      }

      const reportData: FinancialReportData = {
        periodMonth,
        generationDate: now.toISOString(),
        quickSalesRevenue,
        ordersRevenue,
        totalRevenue,
        quickSalesCOGS,
        ordersCOGS,
        totalCOGS,
        quickSalesGrossMargin,
        ordersGrossMargin,
        grossMargin,
        grossMarginPercent,
        totalExpenses: totalExp,
        expensesByCategory,
        netProfit,
        netMarginPercent,
        cashBalance: cashRegister.cashBalance,
        bankBalance: cashRegister.bankBalance,
        totalTreasury: cashRegister.cashBalance + cashRegister.bankBalance
      };

      downloadFinancialReportPDF(reportData, settings);
      db.createAuditLog('EXPORT_FINANCIAL_REPORT', 'Money', `Export PDF du rapport financier (${periodMonth}) : CA ${formatDZD(totalRevenue)}, Marge ${formatDZD(grossMargin)}`);
    } catch (err: any) {
      alert(`Erreur lors de l'exportation du rapport PDF : ${err.message}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    try {
      db.createExpense({
        category: expenseCat,
        amount: expenseAmount,
        description: expenseDesc.trim() || 'Dépense exploitation fromagerie',
        paidVia: expenseMethod
      });
      refresh();
      setShowExpenseModal(false);
      setExpenseAmount(0);
      setExpenseDesc('');
      triggerHaptic();
      alert(`Dépense de ${formatDZD(expenseAmount)} enregistrée avec succès !`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCashClose = (e: React.FormEvent) => {
    e.preventDefault();
    const discrepancy = countedCash - cashRegister.cashBalance;

    try {
      db.createAuditLog('daily_cash_close', `Clôture de caisse effectuée. Compté : ${formatDZD(countedCash)}, Théorique : ${formatDZD(cashRegister.cashBalance)}, Écart : ${formatDZD(discrepancy)}`);
      setShowCloseModal(false);
      triggerHaptic();
      alert(`Clôture validée ! Écart constaté : ${formatDZD(discrepancy)}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPeriodExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const financialSummary = useMemo(() => {
    const state = db.getState();
    const quickSales = (state.quickSales || []).filter(s => isDateInPeriod(s.date || s.createdAt));
    const activeOrders = (state.orders || []).filter(o => o.status !== 'cancelled' && isDateInPeriod(o.deliveryDate || o.createdAt));

    const qsRev = quickSales.reduce((acc, s) => acc + s.total, 0);
    const qsCost = quickSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const ordRev = activeOrders.reduce((acc, o) => acc + o.total, 0);
    const ordCost = activeOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);

    const rev = qsRev + ordRev;
    const cogs = qsCost + ordCost;
    const gross = rev - cogs;
    const grossPct = rev > 0 ? Math.round((gross / rev) * 100) : 0;
    const net = gross - totalPeriodExpenses;
    const netPct = rev > 0 ? Math.round((net / rev) * 100) : 0;

    return {
      revenue: rev,
      cogs,
      grossMargin: gross,
      grossMarginPercent: grossPct,
      expenses: totalPeriodExpenses,
      netProfit: net,
      netMarginPercent: netPct,
      quickSalesCount: quickSales.length,
      ordersCount: activeOrders.length,
      expensesCount: filteredExpenses.length
    };
  }, [totalPeriodExpenses, periodInfo, filteredExpenses]);

  const isCurrentMonth = periodType === 'month' && selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const isCurrentQuarter = periodType === 'quarter' && selectedQuarter === (Math.floor(now.getMonth() / 3) + 1) && selectedYear === now.getFullYear();
  const isCurrentYear = periodType === 'year' && selectedYear === now.getFullYear();
  const isAllTime = periodType === 'all';

  // Memoized records from db state
  const quickSalesAll = useMemo(() => db.getState().quickSales || [], [stateTick]);
  const ordersAll = useMemo(() => (db.getState().orders || []).filter(o => o.status !== 'cancelled'), [stateTick]);

  // Target Budget for the Active Period
  const periodBudget = useMemo(() => {
    if (periodType === 'quarter') return monthlyBudget * 3;
    if (periodType === 'year') return monthlyBudget * 12;
    return monthlyBudget;
  }, [periodType, monthlyBudget]);

  // Visual alert: check if expenses exceed provisional budget
  const isOverBudget = useMemo(() => {
    if (monthlyBudget <= 0) return false;
    return financialSummary.expenses > periodBudget;
  }, [financialSummary.expenses, periodBudget, monthlyBudget]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Caisse, Finances & Dépenses d'Exploitation</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi des flux réels de trésorerie, clôture journalière et marges d'exploitation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportFinancialPDF}
            disabled={isExportingPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition active:scale-95 disabled:opacity-60 cursor-pointer"
            title={`Exporter le rapport financier (${periodInfo.label}) en PDF`}
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isExportingPDF ? 'Génération...' : `Exporter PDF (${periodInfo.shortLabel})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-2xl transition cursor-pointer"
          >
            Clôturer la Caisse
          </button>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouvelle Dépense</span>
          </button>
        </div>
      </div>

      {/* Real-time Key Indicators Cards Dashboard */}
      <RealTimeKpiCards
        revenue={financialSummary.revenue}
        expenses={financialSummary.expenses}
        netProfit={financialSummary.netProfit}
        grossMargin={financialSummary.grossMargin}
        grossMarginPercent={financialSummary.grossMarginPercent}
        netMarginPercent={financialSummary.netMarginPercent}
        salesCount={financialSummary.quickSalesCount + financialSummary.ordersCount}
        expensesCount={financialSummary.expensesCount}
        periodLabel={periodInfo.label}
        monthlyBudget={periodBudget}
        isOverBudget={isOverBudget}
        periodKey={periodKey}
      />

      {/* Visual Alert System for Provisional Budget */}
      <BudgetAlertBanner
        monthlyBudget={periodBudget}
        expenses={financialSummary.expenses}
        periodLabel={periodInfo.label}
        isOverBudget={isOverBudget}
        onUpdateBudget={handleUpdateBudget}
      />

      {/* Period Filter & Navigation Selector */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
        
        {/* Top bar: Mode switcher & Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          {/* Segmented View Mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl self-start sm:self-auto relative">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2.5 flex items-center gap-1 hidden sm:inline-flex">
              <Filter className="w-3 h-3" />
              <span>Vue :</span>
            </span>
            {(
              [
                { id: 'month', label: 'Mois' },
                { id: 'quarter', label: 'Trimestre' },
                { id: 'year', label: 'Année' },
                { id: 'all', label: 'Tout' }
              ] as const
            ).map((tab) => {
              const isActive = periodType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setPeriodType(tab.id);
                  }}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'text-emerald-900 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activePeriodModePill"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Presets shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 hidden md:inline">
              Raccourcis :
            </span>
            <button
              type="button"
              onClick={selectCurrentMonth}
              className={`px-2.5 py-1 rounded-xl shrink-0 transition border cursor-pointer ${
                isCurrentMonth
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Ce Mois
            </button>
            <button
              type="button"
              onClick={selectPreviousMonth}
              className="px-2.5 py-1 rounded-xl shrink-0 transition border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              Mois Précédent
            </button>
            <button
              type="button"
              onClick={selectCurrentQuarter}
              className={`px-2.5 py-1 rounded-xl shrink-0 transition border cursor-pointer ${
                isCurrentQuarter
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Ce Trimestre
            </button>
            <button
              type="button"
              onClick={selectCurrentYear}
              className={`px-2.5 py-1 rounded-xl shrink-0 transition border cursor-pointer ${
                isCurrentYear
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Cette Année
            </button>
            <button
              type="button"
              onClick={selectAllTime}
              className={`px-2.5 py-1 rounded-xl shrink-0 transition border cursor-pointer ${
                isAllTime
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Tout
            </button>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Active Period Navigation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {periodType !== 'all' && (
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={periodType}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="flex items-center gap-2 flex-wrap"
              >
                {/* If Month View */}
                {periodType === 'month' && (
                  <>
                    <select
                      value={selectedMonth}
                      onChange={(e) => { triggerHaptic(); setSelectedMonth(parseInt(e.target.value, 10)); }}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                    >
                      {MONTHS_FR.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => { triggerHaptic(); setSelectedYear(parseInt(e.target.value, 10)); }}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {/* If Quarter View */}
                {periodType === 'quarter' && (
                  <>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      {QUARTERS_FR.map((q) => (
                        <button
                          key={q.value}
                          type="button"
                          onClick={() => { triggerHaptic(); setSelectedQuarter(q.value); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            selectedQuarter === q.value
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title={`${q.label} : ${q.period}`}
                        >
                          {q.short} ({q.period})
                        </button>
                      ))}
                    </div>

                    <select
                      value={selectedYear}
                      onChange={(e) => { triggerHaptic(); setSelectedYear(parseInt(e.target.value, 10)); }}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {/* If Year View */}
                {periodType === 'year' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => { triggerHaptic(); setSelectedYear(parseInt(e.target.value, 10)); }}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Exercice Annuel {yr}
                      </option>
                    ))}
                  </select>
                )}

                {/* If All View */}
                {periodType === 'all' && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    Toutes les écritures financières consolidées
                  </span>
                )}
              </motion.div>
            </AnimatePresence>

            {periodType !== 'all' && (
              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Période suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active Status Badge */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={periodKey}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs self-start sm:self-auto"
            >
              <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-extrabold block">
                  {periodInfo.label}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400/90 font-medium">
                  {periodInfo.dateRangeText} · {financialSummary.quickSalesCount + financialSummary.ordersCount} ventes ({financialSummary.quickSalesCount} comptoir, {financialSummary.ordersCount} com.) · {financialSummary.expensesCount} dépense(s)
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Financial Health Summary Banner (Dynamic for Selected Period) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Rapport Financier Consolidé</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={periodKey}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                  >
                    {periodInfo.label}
                  </motion.span>
                </AnimatePresence>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Synthèse pour la période ({periodInfo.dateRangeText}) · Coûts de revient, marges et charges d'exploitation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportFinancialPDF}
            disabled={isExportingPDF}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger Rapport PDF ({periodInfo.shortLabel})</span>
          </button>
        </div>

        {/* 4 Condensed Financial Indicators with Smooth Period Transition */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={periodKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Chiffre d'Affaires Brut
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {formatDZD(financialSummary.revenue)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {financialSummary.quickSalesCount} comptoir + {financialSummary.ordersCount} com.
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Marge Brute Globale
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-300 mt-0.5 block">
                  {formatDZD(financialSummary.grossMargin)}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Taux : {financialSummary.grossMarginPercent}%
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
                  Dépenses Période
                </span>
                <span className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 mt-0.5 block">
                  {formatDZD(financialSummary.expenses)}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {financialSummary.expensesCount} charge(s) courante(s)
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${
                financialSummary.netProfit >= 0
                  ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'
              }`}>
                <span className={`text-[11px] font-semibold block ${
                  financialSummary.netProfit >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  Résultat Net Estimé
                </span>
                <span className={`text-base sm:text-lg font-black mt-0.5 block ${
                  financialSummary.netProfit >= 0 ? 'text-teal-900 dark:text-teal-300' : 'text-rose-900 dark:text-rose-300'
                }`}>
                  {formatDZD(financialSummary.netProfit)}
                </span>
                <span className={`text-[10px] font-bold ${
                  financialSummary.netProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  Marge nette : {financialSummary.netMarginPercent}%
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cash balance */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider block">
              Solde Caisse Espèces (Tiroir)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-800/70 rounded-md text-emerald-200 border border-emerald-600/40">
              Solde réel actuel
            </span>
          </div>
          <span className="text-3xl font-black mt-1 block">
            {formatDZD(cashRegister.cashBalance)}
          </span>
          <span className="text-xs text-emerald-200/80 mt-2 block">
            Alimentée par les ventes au comptoir et acomptes en espèces
          </span>
        </div>

        {/* Bank balance */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
              Compte Bancaire / Virement
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
              Solde réel actuel
            </span>
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
            {formatDZD(cashRegister.bankBalance)}
          </span>
          <span className="text-xs text-slate-400 mt-2 block">
            Règlements reçus par virement ou chèque
          </span>
        </div>

        {/* Total Expenses for Period (with fluid transition) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={periodKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  Dépenses ({periodInfo.shortLabel})
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md">
                  {filteredExpenses.length} charge(s)
                </span>
              </div>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                {formatDZD(financialSummary.expenses)}
              </span>
              <span className="text-xs text-slate-400 mt-2 block">
                Aliment bétail, ferments, énergie, salaires sur {periodInfo.label}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Monthly Revenues & Expenses Trend Line Chart (Recharts) */}
      <MonthlyTrendsChart
        selectedYear={selectedYear}
        availableYears={availableYears}
        onSelectYear={(yr) => {
          triggerHaptic();
          setSelectedYear(yr);
        }}
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => {
          triggerHaptic();
          setPeriodType('month');
          setSelectedMonth(m);
        }}
        periodType={periodType}
        monthlyBudget={monthlyBudget}
      />

      {/* Expense Category Distribution (Recharts Pie Chart) */}
      <ExpenseCategoryPieChart
        expenses={filteredExpenses}
        periodLabel={periodInfo.label}
        totalExpenses={financialSummary.expenses}
      />

      {/* Detailed and Paginated Transactions Ledger (Revenues & Expenses) */}
      <TransactionsLedger
        expenses={expenses}
        quickSales={quickSalesAll}
        orders={ordersAll}
        periodStartDate={periodInfo.startDate}
        periodEndDate={periodInfo.endDate}
        periodLabel={periodInfo.label}
      />

      {/* Expenses History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={periodKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Journal des Dépenses ({filteredExpenses.length}) — {periodInfo.label}
            </motion.h2>
          </AnimatePresence>
          {filteredExpenses.length > 0 && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={periodKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400"
              >
                Total décaissé : {formatDZD(financialSummary.expenses)}
              </motion.span>
            </AnimatePresence>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={periodKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {filteredExpenses.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Aucune dépense enregistrée pour {periodInfo.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Aucune charge d'exploitation n'a été imputée sur cette plage de dates ({periodInfo.dateRangeText}).
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={selectCurrentMonth}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Revenir au Mois Actuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(true)}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    + Enregistrer une Dépense
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-900 dark:text-white">
                            {exp.description}
                          </strong>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                            {exp.category}
                          </span>
                        </div>
                        <span className="text-slate-400 block mt-0.5">
                          {formatDate(exp.date)} · Réglé via {exp.paidVia === 'cash' ? 'Espèces' : 'Banque'}
                        </span>
                      </div>
                    </div>

                    <span className="text-base font-black text-slate-900 dark:text-white">
                      - {formatDZD(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* New Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Enregistrer une Dépense
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Affectation budgétaire et déduction automatique de trésorerie
            </p>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Catégorie de Dépense :
                </label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                >
                  <option value="feed">Alimentation Bétail (Foin, concentré)</option>
                  <option value="milk_purchase">Achat de Lait Extérieur</option>
                  <option value="veterinary">Soins Vétérinaires / Médicaments</option>
                  <option value="packaging">Emballages & Étiquettes</option>
                  <option value="energy">Énergie (Électricité, Gaz, Carburant)</option>
                  <option value="salaries">Salaires & Main d'œuvre</option>
                  <option value="maintenance">Entretien Matériel & Fromagerie</option>
                  <option value="other">Autre charge</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Montant Décaissé (DA) * :
                </label>
                <input
                  type="number"
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-base font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Description / Fournisseur :
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: Facture Sonelgaz chambre froide"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Payé depuis :
                </label>
                <select
                  value={expenseMethod}
                  onChange={(e) => setExpenseMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                >
                  <option value="cash">Caisse Espèces (Tiroir)</option>
                  <option value="bank_transfer">Compte Bancaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Clôture Journalière du Tiroir-Caisse
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Solde théorique calculé : {formatDZD(cashRegister.cashBalance)}
            </p>

            <form onSubmit={handleCashClose} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Montant physique réellement compté (DA) :
                </label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-base font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Live discrepancy */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Écart constaté :</span>
                <span className={`font-black text-sm ${
                  countedCash - cashRegister.cashBalance === 0
                    ? 'text-emerald-600'
                    : countedCash - cashRegister.cashBalance < 0
                    ? 'text-rose-600'
                    : 'text-blue-600'
                }`}>
                  {formatDZD(countedCash - cashRegister.cashBalance)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  Valider la Clôture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
