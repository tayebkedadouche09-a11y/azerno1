import React from 'react';
import {
  LayoutDashboard, ShoppingBag, Store, Users,
  Package, Factory, HeartPulse, Wallet, Truck,
  FileText, BarChart3, Settings, ScrollText, Plus
} from 'lucide-react';
import { MainTab } from './BottomNav';
import { AppLanguage } from '../../types';
import { translations } from '../../lib/i18n';

interface SidebarProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenQuickActions: () => void;
  currentLang: AppLanguage;
  pendingOrdersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickActions,
  currentLang,
  pendingOrdersCount = 0
}) => {
  const t = translations[currentLang];

  const navGroups = [
    {
      title: 'COMMERCE & VENTES',
      items: [
        { id: 'home' as MainTab, label: t.home, icon: LayoutDashboard },
        { id: 'orders' as MainTab, label: t.orders, icon: ShoppingBag, badge: pendingOrdersCount },
        { id: 'pos' as MainTab, label: t.quickSale, icon: Store },
        { id: 'customers' as MainTab, label: t.customers, icon: Users },
      ]
    },
    {
      title: 'PRODUCTION & FERME',
      items: [
        { id: 'products' as MainTab, label: t.products, icon: Package },
        { id: 'production' as MainTab, label: t.production, icon: Factory },
        { id: 'livestock' as MainTab, label: t.livestock, icon: HeartPulse },
        { id: 'suppliers' as MainTab, label: t.suppliers, icon: Truck },
      ]
    },
    {
      title: 'FINANCES & GESTION',
      items: [
        { id: 'money' as MainTab, label: t.money, icon: Wallet },
        { id: 'documents' as MainTab, label: t.documents, icon: FileText },
        { id: 'reports' as MainTab, label: t.reports, icon: BarChart3 },
        { id: 'audit' as MainTab, label: t.auditLog, icon: ScrollText },
        { id: 'settings' as MainTab, label: t.settings, icon: Settings },
      ]
    }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-[calc(100vh-4rem)] sticky top-16 select-none">
      
      {/* Fast Action CTA Button */}
      <div className="p-4">
        <button
          type="button"
          onClick={onOpenQuickActions}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white text-sm font-semibold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-98 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.quickActions}</span>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 pb-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>AZRNOU v1.0.0</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Production</span>
      </div>

    </aside>
  );
};
