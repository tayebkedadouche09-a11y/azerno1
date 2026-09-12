import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Scale
} from 'lucide-react';
import { formatDZD } from '../../lib/utils';

interface RealTimeKpiCardsProps {
  revenue: number;
  expenses: number;
  netProfit: number;
  grossMargin: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  salesCount: number;
  expensesCount: number;
  periodLabel: string;
  monthlyBudget: number;
  isOverBudget: boolean;
  periodKey: string;
}

export const RealTimeKpiCards: React.FC<RealTimeKpiCardsProps> = ({
  revenue,
  expenses,
  netProfit,
  grossMargin,
  grossMarginPercent,
  netMarginPercent,
  salesCount,
  expensesCount,
  periodLabel,
  monthlyBudget,
  isOverBudget,
  periodKey
}) => {
  const budgetConsumedPercent = monthlyBudget > 0 ? Math.round((expenses / monthlyBudget) * 100) : 0;
  const isProfitable = netProfit >= 0;

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={periodKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Card 1: Chiffre d'affaires Total */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Chiffre d'Affaires Total</span>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 block tracking-tight">
                  {formatDZD(revenue)}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {salesCount} transaction(s) commerciale(s)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                Marge : {grossMarginPercent}% ({formatDZD(grossMargin)})
              </span>
            </div>
          </div>

          {/* Card 2: Dépenses Totales & Alerte Budget */}
          <div className={`p-5 rounded-3xl bg-white dark:bg-slate-800 border shadow-sm relative overflow-hidden transition-colors ${
            isOverBudget
              ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Dépenses Totales</span>
                  </span>
                  {isOverBudget && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Dépassement
                    </span>
                  )}
                </div>
                <span className={`text-2xl sm:text-3xl font-black mt-1 block tracking-tight ${
                  isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {formatDZD(expenses)}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${
                isOverBudget
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40'
              }`}>
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {expensesCount} charge(s) comptabilisée(s)
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOverBudget
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}>
                Budget : {budgetConsumedPercent}% ({formatDZD(monthlyBudget)})
              </span>
            </div>
          </div>

          {/* Card 3: Résultat Net */}
          <div className={`p-5 rounded-3xl bg-white dark:bg-slate-800 border shadow-sm relative overflow-hidden transition-colors ${
            isProfitable
              ? 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
              : 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isProfitable ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Résultat Net Période</span>
                </span>
                <span className={`text-2xl sm:text-3xl font-black mt-1 block tracking-tight ${
                  isProfitable ? 'text-teal-900 dark:text-teal-300' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isProfitable ? `+ ${formatDZD(netProfit)}` : formatDZD(netProfit)}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${
                isProfitable
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900/40'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
              }`}>
                {isProfitable ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {periodLabel}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isProfitable
                  ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200'
                  : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
              }`}>
                {isProfitable ? 'Bénéfice Net' : 'Déficit'} : {netMarginPercent}%
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
