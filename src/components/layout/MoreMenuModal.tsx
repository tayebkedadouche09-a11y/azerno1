import React from 'react';
import {
  X, Store, Users, Factory, HeartPulse, Wallet,
  FileText, BarChart3, ScrollText, Truck, Settings
} from 'lucide-react';
import { MainTab } from './BottomNav';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: MainTab) => void;
  currentTab: MainTab;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  currentTab
}) => {
  if (!isOpen) return null;

  const modules = [
    { id: 'pos' as MainTab, label: 'Vente Comptoir (POS)', desc: 'Caisse rapide avec encaissement', icon: Store, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950' },
    { id: 'customers' as MainTab, label: 'Clients & Créances', desc: 'Gestion des dettes et rappels WhatsApp', icon: Users, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950' },
    { id: 'production' as MainTab, label: 'Lots de Fabrication', desc: 'Lait -> Fromage & calcul de coût', icon: Factory, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
    { id: 'livestock' as MainTab, label: 'Troupeau Laitier', desc: 'Traite journalière et coût du lait', icon: HeartPulse, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950' },
    { id: 'money' as MainTab, label: 'Caisse & Dépenses', desc: 'Trésorerie et clôture journalière', icon: Wallet, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { id: 'documents' as MainTab, label: 'Documents & Factures', desc: 'Bons BC, BL, FAC et Reçus PDF', icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { id: 'reports' as MainTab, label: 'Rapports & Rentabilité', desc: 'Analyse de marge et compte P&L', icon: BarChart3, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
    { id: 'suppliers' as MainTab, label: 'Fournisseurs', desc: 'Achats lait, aliments et emballages', icon: Truck, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
    { id: 'audit' as MainTab, label: "Journal d'Audit", desc: 'Traçabilité immuable des actions', icon: ScrollText, color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' },
    { id: 'settings' as MainTab, label: 'Paramètres', desc: 'Entreprise, tickets et sauvegardes', icon: Settings, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in lg:hidden">
      <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden pb-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tous les Modules AZRNOU
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 gap-2">
          {modules.map((m) => {
            const Icon = m.icon;
            const isActive = currentTab === m.id;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectTab(m.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition active:scale-98 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {m.label}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {m.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
