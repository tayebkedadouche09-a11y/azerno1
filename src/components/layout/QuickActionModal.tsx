import React from 'react';
import {
  X, ShoppingBag, Store, Factory, Receipt,
  Wallet, Camera, Plus, ArrowRight
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { translations } from '../../lib/i18n';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionKey: 'new_order' | 'quick_sale' | 'new_batch' | 'new_expense' | 'record_payment' | 'scan_code') => void;
  currentLang: AppLanguage;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onAction,
  currentLang
}) => {
  if (!isOpen) return null;

  const t = translations[currentLang];

  const actions = [
    {
      key: 'new_order' as const,
      title: t.newOrder,
      desc: 'Créer un bon de commande client avec réservation de stock',
      icon: ShoppingBag,
      color: 'bg-emerald-600 text-white',
      badge: 'Prioritaire'
    },
    {
      key: 'quick_sale' as const,
      title: t.quickSale,
      desc: 'Vente directe au comptoir avec encaissement immédiat',
      icon: Store,
      color: 'bg-teal-600 text-white',
      badge: 'En secondes'
    },
    {
      key: 'new_batch' as const,
      title: t.production,
      desc: 'Lait mis en œuvre -> fromage produit & calcul du coût unitaire',
      icon: Factory,
      color: 'bg-indigo-600 text-white'
    },
    {
      key: 'new_expense' as const,
      title: t.expense,
      desc: 'Alimentation, véto, transport, emballage ou énergie',
      icon: Receipt,
      color: 'bg-amber-600 text-white'
    },
    {
      key: 'record_payment' as const,
      title: t.payment,
      desc: 'Règlement client sur facture ou acompte de dette',
      icon: Wallet,
      color: 'bg-sky-600 text-white'
    },
    {
      key: 'scan_code' as const,
      title: t.scan,
      desc: 'Scanner caméra code-barres produit ou référence SKU',
      icon: Camera,
      color: 'bg-slate-700 text-white'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.quickActions}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Que souhaitez-vous faire aujourd'hui ?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.key}
                type="button"
                onClick={() => {
                  onAction(act.key);
                  onClose();
                }}
                className="group flex flex-col p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-800/60 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-left relative active:scale-98"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${act.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {act.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {act.badge}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition">
                  {act.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {act.desc}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
