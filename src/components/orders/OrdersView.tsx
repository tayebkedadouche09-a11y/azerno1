import React, { useEffect, useState, useMemo } from 'react';
import {
  ShoppingBag, Plus, Search, Filter, Calendar,
  Truck, ArrowRight, Clock, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Order } from '../../types';
import { formatDZD, formatDate } from '../../lib/utils';
import { StatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderDetailModal } from './OrderDetailModal';
import { dataRepository } from '../../lib/dataRepository';

interface OrdersViewProps {
  selectedOrderId?: string;
  onClearSelectedOrder?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  selectedOrderId,
  onClearSelectedOrder
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(selectedOrderId || null);
  const [dataSource, setDataSource] = useState<'api' | 'cache'>('cache');
  const [loading, setLoading] = useState(true);

  const refreshOrders = async () => {
    try {
      const result = await dataRepository.orders();
      setOrders(result.items);
      setDataSource(result.source);
    } catch (error) {
      console.error('AZRNOU orders load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshOrders();
    const handleOnline = () => void refreshOrders();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filterStatus !== 'all' && order.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer) return false;
      }
      return true;
    });
  }, [orders, filterStatus, searchQuery]);

  const pendingCount = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Commandes & Bons de Commande (BC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi du cycle de vente, préparation fromagère et livraisons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${dataSource === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {dataSource === 'api' ? 'Serveur' : 'Cache local'}
          </span>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nouvelle Commande</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">En attente de livraison</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">{pendingCount}</span>
          <span className="text-[11px] text-slate-400">À préparer / expédier</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Livraisons effectuées</span>
          <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 block">{deliveredCount}</span>
          <span className="text-[11px] text-slate-400">Bons BL archivés</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-500 font-medium block">Volume d'affaires BC</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block">{formatDZD(totalAmount)}</span>
          <span className="text-[11px] text-slate-400">{orders.length} commandes au total</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par n° de BC ou nom du client..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'confirmed', label: 'Confirmées' },
            { key: 'preparing', label: 'En prépa' },
            { key: 'ready', label: 'Prêtes' },
            { key: 'partially_delivered', label: 'Partielles' },
            { key: 'delivered', label: 'Livrées' },
          ].map(f => (
            <button key={f.key} type="button" onClick={() => setFilterStatus(f.key)} className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${filterStatus === f.key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Chargement des commandes...</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande trouvée"
          description={searchQuery ? `Aucune commande ne correspond à votre recherche "${searchQuery}".` : "Créez votre première commande pour lancer le flux de préparation et livraison."}
          actionLabel="Créer une commande"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredOrders.map((order) => (
            <div key={order.id} onClick={() => setActiveDetailId(order.id)} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">{order.orderNumber}</span>
                  <StatusBadge status={order.status} size="sm" />
                  <StatusBadge status={order.paymentStatus} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{formatDZD(order.total)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{order.customerName}</span>
                  <span className="text-slate-400">· {order.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Livraison prévue : <strong className="text-slate-700 dark:text-slate-200">{formatDate(order.deliveryDate)}</strong></span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                <div className="truncate max-w-lg">{order.items.map(i => `${i.quantity} ${i.unit} ${i.productName}`).join(' · ')}</div>
                {order.total - order.paidAmount > 0 ? (
                  <span className="text-rose-600 font-bold shrink-0 ml-2">Reste dû : {formatDZD(order.total - order.paidAmount)}</span>
                ) : (
                  <span className="text-emerald-600 font-medium shrink-0 ml-2">Payé</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateOpen && (
        <CreateOrderModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onOrderCreated={(newId) => {
            void refreshOrders();
            setActiveDetailId(newId);
          }}
        />
      )}

      {activeDetailId && (
        <OrderDetailModal
          orderId={activeDetailId}
          isOpen={!!activeDetailId}
          onClose={() => {
            setActiveDetailId(null);
            if (onClearSelectedOrder) onClearSelectedOrder();
          }}
          onUpdate={() => void refreshOrders()}
        />
      )}
    </div>
  );
};
