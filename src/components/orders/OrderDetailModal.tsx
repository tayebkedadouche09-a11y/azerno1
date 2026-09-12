import React, { useState } from 'react';
import {
  X, ShoppingBag, Truck, FileText, CheckCircle2,
  Clock, Share2, Download, Printer, DollarSign,
  Phone, MessageSquare, AlertTriangle, ArrowRight
} from 'lucide-react';
import { db } from '../../lib/storage';
import { Order, OrderStatus } from '../../types';
import { formatDZD, formatDate, generateWhatsAppLink } from '../../lib/utils';
import { StatusBadge } from '../common/Badge';
import { PartialDeliveryModal } from './PartialDeliveryModal';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';

interface OrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);

  if (!isOpen) return null;

  const order = db.getOrders().find(o => o.id === orderId);
  if (!order) return null;

  const customer = db.getCustomers().find(c => c.id === order.customerId);
  const settings = db.getSettings();

  const handleStatusChange = (newStatus: OrderStatus) => {
    db.updateOrderStatus(order.id, newStatus);
    onUpdate();
  };

  const handleGenerateInvoice = () => {
    try {
      const inv = db.createInvoice(order.id);
      alert(`Facture générée avec succès : ${inv.invoiceNumber}`);
      onUpdate();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la génération de la facture');
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    try {
      db.recordPayment({
        customerId: order.customerId,
        orderId: order.id,
        amount: payAmount,
        method: 'cash',
        notes: `Règlement pour commande ${order.orderNumber}`
      });
      setShowPaymentInput(false);
      setPayAmount(0);
      onUpdate();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDownloadBC = () => {
    const docData: DocumentData = {
      type: 'order',
      documentNumber: order.orderNumber,
      date: order.createdAt,
      deliveryDate: order.deliveryDate,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: customer?.address,
      items: order.items.map(i => ({
        designation: i.productName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        total: i.subtotal
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paidAmount: order.paidAmount,
      balanceRemaining: Math.max(0, order.total - order.paidAmount),
      notes: order.notes
    };
    downloadDocumentPDF(docData, settings);
  };

  const handleWhatsAppShare = () => {
    const text = `Bonjour ${order.customerName},\nVoici les détails de votre commande AZRNOU (${order.orderNumber}) :\nMontant total : ${formatDZD(order.total)}\nDate prévue : ${order.deliveryDate}\nMerci pour votre confiance !`;
    const url = generateWhatsAppLink(order.customerPhone, text);
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8 max-h-[92vh]">
          
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {order.orderNumber}
                  </h2>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Créée le {formatDate(order.createdAt, true)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                title="Partager sur WhatsApp"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleDownloadBC}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Télécharger Bon de Commande PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Customer & Delivery Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Client
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {order.customerName}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {order.customerPhone}
                </span>
                {customer?.address && (
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {customer.address}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Livraison & Échéance
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  Prévue pour : {formatDate(order.deliveryDate)}
                </span>
                {order.notes && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium block mt-1">
                    Note: {order.notes}
                  </span>
                )}
              </div>
            </div>

            {/* Lifecycle Progression Steps */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                Étape du cycle de commande
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {order.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('preparing')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lancer la préparation</span>
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('ready')}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer Prête pour expédition</span>
                  </button>
                )}

                {['preparing', 'ready', 'partially_delivered', 'confirmed'].includes(order.status) && (
                  <button
                    type="button"
                    onClick={() => setShowDeliveryModal(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Livrer la commande (Créer BL)</span>
                  </button>
                )}

                {!order.invoicedAt && (
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Générer la Facture (FAC)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                Produits commandés
              </span>
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Produit</th>
                      <th className="px-3 py-2.5 text-center">Quantité</th>
                      <th className="px-3 py-2.5 text-center">Livré</th>
                      <th className="px-3 py-2.5 text-right">Prix Unit.</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {item.productName}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            item.deliveredQuantity >= item.quantity
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.deliveredQuantity > 0
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.deliveredQuantity} / {item.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                          {formatDZD(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatDZD(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Payment Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Brut :</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDZD(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Net de la Commande :</span>
                <span className="text-base text-emerald-700 dark:text-emerald-400">{formatDZD(order.total)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Montant déjà réglé :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDZD(order.paidAmount)}</span>
              </div>

              {order.total - order.paidAmount > 0 ? (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-rose-600">Reste à payer :</span>
                  <span className="font-extrabold text-rose-600 text-sm">
                    {formatDZD(order.total - order.paidAmount)}
                  </span>
                </div>
              ) : (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Commande totalement réglée</span>
                </div>
              )}

              {/* Record payment quick trigger */}
              {order.total - order.paidAmount > 0 && !showPaymentInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount(order.total - order.paidAmount);
                    setShowPaymentInput(true);
                  }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Encaisser un acompte ou le solde</span>
                </button>
              )}

              {showPaymentInput && (
                <form onSubmit={handleRecordPayment} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Montant de l'encaissement (DA) :
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={order.total - order.paidAmount}
                      value={payAmount}
                      onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPaymentInput(false)}
                      className="px-2 text-xs text-slate-400"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Partial Delivery Modal */}
      {showDeliveryModal && (
        <PartialDeliveryModal
          order={order}
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          onDelivered={() => {
            setShowDeliveryModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
};
