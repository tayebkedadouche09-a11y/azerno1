import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, X, ShoppingBag, Package, Users, Truck,
  FileText, ArrowRight
} from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD } from '../../lib/utils';
import { MainTab } from './BottomNav';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: MainTab, id?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();

    const customers = db.getCustomers().filter(
      c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.address && c.address.toLowerCase().includes(q))
    ).slice(0, 4);

    const variants = db.getVariants().filter(
      v => v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q) || (v.barcode && v.barcode.includes(q))
    ).slice(0, 5);

    const orders = db.getOrders().filter(
      o => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)
    ).slice(0, 4);

    const invoices = db.getInvoices().filter(
      inv => inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q)
    ).slice(0, 3);

    const suppliers = db.getSuppliers().filter(
      s => s.name.toLowerCase().includes(q) || s.phone.includes(q)
    ).slice(0, 3);

    const totalCount = customers.length + variants.length + orders.length + invoices.length + suppliers.length;

    return { customers, variants, orders, invoices, suppliers, totalCount };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher client, produit, commande, facture, fournisseur..."
            className="w-full text-base bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!results ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Tapez au moins 1 lettre pour lancer la recherche transversale.
            </div>
          ) : results.totalCount === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Aucun résultat correspondant à "{query}".
            </div>
          ) : (
            <>
              {/* Products */}
              {results.variants.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    Produits ({results.variants.length})
                  </h4>
                  <div className="space-y-1">
                    {results.variants.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { onNavigate('products', v.id); onClose(); }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {v.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              SKU: {v.sku} · Stock: <span className="font-semibold text-emerald-600">{v.currentStock}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {formatDZD(v.retailPrice)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    Clients ({results.customers.length})
                  </h4>
                  <div className="space-y-1">
                    {results.customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { onNavigate('customers', c.id); onClose(); }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {c.phone} · {c.address}
                            </div>
                          </div>
                        </div>
                        {c.outstandingBalance > 0 ? (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            Dû: {formatDZD(c.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">À jour</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders */}
              {results.orders.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    Commandes ({results.orders.length})
                  </h4>
                  <div className="space-y-1">
                    {results.orders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => { onNavigate('orders', o.id); onClose(); }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {o.orderNumber} — {o.customerName}
                            </div>
                            <div className="text-xs text-slate-400">
                              Livraison: {o.deliveryDate}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatDZD(o.total)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    Factures ({results.invoices.length})
                  </h4>
                  <div className="space-y-1">
                    {results.invoices.map(inv => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => { onNavigate('documents', inv.id); onClose(); }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {inv.invoiceNumber} — {inv.customerName}
                            </div>
                            <div className="text-xs text-slate-400">
                              Date: {inv.date}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatDZD(inv.total)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
