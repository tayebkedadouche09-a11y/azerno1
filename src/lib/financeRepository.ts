import { api } from './api';
import { readIndexedCache, writeIndexedCache } from './indexedDbCache';
import type { CashRegister, Expense } from '../types';

const EXPENSES_CACHE = 'finance:expenses:v1';
const CASH_CACHE = 'finance:cash-summary:v1';

type ApiExpense = Record<string, unknown>;

type CashSummary = {
  incoming: number;
  expenses: number;
  purchases_paid: number;
};

function mapExpense(row: ApiExpense): Expense {
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

export async function getExpenses(): Promise<Expense[]> {
  try {
    const response = await api.expenses();
    const items = response.items.map(mapExpense);
    await writeIndexedCache(EXPENSES_CACHE, items);
    return items;
  } catch {
    const cached = await readIndexedCache<Expense[]>(EXPENSES_CACHE);
    return cached ?? [];
  }
}

export async function createExpense(input: {
  category: string;
  amount: number;
  date: string;
  supplierId?: string;
  note?: string;
}): Promise<Expense> {
  const created = await api.createExpense(input) as ApiExpense;
  const expense = mapExpense(created);
  const cached = (await readIndexedCache<Expense[]>(EXPENSES_CACHE)) ?? [];
  await writeIndexedCache(EXPENSES_CACHE, [expense, ...cached.filter(item => item.id !== expense.id)]);
  return expense;
}

export async function getCashRegister(): Promise<CashRegister> {
  try {
    const row = await api.cashSummary() as CashSummary;
    const incoming = Number(row.incoming ?? 0);
    const expenses = Number(row.expenses ?? 0);
    const purchases = Number(row.purchases_paid ?? 0);
    const value = { cashBalance: Math.max(0, incoming - expenses - purchases), bankBalance: 0 };
    await writeIndexedCache(CASH_CACHE, value);
    return value;
  } catch {
    return (await readIndexedCache<CashRegister>(CASH_CACHE)) ?? { cashBalance: 0, bankBalance: 0 };
  }
}
