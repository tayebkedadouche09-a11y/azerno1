import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';

interface BadgeProps {
  status: OrderStatus | PaymentStatus | 'active' | 'archived' | 'warning' | 'info' | 'completed' | 'partial' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  let label = status;
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'draft':
      label = 'Brouillon';
      bgClass = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
    case 'confirmed':
      label = 'Confirmée';
      bgClass = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
      break;
    case 'preparing':
      label = 'En préparation';
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'ready':
      label = 'Prête';
      bgClass = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
      break;
    case 'partially_delivered':
    case 'partial':
      label = 'Partiellement livrée';
      bgClass = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
      break;
    case 'delivered':
    case 'completed':
      label = 'Livrée';
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'cancelled':
      label = 'Annulée';
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      break;
    case 'unpaid':
      label = 'Non payé';
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      break;
    case 'partially_paid':
      label = 'Acompte versé';
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'paid':
      label = 'Payé';
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'active':
      label = 'Actif';
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'archived':
      label = 'Archivé';
      bgClass = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      break;
    case 'curing':
      label = 'Affinage en cours';
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      break;
  }

  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center font-medium border rounded-full whitespace-nowrap ${sizeClass} ${bgClass}`}>
      {label}
    </span>
  );
};
