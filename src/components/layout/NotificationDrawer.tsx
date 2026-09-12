import React from 'react';
import {
  X, AlertTriangle, Clock, AlertCircle, ShoppingBag,
  DollarSign, CheckCircle2, ArrowRight, PackageCheck
} from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD } from '../../lib/utils';
import { MainTab } from './BottomNav';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: MainTab, id?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const variants = db.getVariants();
  const orders = db.getOrders();
  const customers = db.getCustomers();

  // 1. Low stock alerts
  const lowStockAlerts = variants.filter(v => v.active && v.currentStock <= v.minStock).map(v => ({
    id: 'ls_' + v.id,
    type: 'low_stock' as const,
    title: `Stock critique: ${v.name}`,
    description: `Stock actuel: ${v.currentStock} ${v.unit} (Seuil min: ${v.minStock})`,
    severity: 'urgent' as const,
    tab: 'products' as MainTab,
    targetId: v.id
  }));

  // 2. Orders due today or tomorrow
  const upcomingOrders = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status) && (o.deliveryDate === todayStr || o.deliveryDate === tomorrowStr)).map(o => ({
    id: 'ord_' + o.id,
    type: 'order_due' as const,
    title: `Commande à livrer ${o.deliveryDate === todayStr ? "aujourd'hui" : "demain"}`,
    description: `${o.orderNumber} - ${o.customerName} (${formatDZD(o.total)})`,
    severity: o.deliveryDate === todayStr ? 'urgent' as const : 'warning' as const,
    tab: 'orders' as MainTab,
    targetId: o.id
  }));

  // 3. Outstanding heavy debt
  const heavyDebts = customers.filter(c => c.outstandingBalance >= 30000).map(c => ({
    id: 'debt_' + c.id,
    type: 'unpaid_balance' as const,
    title: `Créance importante en attente`,
    description: `${c.name} doit ${formatDZD(c.outstandingBalance)}`,
    severity: 'warning' as const,
    tab: 'customers' as MainTab,
    targetId: c.id
  }));

  const allAlerts = [...lowStockAlerts, ...upcomingOrders, ...heavyDebts];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Notifications Opérationnelles
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Règles de gestion & alertes de la fromagerie
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

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {allAlerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tout est en ordre !
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Aucune rupture de stock, aucune créance critique ni retard de livraison détecté.
              </p>
            </div>
          ) : (
            allAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  onNavigate(alert.tab, alert.targetId);
                  onClose();
                }}
                className="p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md active:scale-98 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    alert.severity === 'urgent'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {alert.type === 'low_stock' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : alert.type === 'order_due' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {alert.title}
                      </h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        alert.severity === 'urgent'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      }`}>
                        {alert.severity === 'urgent' ? 'Urgent' : 'À suivre'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                      <span>Consulter</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-400">
            {allAlerts.length} alerte(s) active(s) calculée(s) en temps réel
          </span>
        </div>

      </div>
    </div>
  );
};
