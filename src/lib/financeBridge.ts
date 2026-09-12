import { api } from './api';
import type { CashRegister, Expense } from '../types';

const EXPENSES_KEY = 'azrnou_server_finance_expenses_v1';
const CASH_KEY = 'azrnou_server_cash_register_v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cache only */ }
}

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    date: String(row.expense_date ?? row.date ?? row.created_at ?? new Date().toISOString()).slice(0, 10),
    amount: Number(row.amount ?? 0),
    category: String(row.category ?? 'other') as Expense['category'],
    supplierId: row.supplier_id ? String(row.supplier_id) : undefined,
    supplierName: row.supplier_name ? String(row.supplier_name) : undefined,
    notes: row.note ? String(row.note) : row.notes ? String(row.notes) : undefined,
    paymentMethod: String(row.payment_method ?? row.paid_via ?? 'cash') as Expense['paymentMethod'],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function refreshServerFinance() {
  try {
    const response = await api.expenses();
    write(EXPENSES_KEY, response.items.map(mapExpense));
  } catch { /* offline: keep last server snapshot */ }

  try {
    const summary = await api.cashSummary();
    const incoming = Number(summary.incoming ?? 0);
    const expenses = Number(summary.expenses ?? 0);
    const purchases = Number(summary.purchases_paid ?? 0);
    write<CashRegister>(CASH_KEY, {
      cashBalance: Math.max(0, incoming - expenses - purchases),
      bankBalance: 0,
    });
  } catch { /* offline: keep last server snapshot */ }
}

export async function bootstrapFinanceBridge() {
  const target = db as any;
  const originalGetExpenses = target.getExpenses?.bind(target);
  const originalGetCashRegister = target.getCashRegister?.bind(target);

  target.getExpenses = () => read<Expense[]>(EXPENSES_KEY, originalGetExpenses ? originalGetExpenses() : []);
  target.getCashRegister = () => read<CashRegister>(CASH_KEY, originalGetCashRegister ? originalGetCashRegister() : { cashBalance: 0, bankBalance: 0 });

  target.createExpense = (input: any) => {
    const category = String(input?.category ?? 'other');
    const amount = Number(input?.amount ?? 0);
    if (!category || !Number.isFinite(amount) || amount <= 0) throw new Error('Montant de dépense invalide');

    const pending: Expense = {
      id: `pending-${crypto.randomUUID()}`,
      date: new Date().toISOString().slice(0, 10),
      amount,
      category: category as Expense['category'],
      notes: String(input?.description ?? ''),
      paymentMethod: String(input?.paidVia ?? 'cash') as Expense['paymentMethod'],
      createdAt: new Date().toISOString(),
    };

    void api.createExpense({
      category,
      amount,
      date: pending.date,
      note: pending.notes,
    }).then((row) => {
      const created = mapExpense(row as Record<string, unknown>);
      const current = read<Expense[]>(EXPENSES_KEY, []);
      write(EXPENSES_KEY, [created, ...current.filter(item => item.id !== created.id && item.id !== pending.id)]);
    }).catch(() => {
      /* Financial mutations are never silently queued as fake local accounting entries. */
    });

    return pending;
  };

  await refreshServerFinance();
}

// Imported lazily by App after the local storage singleton is available.
import { db } from './storage';
