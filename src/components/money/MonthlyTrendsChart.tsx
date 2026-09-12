import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { db } from '../../lib/storage';
import { formatDZD, triggerHaptic } from '../../lib/utils';

interface MonthlyTrendsChartProps {
  selectedYear: number;
  availableYears: number[];
  onSelectYear: (year: number) => void;
  selectedMonth?: number;
  onSelectMonth?: (monthIndex: number) => void;
  periodType: string;
  monthlyBudget?: number;
}

const MONTH_NAMES_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const MONTH_FULL_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({
  selectedYear,
  availableYears,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  periodType,
  monthlyBudget = 0
}) => {
  const [showNetProfit, setShowNetProfit] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);

  // Compute 12 months data for the selected year
  const chartData = useMemo(() => {
    const state = db.getState();
    const allExpenses = db.getExpenses();
    const quickSales = state.quickSales || [];
    const orders = (state.orders || []).filter(o => o.status !== 'cancelled');

    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthPrefix = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;

      // Filter quick sales
      const monthQuickSales = quickSales.filter(s => {
        const d = (s.date || s.createdAt || '').slice(0, 7);
        return d === monthPrefix;
      });

      // Filter active orders
      const monthOrders = orders.filter(o => {
        const d = (o.deliveryDate || o.createdAt || '').slice(0, 7);
        return d === monthPrefix;
      });

      // Filter expenses
      const monthExpensesList = allExpenses.filter(e => {
        const d = (e.date || e.createdAt || '').slice(0, 7);
        return d === monthPrefix;
      });

      // Calculate figures
      const qsRev = monthQuickSales.reduce((acc, s) => acc + (s.total || 0), 0);
      const qsCost = monthQuickSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);

      const ordRev = monthOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const ordCost = monthOrders.reduce((acc, o) => acc + (o.totalCost || 0), 0);

      const totalRevenue = qsRev + ordRev;
      const totalCogs = qsCost + ordCost;
      const grossMargin = totalRevenue - totalCogs;
      const totalExpenses = monthExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0);
      const netProfit = grossMargin - totalExpenses;

      return {
        monthIndex: monthIdx,
        name: MONTH_NAMES_FR[monthIdx],
        fullName: MONTH_FULL_NAMES_FR[monthIdx],
        revenue: totalRevenue,
        expenses: totalExpenses,
        grossMargin,
        netProfit,
        salesCount: monthQuickSales.length + monthOrders.length,
        expensesCount: monthExpensesList.length,
        hasActivity: totalRevenue > 0 || totalExpenses > 0
      };
    });
  }, [selectedYear]);

  // Months exceeding provisional monthly budget
  const overBudgetMonths = useMemo(() => {
    if (!monthlyBudget || monthlyBudget <= 0) return [];
    return chartData.filter((d) => d.expenses > monthlyBudget);
  }, [chartData, monthlyBudget]);

  // Year aggregates
  const yearStats = useMemo(() => {
    const totalRev = chartData.reduce((acc, d) => acc + d.revenue, 0);
    const totalExp = chartData.reduce((acc, d) => acc + d.expenses, 0);
    const totalNet = chartData.reduce((acc, d) => acc + d.netProfit, 0);

    let bestMonth = chartData[0];
    chartData.forEach(d => {
      if (d.revenue > bestMonth.revenue) {
        bestMonth = d;
      }
    });

    return {
      totalRev,
      totalExp,
      totalNet,
      bestMonthName: bestMonth && bestMonth.revenue > 0 ? bestMonth.fullName : 'Aucun',
      bestMonthRevenue: bestMonth ? bestMonth.revenue : 0
    };
  }, [chartData]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[200px] z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-extrabold text-sm text-emerald-400">
              {data.fullName} {selectedYear}
            </span>
            <span className="text-[10px] text-slate-400">
              {data.salesCount} vente(s) · {data.expensesCount} dépense(s)
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-emerald-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Revenus :
              </span>
              <span className="font-black">{formatDZD(data.revenue)}</span>
            </div>

            <div className="flex items-center justify-between text-amber-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Dépenses :
              </span>
              <span className="font-black">{formatDZD(data.expenses)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300 font-medium pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                Résultat Net :
              </span>
              <span className={`font-black ${data.netProfit >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                {formatDZD(data.netProfit)}
              </span>
            </div>

            {monthlyBudget > 0 && data.expenses > monthlyBudget && (
              <div className="flex items-center justify-between text-rose-300 font-bold bg-rose-950/90 px-2 py-1.5 rounded-xl border border-rose-800/80 text-[10px] mt-1.5">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  Dépassement budget :
                </span>
                <span className="font-black text-rose-200">
                  +{formatDZD(data.expenses - monthlyBudget)}
                </span>
              </div>
            )}
          </div>

          {onSelectMonth && (
            <p className="text-[10px] text-slate-400 text-center mt-2.5 pt-1.5 border-t border-slate-800/60 italic">
              Cliquez sur le point pour filtrer ce mois
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Dot renderer to highlight selected month and over-budget expense months
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    const isSelected = periodType === 'month' && selectedMonth === payload.monthIndex;
    const isOverBudget = dataKey === 'expenses' && monthlyBudget > 0 && payload.expenses > monthlyBudget;

    let fillColor = '#10b981';
    if (dataKey === 'expenses') fillColor = isOverBudget ? '#e11d48' : '#f59e0b';
    if (dataKey === 'netProfit') fillColor = '#06b6d4';

    if (isOverBudget) {
      return (
        <g key={`dot-overbudget-${payload.monthIndex}`}>
          <circle cx={cx} cy={cy} r={9} fill="#f43f5e" fillOpacity={0.35} className="animate-pulse" />
          <circle cx={cx} cy={cy} r={5} fill="#e11d48" stroke="#ffffff" strokeWidth={2} />
        </g>
      );
    }

    if (isSelected) {
      return (
        <g key={`dot-${dataKey}-${payload.monthIndex}`}>
          <circle cx={cx} cy={cy} r={8} fill={fillColor} fillOpacity={0.25} className="animate-pulse" />
          <circle cx={cx} cy={cy} r={5} fill={fillColor} stroke="#ffffff" strokeWidth={2} />
        </g>
      );
    }

    return (
      <circle
        key={`dot-${dataKey}-${payload.monthIndex}`}
        cx={cx}
        cy={cy}
        r={3.5}
        fill={fillColor}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>Évolution Mensuelle des Revenus & Dépenses</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {selectedYear}
            </span>
            {overBudgetMonths.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {overBudgetMonths.length} mois &gt; budget ({overBudgetMonths.map((m) => m.name).join(', ')})
                </span>
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Courbes comparatives des rentrées commerciales et des charges d'exploitation par mois
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Year selector for the chart */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 px-1.5 hidden md:inline">
              Exercice :
            </span>
            {availableYears.map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onSelectYear(yr);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mini KPI Highlights for the Year */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Revenus Année {selectedYear}
          </span>
          <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            {formatDZD(yearStats.totalRev)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Dépenses Année {selectedYear}
          </span>
          <span className="text-sm font-black text-amber-700 dark:text-amber-400 mt-0.5 block">
            {formatDZD(yearStats.totalExp)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Résultat Net Annuel
          </span>
          <span className={`text-sm font-black mt-0.5 block ${yearStats.totalNet >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatDZD(yearStats.totalNet)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Meilleur Mois ({yearStats.bestMonthName})
          </span>
          <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5 block">
            {formatDZD(yearStats.bestMonthRevenue)}
          </span>
        </div>
      </div>

      {/* Series toggles (Interactive Legend) */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-slate-400 font-semibold text-[11px]">Afficher sur la courbe :</span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setShowRevenue(v => !v);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer border ${
            showRevenue
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-transparent opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
          <span>Revenus (CA)</span>
          {showRevenue ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setShowExpenses(v => !v);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer border ${
            showExpenses
              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-transparent opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Dépenses (Charges)</span>
          {showExpenses ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setShowNetProfit(v => !v);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition cursor-pointer border ${
            showNetProfit
              ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-transparent opacity-60'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span>Résultat Net</span>
          {showNetProfit ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
        </button>

        {periodType === 'month' && selectedMonth !== undefined && (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold ml-auto bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            Point actif : {MONTH_FULL_NAMES_FR[selectedMonth]}
          </span>
        )}
      </div>

      {/* Main Recharts Graph */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 12, left: 4, bottom: 6 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length && onSelectMonth) {
                const clickedMonth = e.activePayload[0].payload.monthIndex;
                triggerHaptic();
                onSelectMonth(clickedMonth);
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#cbd5e1"
              strokeOpacity={0.4}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.5 }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: number) => {
                if (val === 0) return '0';
                if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (Math.abs(val) >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" strokeOpacity={0.6} />

            {/* Monthly Budget Ceiling Reference Line */}
            {monthlyBudget > 0 && (
              <ReferenceLine
                y={monthlyBudget}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Plafond Budget (${Math.round(monthlyBudget / 1000)}k DA)`,
                  position: 'insideTopRight',
                  fill: '#e11d48',
                  fontSize: 10,
                  fontWeight: 700
                }}
              />
            )}

            {/* Revenue Line */}
            {showRevenue && (
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenus"
                stroke="#059669"
                strokeWidth={2.5}
                dot={renderCustomDot}
                activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={750}
              />
            )}

            {/* Expenses Line */}
            {showExpenses && (
              <Line
                type="monotone"
                dataKey="expenses"
                name="Dépenses"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={renderCustomDot}
                activeDot={{ r: 6, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={750}
              />
            )}

            {/* Net Profit Line */}
            {showNetProfit && (
              <Line
                type="monotone"
                dataKey="netProfit"
                name="Résultat Net"
                stroke="#0891b2"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={renderCustomDot}
                activeDot={{ r: 6, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={750}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
