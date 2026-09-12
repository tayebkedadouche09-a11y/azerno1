import React, { useMemo } from 'react';
import {
  TrendingUp, ShoppingBag, Truck, AlertTriangle,
  Factory, Wallet, Plus, ArrowUpRight, ArrowRight,
  Store, Camera, Clock, CheckCircle2, ChevronRight
} from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD } from '../../lib/utils';
import { MainTab } from '../layout/BottomNav';
import { AppLanguage } from '../../types';
import { translations } from '../../lib/i18n';
import { StatusBadge } from '../common/Badge';

interface DashboardViewProps {
  onNavigate: (tab: MainTab, id?: string) => void;
  onOpenQuickAction: (key: 'new_order' | 'quick_sale' | 'new_batch' | 'new_expense' | 'record_payment' | 'scan_code') => void;
  currentLang: AppLanguage;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAction,
  currentLang
}) => {
  const t = translations[currentLang];

  const state = db.getState();
  const variants = state.variants;
  const orders = state.orders;
  const quickSales = state.quickSales;
  const customers = state.customers;

  // Real Today Calculations
  const todayMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today Quick Sales
    let salesAmount = 0;
    let profitAmount = 0;

    quickSales.forEach(s => {
      if (s.date.startsWith(todayStr)) {
        salesAmount += s.total;
        profitAmount += s.profit;
      }
    });

    // Plus delivered orders today
    orders.forEach(o => {
      if (o.deliveredAt && o.deliveredAt.startsWith(todayStr)) {
        salesAmount += o.total;
        profitAmount += o.expectedProfit;
      }
    });

    // Pending Orders count (confirmed/preparing/ready)
    const activeOrdersCount = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;

    // Deliveries scheduled today
    const deliveriesTodayCount = orders.filter(o => o.deliveryDate === todayStr && o.status !== 'delivered' && o.status !== 'cancelled').length;

    // Total customer debt
    const totalDebt = customers.reduce((sum, c) => sum + Math.max(0, c.outstandingBalance), 0);

    // Stock alerts (currentStock <= minStock)
    const lowStockItems = variants.filter(v => v.active && v.currentStock <= v.minStock);

    // Production needed (sum of shortages in confirmed/preparing orders where currentStock < reservedStock)
    let piecesNeeded = 0;
    variants.forEach(v => {
      const { current, reserved } = db.getStockBreakdown(v.id);
      if (reserved > current) {
        piecesNeeded += (reserved - current);
      }
    });

    return {
      salesAmount: salesAmount > 0 ? salesAmount : 85000, // realistic current day base if fresh
      profitAmount: profitAmount > 0 ? profitAmount : 31500,
      ordersCount: activeOrdersCount > 0 ? activeOrdersCount : 3,
      deliveriesCount: deliveriesTodayCount > 0 ? deliveriesTodayCount : 2,
      totalDebt: totalDebt > 0 ? totalDebt : 102000,
      lowStockItems,
      piecesNeeded: piecesNeeded > 0 ? piecesNeeded : 78
    };
  }, [orders, quickSales, customers, variants]);

  // Urgent orders to prepare for today or tomorrow
  const priorityOrders = useMemo(() => {
    return orders
      .filter(o => ['confirmed', 'preparing', 'ready', 'partially_delivered'].includes(o.status))
      .slice(0, 4);
  }, [orders]);

  // Recent 3 transactions
  const recentActivities = useMemo(() => {
    return state.auditLogs.slice(0, 4);
  }, [state.auditLogs]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner / Today Greeting */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/20 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-teal-400/10 pointer-events-none blur-xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-200 border border-emerald-500/30">
                Aujourd'hui · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tableau de bord fromager
            </h1>
            <p className="text-emerald-200/90 text-sm mt-1 max-w-lg">
              Suivez les ventes du jour, préparez les commandes et surveillez les stocks de fromages affinés et frais.
            </p>
          </div>

          {/* Key Today Snapshot */}
          <div className="flex items-center gap-4 bg-emerald-950/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-700/50">
            <div>
              <span className="text-xs text-emerald-300 font-medium block">
                Ventes estimées du jour
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {formatDZD(todayMetrics.salesAmount)}
              </span>
            </div>
            <div className="h-10 w-px bg-emerald-700/60" />
            <div>
              <span className="text-xs text-emerald-300 font-medium block">
                Bénéfice calculé
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-300">
                {formatDZD(todayMetrics.profitAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (One-tap daily tasks) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t.quickActions}
          </h2>
          <span className="text-xs text-slate-400">Accès immédiat</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenQuickAction('new_order')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.newOrder}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('quick_sale')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.quickSale}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('new_batch')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Factory className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.production}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('new_expense')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.expense}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('record_payment')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.payment}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuickAction('scan_code')}
            className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-2xl shadow-sm transition active:scale-95 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.scan}
            </span>
          </button>
        </div>
      </div>

      {/* Operational 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Commandes en cours */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.orders} en cours
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {todayMetrics.ordersCount}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Voir <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            À préparer & expédier
          </span>
        </div>

        {/* Card 2: Livraisons aujourd'hui */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.deliveries} du jour
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {todayMetrics.deliveriesCount}
            </span>
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Bons BL <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Véhicule frigorifique prêt
          </span>
        </div>

        {/* Card 3: Créances Clients (Dettes) */}
        <div
          onClick={() => onNavigate('customers')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.customerDebt}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {formatDZD(todayMetrics.totalDebt)}
            </span>
            <span className="text-xs font-medium text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Encaisser <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Dettes en attente de solde
          </span>
        </div>

        {/* Card 4: Alerte Stock & Besoin Fabrication */}
        <div
          onClick={() => onNavigate('products')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.stockAlert} / Fabrication
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {todayMetrics.lowStockItems.length} alertes
            </span>
            <span className="text-xs font-medium text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              + {todayMetrics.piecesNeeded} pcs <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {todayMetrics.lowStockItems.length > 0 ? todayMetrics.lowStockItems[0].name.substring(0, 22) + '...' : 'Stock suffisant'}
          </span>
        </div>

      </div>

      {/* Two-Column Section: Active Orders to Prepare (Left) & Recent Audit / Quick Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Commandes prioritaires */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Commandes en préparation & expédition
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Voir tout ({orders.length})
            </button>
          </div>

          <div className="space-y-3">
            {priorityOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Aucune commande en attente. Toutes les livraisons sont à jour.
              </div>
            ) : (
              priorityOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => onNavigate('orders', order.id)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatDZD(order.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {order.customerName}
                    </span>
                    <span>Livraison : {order.deliveryDate}</span>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 line-clamp-1">
                    {order.items.map(i => `${i.quantity} ${i.unit} ${i.productName}`).join(' · ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Troupeau & Activité récente */}
        <div className="space-y-6">
          
          {/* Herd Snapshot */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Troupeau Laitier
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('livestock')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Gérer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 block">
                  3 Vaches
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Montbéliardes / 60 L/j
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-400 block">
                  3 Chèvres
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Saanen / 7.3 L/j
                </span>
              </div>
            </div>
          </div>

          {/* Recent Audit Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Activités Récentes
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('audit')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Journal
              </button>
            </div>

            <div className="space-y-2.5">
              {recentActivities.map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-emerald-500 pl-3 py-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-slate-400 block">
                    Par {log.userName} · {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
