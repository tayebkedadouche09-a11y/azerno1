import React, { useState } from 'react';
import { AlertTriangle, Settings2, Check, TrendingDown, ShieldAlert, X } from 'lucide-react';
import { formatDZD, triggerHaptic } from '../../lib/utils';

interface BudgetAlertBannerProps {
  monthlyBudget: number;
  expenses: number;
  periodLabel: string;
  isOverBudget: boolean;
  onUpdateBudget: (newBudget: number) => void;
}

export const BudgetAlertBanner: React.FC<BudgetAlertBannerProps> = ({
  monthlyBudget,
  expenses,
  periodLabel,
  isOverBudget,
  onUpdateBudget
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempBudget, setTempBudget] = useState(monthlyBudget);

  const overrunAmount = Math.max(0, expenses - monthlyBudget);
  const overrunPercent = monthlyBudget > 0 ? Math.round((overrunAmount / monthlyBudget) * 100) : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempBudget > 0) {
      triggerHaptic();
      onUpdateBudget(tempBudget);
      setShowConfigModal(false);
    }
  };

  return (
    <>
      {/* Alert Banner (Visual Alert System) */}
      {isOverBudget ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700/80 shadow-md text-rose-950 dark:text-rose-100 animate-fade-in relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-rose-500 text-white shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-rose-900 dark:text-rose-200">
                    Alerte Visuelle : Dépassement du Budget Prévisionnel !
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    +{formatDZD(overrunAmount)} (+{overrunPercent}%)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                  Pour <strong>{periodLabel}</strong>, les charges engagées s'élèvent à{' '}
                  <span className="font-extrabold text-rose-900 dark:text-rose-100 underline decoration-rose-400">
                    {formatDZD(expenses)}
                  </span>
                  , dépassant le plafond prévisionnel autorisé de{' '}
                  <strong>{formatDZD(monthlyBudget)}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTempBudget(monthlyBudget);
                  setShowConfigModal(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Ajuster le Plafond</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Plafond budget dépenses ({periodLabel}) :{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{formatDZD(monthlyBudget)}</strong>
              {' · '}
              Consommé : <strong className="text-emerald-700 dark:text-emerald-400">{formatDZD(expenses)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setTempBudget(monthlyBudget);
              setShowConfigModal(true);
            }}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold underline text-[11px] cursor-pointer"
          >
            Configurer le budget
          </button>
        </div>
      )}

      {/* Budget Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Settings2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Budget Prévisionnel Mensuel
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Définissez le plafond de charges d'exploitation mensuel. Tout mois dont les dépenses excèdent ce montant déclenchera automatiquement l'alerte visuelle rouge.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Plafond Mensuel (DA) :
                </label>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Soit environ {formatDZD(tempBudget)} par mois
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
