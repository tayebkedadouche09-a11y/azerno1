import React, { useState } from 'react';
import { X, Truck, Check, AlertCircle } from 'lucide-react';
import { db } from '../../lib/storage';
import { Order } from '../../types';
import { formatDZD } from '../../lib/utils';

interface PartialDeliveryModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onDelivered: () => void;
}

export const PartialDeliveryModal: React.FC<PartialDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
  onDelivered
}) => {
  // Quantities to deliver today for each item
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    order.items.forEach(item => {
      const remaining = Math.max(0, item.quantity - item.deliveredQuantity);
      initial[item.variantId] = remaining; // default to remaining
    });
    return initial;
  });

  const [deliveryPerson, setDeliveryPerson] = useState('Youcef Kaci');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const handleQtyChange = (variantId: string, maxRemaining: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxRemaining, val));
    setDeliveryQtys(prev => ({
      ...prev,
      [variantId]: clamped
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const deliveredItems = order.items.map(i => ({
      variantId: i.variantId,
      quantity: deliveryQtys[i.variantId] || 0
    })).filter(i => i.quantity > 0);

    if (deliveredItems.length === 0) {
      alert('Veuillez renseigner au moins une quantité à livrer.');
      return;
    }

    try {
      db.recordDelivery(order.id, deliveredItems, deliveryPerson, deliveryNotes);
      onDelivered();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de la livraison');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Livraison de Commande
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {order.orderNumber} — {order.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Quantités à Livrer (Génération Bon de Livraison BL)
            </label>

            {order.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.deliveredQuantity);
              const toDeliver = deliveryQtys[item.variantId] || 0;

              return (
                <div
                  key={item.variantId}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {item.productName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Commandé : {item.quantity} {item.unit} · Déjà livré : {item.deliveredQuantity} · Reste : {remaining}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-500">Livrer :</span>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={toDeliver}
                      onChange={(e) => handleQtyChange(item.variantId, remaining, parseInt(e.target.value) || 0)}
                      className="w-20 px-2.5 py-1.5 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                    />
                    <span className="text-xs text-slate-400">{item.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Person & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Chauffeur / Livreur
              </label>
              <input
                type="text"
                value={deliveryPerson}
                onChange={(e) => setDeliveryPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Remarques / Observations
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ex: Livré au magasin..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Valider la Livraison (Créer BL)</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
