import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Award, Users,
  Droplets, FileSpreadsheet, Download, Calendar
} from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD } from '../../lib/utils';

export const ReportsView: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'profitability' | 'customers' | 'milk_yield' | 'pnl'>('profitability');

  const variants = db.getVariants();
  const orders = db.getOrders();
  const quickSales = db.getQuickSales();
  const customers = db.getCustomers();
  const expenses = db.getExpenses();
  const batches = db.getBatches();

  // Profitability calculations per cheese variant
  const cheeseProfitability = useMemo(() => {
    return variants.map(v => {
      // Units sold across orders & quick sales
      let soldUnits = 0;
      let revenue = 0;

      quickSales.forEach(s => {
        s.items.forEach(i => {
          if (i.variantId === v.id) {
            soldUnits += i.quantity;
            revenue += i.subtotal;
          }
        });
      });

      orders.forEach(o => {
        o.items.forEach(i => {
          if (i.variantId === v.id) {
            soldUnits += i.quantity;
            revenue += i.subtotal;
          }
        });
      });

      const totalCost = soldUnits * v.cost;
      const profit = revenue - totalCost;
      const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      return {
        variant: v,
        soldUnits,
        revenue,
        totalCost,
        profit,
        marginPercent
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [variants, quickSales, orders]);

  // Customer sales & debt ranking
  const customerAnalytics = useMemo(() => {
    return customers.map(c => {
      let totalSpent = 0;
      let orderCount = 0;

      orders.forEach(o => {
        if (o.customerId === c.id) {
          totalSpent += o.total;
          orderCount += 1;
        }
      });

      return {
        customer: c,
        totalSpent,
        orderCount,
        outstandingBalance: c.outstandingBalance
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, orders]);

  // P&L summary
  const pnl = useMemo(() => {
    const totalSales = cheeseProfitability.reduce((sum, item) => sum + item.revenue, 0);
    const totalCOGS = cheeseProfitability.reduce((sum, item) => sum + item.totalCost, 0);
    const grossProfit = totalSales - totalCOGS;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSales,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      netMarginPercent: totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0
    };
  }, [cheeseProfitability, expenses]);

  // Milk yield analytics
  const milkAnalytics = useMemo(() => {
    let totalLiters = 0;
    let totalUnitsMade = 0;

    batches.forEach(b => {
      totalLiters += b.milkInputLiters;
      totalUnitsMade += b.outputQuantity;
    });

    const averageLitersPerPiece = totalUnitsMade > 0 ? (totalLiters / totalUnitsMade).toFixed(2) : '1.5';

    return {
      totalLiters,
      totalUnitsMade,
      averageLitersPerPiece
    };
  }, [batches]);

  const handleExportCSV = () => {
    const headers = ['Produit', 'Ventes (DA)', 'Coût (DA)', 'Bénéfice Net (DA)', 'Marge (%)'];
    const rows = cheeseProfitability.map(p => [
      `"${p.variant.name}"`,
      p.revenue,
      p.totalCost,
      p.profit,
      `${p.marginPercent}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `azrnou_rapport_rentabilite_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Rapports d'Activité & Analyse de Rentabilité</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Marge brute réelle, rendement fromager et compte de résultat
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exporter Excel / CSV</span>
        </button>
      </div>

      {/* Global P&L Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Chiffre d'Affaires Brut</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {formatDZD(pnl.totalSales)}
          </span>
          <span className="text-[11px] text-slate-400">Ventes BC + Caisse</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Coût des Produits Vendus</span>
          <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1 block">
            {formatDZD(pnl.totalCOGS)}
          </span>
          <span className="text-[11px] text-slate-400">Lait, intrants & emballage</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Dépenses d'Exploitation</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {formatDZD(pnl.totalExpenses)}
          </span>
          <span className="text-[11px] text-slate-400">Aliment bétail & énergie</span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-lg">
          <span className="text-xs text-emerald-200 font-semibold uppercase tracking-wider block">
            Bénéfice Net Estimé
          </span>
          <span className="text-2xl sm:text-3xl font-black mt-1 block">
            {formatDZD(pnl.netProfit)}
          </span>
          <span className="text-xs text-emerald-200/80 mt-1 block">
            Marge nette : {pnl.netMarginPercent}%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'profitability', label: 'Fromages les plus rentables', icon: Award },
          { key: 'customers', label: 'Meilleurs Clients & Délais', icon: Users },
          { key: 'milk_yield', label: 'Rendement Laitier', icon: Droplets },
          { key: 'pnl', label: 'Compte de Résultat (P&L)', icon: DollarSign },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveReportTab(tab.key as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profitability table */}
      {activeReportTab === 'profitability' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Classement de Rentabilité par Fromage
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Fromage / Référence</th>
                  <th className="px-3 py-3 text-center">Unités Vendues</th>
                  <th className="px-3 py-3 text-right">Chiffre d'Affaires</th>
                  <th className="px-3 py-3 text-right">Coût Total</th>
                  <th className="px-3 py-3 text-right">Bénéfice Réalisé</th>
                  <th className="px-4 py-3 text-right">Taux Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {cheeseProfitability.map((item, idx) => (
                  <tr key={item.variant.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>{item.variant.name}</span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {item.soldUnits} {item.variant.unit}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatDZD(item.revenue)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">
                      {formatDZD(item.totalCost)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-700 dark:text-emerald-400">
                      + {formatDZD(item.profit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {item.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Analytics */}
      {activeReportTab === 'customers' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Palmarès des Clients & Créances
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-3 py-3 text-center">Commandes</th>
                  <th className="px-3 py-3 text-right">Volume Acheté</th>
                  <th className="px-3 py-3 text-right">Dette en Attente</th>
                  <th className="px-4 py-3 text-right">Statut Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {customerAnalytics.map((ca, idx) => (
                  <tr key={ca.customer.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      #{idx + 1} {ca.customer.name}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300">
                      {ca.orderCount}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                      {formatDZD(ca.totalSpent)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-rose-600">
                      {ca.outstandingBalance > 0 ? formatDZD(ca.outstandingBalance) : '0 DA'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ca.outstandingBalance > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                          Créance active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          À jour
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Milk Yield */}
      {activeReportTab === 'milk_yield' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Efficience & Rendement Laitier (Lait → Fromage)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
            <div>
              <span className="text-xs text-slate-400 block">Lait Total Mis en Œuvre</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {milkAnalytics.totalLiters} L
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Fromages Obtenus</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                {milkAnalytics.totalUnitsMade} pièces
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Rendement Moyen</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {milkAnalytics.averageLitersPerPiece} L / pièce
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: P&L Statement */}
      {activeReportTab === 'pnl' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Compte de Résultat Synthétique (P&L)
          </h3>

          <div className="space-y-3 text-xs border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>(+) Chiffre d'Affaires Net</span>
              <span>{formatDZD(pnl.totalSales)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>(-) Coût Matières Premières & Intrants (COGS)</span>
              <span>- {formatDZD(pnl.totalCOGS)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>(=) Marge Brute</span>
              <span className="text-emerald-700 dark:text-emerald-400">{formatDZD(pnl.grossProfit)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>(-) Dépenses Générales d'Exploitation</span>
              <span>- {formatDZD(pnl.totalExpenses)}</span>
            </div>
            <div className="flex justify-between font-black text-base text-emerald-900 dark:text-emerald-200 pt-2 border-t border-emerald-300 dark:border-emerald-700">
              <span>(=) Résultat Net de la Fromagerie</span>
              <span>{formatDZD(pnl.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
