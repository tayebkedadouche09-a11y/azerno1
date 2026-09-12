import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { PieChart as PieIcon, Layers, Filter } from 'lucide-react';
import { Expense } from '../../types';
import { formatDZD } from '../../lib/utils';

interface ExpenseCategoryPieChartProps {
  expenses: Expense[];
  periodLabel: string;
  totalExpenses: number;
}

interface CategoryInfo {
  id: string;
  label: string;
  color: string;
}

const CATEGORY_DEFINITIONS: Record<string, CategoryInfo> = {
  feed: { id: 'feed', label: 'Alimentation animale', color: '#10b981' }, // Emerald
  veterinary: { id: 'veterinary', label: 'Soins vétérinaires', color: '#06b6d4' }, // Cyan
  medicine: { id: 'medicine', label: 'Soins vétérinaires', color: '#06b6d4' },
  energy: { id: 'energy', label: 'Énergie & Carburant', color: '#f59e0b' }, // Amber
  electricity: { id: 'electricity', label: 'Énergie & Carburant', color: '#f59e0b' },
  transport: { id: 'transport', label: 'Transport & Logistique', color: '#8b5cf6' }, // Purple
  salaries: { id: 'salaries', label: 'Main-d\'œuvre & Salaires', color: '#6366f1' }, // Indigo
  labor: { id: 'labor', label: 'Main-d\'œuvre & Salaires', color: '#6366f1' },
  milk_purchase: { id: 'milk_purchase', label: 'Achat lait extérieur', color: '#14b8a6' }, // Teal
  milk: { id: 'milk', label: 'Achat lait extérieur', color: '#14b8a6' },
  packaging: { id: 'packaging', label: 'Emballages & Ferments', color: '#ec4899' }, // Pink
  maintenance: { id: 'maintenance', label: 'Entretien & Matériel', color: '#3b82f6' }, // Blue
  other: { id: 'other', label: 'Autres charges', color: '#64748b' } // Slate
};

const DEFAULT_CATEGORY_INFO: CategoryInfo = {
  id: 'other',
  label: 'Autres charges',
  color: '#64748b'
};

export const ExpenseCategoryPieChart: React.FC<ExpenseCategoryPieChartProps> = ({
  expenses,
  periodLabel,
  totalExpenses
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Group expenses by category
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, { label: string; color: string; value: number; count: number }> = {};

    expenses.forEach((e) => {
      const catKey = (e.category || 'other').toLowerCase();
      const def = CATEGORY_DEFINITIONS[catKey] || DEFAULT_CATEGORY_INFO;
      const key = def.label;

      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          label: def.label,
          color: def.color,
          value: 0,
          count: 0
        };
      }

      categoryTotals[key].value += e.amount || 0;
      categoryTotals[key].count += 1;
    });

    const list = Object.values(categoryTotals).map((item) => ({
      name: item.label,
      value: item.value,
      color: item.color,
      count: item.count,
      percentage: totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0
    }));

    // Sort descending by value
    return list.sort((a, b) => b.value - a.value);
  }, [expenses, totalExpenses]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[190px] z-50">
          <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-extrabold text-sm text-slate-100">{data.name}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span>Montant :</span>
              <span className="font-black text-emerald-400">{formatDZD(data.value)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Part du total :</span>
              <span className="font-bold text-amber-400">{data.percentage}%</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Écritures :</span>
              <span>{data.count} dépense(s)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (pieData.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-2 h-72">
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400">
          <PieIcon className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Aucune dépense pour {periodLabel}
        </span>
        <span className="text-xs text-slate-400 max-w-xs">
          Le diagramme circulaire s'affichera dès que des charges seront enregistrées pour cette période.
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Répartition des Dépenses par Catégorie</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ventilation des charges ({periodLabel}) · Total décaissé : {formatDZD(totalExpenses)}
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          {pieData.length} catégorie(s)
        </span>
      </div>

      {/* Grid: Pie Chart on left/top + Detailed Legend on right/bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Pie Chart Canvas */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.color}
                      stroke={activeIndex === index ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                      className="transition-transform duration-200 cursor-pointer"
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none'
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center stats inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Charges
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {formatDZD(totalExpenses)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {expenses.length} écriture(s)
            </span>
          </div>
        </div>

        {/* Categories Breakdown List */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pieData.map((cat, idx) => {
              const isHovered = activeIndex === idx;
              return (
                <div
                  key={cat.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-100 dark:bg-slate-700/80 border-slate-300 dark:border-slate-600 shadow-xs scale-[1.02]'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">
                      {cat.percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatDZD(cat.value)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cat.count} dépense(s)
                    </span>
                  </div>

                  {/* Visual progress bar for category share */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
