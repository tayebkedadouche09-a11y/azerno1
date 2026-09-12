import React, { useState, useMemo } from 'react';
import {
  Store, Plus, Minus, Trash2, Check, DollarSign,
  CreditCard, User, Receipt, Search, Sparkles
} from 'lucide-react';
import { db } from '../../lib/storage';
import { ProductVariant, PaymentMethod } from '../../types';
import { formatDZD, formatUnit, triggerHaptic } from '../../lib/utils';
import { downloadDocumentPDF, DocumentData } from '../../lib/pdfGenerator';

interface CartItem {
  variant: ProductVariant;
  quantity: number;
}

export const QuickSaleView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('Client Comptoir');
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

  const categories = db.getCategories();
  const variants = db.getActiveVariants();
  const settings = db.getSettings();

  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      if (selectedCategory !== 'all' && v.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [variants, selectedCategory, searchQuery]);

  const addToCart = (variant: ProductVariant) => {
    triggerHaptic();
    setCart(prev => {
      const existing = prev.find(i => i.variant.id === variant.id);
      if (existing) {
        return prev.map(i => i.variant.id === variant.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { variant, quantity: 1 }];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    triggerHaptic();
    setCart(prev => {
      return prev.map(item => {
        if (item.variant.id === variantId) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variant.id !== variantId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Calculations
  const cartSummary = useMemo(() => {
    let total = 0;
    let totalCost = 0;

    cart.forEach(item => {
      const subtotal = item.quantity * item.variant.retailPrice;
      const cost = item.quantity * item.variant.cost;
      total += subtotal;
      totalCost += cost;
    });

    return {
      total,
      totalCost,
      profit: total - totalCost,
      itemCount: cart.reduce((sum, i) => sum + i.quantity, 0)
    };
  }, [cart]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const sale = db.createQuickSale({
        items: cart.map(i => ({
          variantId: i.variant.id,
          quantity: i.quantity,
          unitPrice: i.variant.retailPrice
        })),
        paymentMethod,
        customerName: customerName.trim() || 'Client Comptoir'
      });

      setLastSaleReceipt(sale);
      setCart([]);
      triggerHaptic();
      alert(`Vente enregistrée avec succès ! Reçu N° ${sale.saleNumber} (${formatDZD(sale.total)})`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la vente');
    }
  };

  const handleDownloadReceipt = () => {
    if (!lastSaleReceipt) return;
    const docData: DocumentData = {
      type: 'receipt',
      documentNumber: lastSaleReceipt.saleNumber,
      date: lastSaleReceipt.date,
      customerName: lastSaleReceipt.customerName,
      items: lastSaleReceipt.items.map((i: any) => ({
        designation: i.productName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        total: i.subtotal
      })),
      subtotal: lastSaleReceipt.total,
      total: lastSaleReceipt.total,
      paidAmount: lastSaleReceipt.total,
      balanceRemaining: 0,
      paymentMethod: lastSaleReceipt.paymentMethod === 'cash' ? 'Espèces' : 'Virement / Carte',
      notes: `Vente directe au comptoir. Bénéfice brut enregistré : ${formatDZD(lastSaleReceipt.profit)}`
    };
    downloadDocumentPDF(docData, settings);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Vente Comptoir (Caisse Rapide)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Encaissement immédiat, déduction automatique de stock et calcul du bénéfice
          </p>
        </div>

        {lastSaleReceipt && (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Télécharger Reçu {lastSaleReceipt.saleNumber}</span>
          </button>
        )}
      </div>

      {/* Main Grid: Products (Left) + Cart Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Products Section (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Categories Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher produit en rayon..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Tous les rayons
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredVariants.map((v) => {
              const inCart = cart.find(i => i.variant.id === v.id);
              const isOut = v.currentStock <= 0;

              return (
                <div
                  key={v.id}
                  onClick={() => !isOut && addToCart(v)}
                  className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800 border transition-all text-left relative flex flex-col justify-between select-none ${
                    isOut
                      ? 'opacity-50 border-slate-200 cursor-not-allowed'
                      : inCart
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30 cursor-pointer shadow-sm active:scale-98'
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-md cursor-pointer active:scale-98'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {v.sku}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        v.currentStock <= v.minStock
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        Stock: {v.currentStock}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">
                      {v.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400">
                      {formatDZD(v.retailPrice)}
                    </span>
                    {inCart ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                        +
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Checkout Cart Panel (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full sticky top-20">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Panier ({cartSummary.itemCount} articles)
              </h2>
              <span className="text-xs text-slate-400">Vente directe au comptoir</span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Vider
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[160px] max-h-[320px]">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Touchez un produit à gauche pour l'ajouter au panier.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variant.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {item.variant.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDZD(item.variant.retailPrice)} / {item.variant.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variant.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variant.id, 1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-white w-18 text-right shrink-0">
                    {formatDZD(item.quantity * item.variant.retailPrice)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Customer Name & Payment Method Form */}
          <form onSubmit={handleCheckout} className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nom du Client (Optionnel)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Client Comptoir"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Mode de Règlement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Espèces</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Virement / CIB</span>
                </button>
              </div>
            </div>

            {/* Total Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold block">
                  Bénéfice calculé : + {formatDZD(cartSummary.profit)}
                </span>
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                  {formatDZD(cartSummary.total)}
                </span>
              </div>
            </div>

            {/* Confirm Sale Button */}
            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-950/20 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Valider la Vente ({formatDZD(cartSummary.total)})</span>
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
