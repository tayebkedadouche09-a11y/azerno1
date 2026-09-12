import React from 'react';
import {
  Home, ShoppingCart, Package, Users, Wallet,
  Plus, MoreHorizontal
} from 'lucide-react';
import { triggerHaptic } from '../../lib/utils';
import { AppLanguage } from '../../types';
import { translations } from '../../lib/i18n';

export type MainTab =
  | 'home'
  | 'orders'
  | 'products'
  | 'customers'
  | 'money'
  | 'pos'
  | 'production'
  | 'livestock'
  | 'documents'
  | 'reports'
  | 'settings'
  | 'audit';

interface BottomNavProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenQuickActions: () => void;
  onOpenMoreMenu: () => void;
  currentLang: AppLanguage;
  pendingOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickActions,
  onOpenMoreMenu,
  currentLang,
  pendingOrdersCount = 0
}) => {
  const t = translations[currentLang];

  const handleTabClick = (tab: MainTab) => {
    triggerHaptic();
    onSelectTab(tab);
  };

  const isPrimaryTabActive = (tab: MainTab) => currentTab === tab;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all select-none ${
            isPrimaryTabActive('home')
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${isPrimaryTabActive('home') ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">{t.home}</span>
        </button>

        {/* Tab 2: Orders */}
        <button
          type="button"
          onClick={() => handleTabClick('orders')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all select-none ${
            isPrimaryTabActive('orders')
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className={`w-5 h-5 transition-transform ${isPrimaryTabActive('orders') ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">{t.orders}</span>
          {pendingOrdersCount > 0 && (
            <span className="absolute top-1 right-3.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        {/* Center Quick Action Floating Button (+) */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onOpenQuickActions();
            }}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 ring-4 ring-white dark:ring-slate-900 active:scale-95 transition-transform"
            title="Action Rapide"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Products */}
        <button
          type="button"
          onClick={() => handleTabClick('products')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all select-none ${
            isPrimaryTabActive('products')
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Package className={`w-5 h-5 transition-transform ${isPrimaryTabActive('products') ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">{t.products.split(' ')[0]}</span>
        </button>

        {/* Tab 4: More / Modules Drawer */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onOpenMoreMenu();
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all select-none ${
            ['customers', 'money', 'production', 'livestock', 'documents', 'reports', 'settings', 'pos'].includes(currentTab)
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Modules</span>
        </button>

      </div>
    </nav>
  );
};
