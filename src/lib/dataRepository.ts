import { api } from './api';
import { offlineQueue } from './offlineQueue';
import { readIndexedCache, removeIndexedCache, writeIndexedCache } from './indexedDbCache';
import { Customer, Order, OrderItem, ProductVariant, UnitType } from '../types';

type CacheKey = 'customers' | 'products' | 'orders';
type RawRecord = Record<string, any>;
const CACHE_PREFIX = 'azrnou_api_cache_v2:';
function cacheKey(key: CacheKey) { return `${CACHE_PREFIX}${key}`; }
function readLocalCache<T>(key: CacheKey): T[] { try { const raw = localStorage.getItem(cacheKey(key)); return raw ? JSON.parse(raw) as T[] : []; } catch { return []; } }
async function readCache<T>(key: CacheKey): Promise<T[]> { const indexed = await readIndexedCache<T[]>(cacheKey(key)); return indexed ?? readLocalCache<T>(key); }
async function writeCache<T>(key: CacheKey, items: T[]) { try { localStorage.setItem(cacheKey(key), JSON.stringify(items)); } catch {} await writeIndexedCache(cacheKey(key), items); }
function isOfflineError(error: unknown) { return !navigator.onLine || error instanceof TypeError || /network|failed to fetch|offline|fetch/i.test(error instanceof Error ? error.message : String(error)); }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function dateValue(value: unknown) { return value ? String(value) : new Date().toISOString(); }

function normalizeCustomer(raw: RawRecord): Customer { return { id: String(raw.id), name: String(raw.name ?? ''), phone: String(raw.phone ?? ''), address: String(raw.address ?? ''), type: (raw.customer_type ?? raw.type ?? 'wholesale') as Customer['type'], notes: raw.notes ?? undefined, customPrices: raw.custom_prices ?? raw.customPrices ?? {}, totalPurchases: number(raw.total_purchases ?? raw.totalPurchases), totalPaid: number(raw.total_paid ?? raw.totalPaid), outstandingBalance: number(raw.outstanding_balance ?? raw.outstandingBalance), creditLimit: number(raw.credit_limit ?? raw.creditLimit), paymentTermsDays: number(raw.payment_terms_days ?? raw.paymentTermsDays), createdAt: dateValue(raw.created_at ?? raw.createdAt), updatedAt: dateValue(raw.updated_at ?? raw.updatedAt), active: raw.active !== false }; }
function normalizeVariant(raw: RawRecord, categoryId?: string): ProductVariant { const current = number(raw.quantity ?? raw.current_stock ?? raw.currentStock); return { id: String(raw.id), categoryId: String(raw.category_id ?? raw.categoryId ?? categoryId ?? 'uncategorized'), name: String(raw.name ?? ''), nameAr: raw.name_ar ?? raw.nameAr ?? undefined, sku: String(raw.sku ?? ''), barcode: raw.barcode ?? undefined, unit: (raw.unit ?? 'piece') as UnitType, weightGrams: raw.weight_grams == null ? undefined : number(raw.weight_grams), packageType: raw.package_type ?? raw.packageType ?? undefined, retailPrice: number(raw.retail_price ?? raw.retailPrice), wholesalePrice: number(raw.wholesale_price ?? raw.wholesalePrice), cost: number(raw.production_cost ?? raw.cost), minStock: number(raw.min_stock ?? raw.minStock), minOrderQty: number(raw.min_order_qty ?? raw.minOrderQty, 1), expiryDays: raw.expiry_days == null ? undefined : number(raw.expiry_days), image: raw.image_url ?? raw.image ?? undefined, active: raw.active !== false, currentStock: current, priceHistory: [], createdAt: dateValue(raw.created_at ?? raw.createdAt), ...(number(raw.reserved_quantity ?? raw.reservedQuantity) > 0 ? { reservedStock: number(raw.reserved_quantity ?? raw.reservedQuantity) } : {}) } as ProductVariant; }
function normalizeOrderItem(raw: RawRecord): OrderItem { return { variantId: String(raw.variant_id ?? raw.variantId ?? ''), productName: String(raw.product_name ?? raw.productName ?? 'Produit'), unit: (raw.unit ?? 'piece') as UnitType, unitPrice: number(raw.unit_price ?? raw.unitPrice), cost: number(raw.unit_cost ?? raw.cost), quantity: number(raw.quantity), deliveredQuantity: number(raw.delivered_quantity ?? raw.deliveredQuantity), discountPercent: number(raw.discount_percent ?? raw.discountPercent), subtotal: number(raw.subtotal ?? (number(raw.quantity) * number(raw.unit_price ?? raw.unitPrice) - number(raw.discount))) }; }
function normalizeOrder(raw: RawRecord): Order { const items = Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : []; return { id: String(raw.id), orderNumber: String(raw.number ?? raw.order_number ?? raw.orderNumber ?? ''), customerId: String(raw.customer_id ?? raw.customerId ?? ''), customerName: String(raw.customer_name ?? raw.customerName ?? 'Client'), customerPhone: String(raw.customer_phone ?? raw.customerPhone ?? ''), status: raw.status === 'invoiced' ? 'delivered' : (raw.status ?? 'draft'), items, subtotal: number(raw.subtotal), discount: number(raw.discount), total: number(raw.total), totalCost: number(raw.cost_total ?? raw.totalCost), expectedProfit: number(raw.total) - number(raw.cost_total ?? raw.totalCost), paymentStatus: raw.payment_status ?? raw.paymentStatus ?? 'unpaid', paidAmount: number(raw.paid_total ?? raw.paidAmount), deliveryDate: String(raw.delivery_date ?? raw.deliveryDate ?? ''), notes: raw.notes ?? undefined, createdAt: dateValue(raw.created_at ?? raw.createdAt), updatedAt: dateValue(raw.updated_at ?? raw.updatedAt) }; }

async function read<T>(key: CacheKey, loader: () => Promise<{ items: RawRecord[] }>, normalize: (raw: RawRecord) => T[]): Promise<{ items: T[]; source: 'api' | 'cache' }> {
  if (navigator.onLine) { try { const result = await loader(); const normalized = normalize({ items: result.items }); await writeCache(key, normalized); return { items: normalized, source: 'api' }; } catch (error) { if (!isOfflineError(error)) throw error; } }
  return { items: await readCache<T>(key), source: 'cache' };
}

async function createWithFallback<T>(key: CacheKey, entity: 'customer' | 'product' | 'order', payload: RawRecord, creator: () => Promise<RawRecord>, normalize: (raw: RawRecord) => T) {
  if (navigator.onLine) { try { const created = await creator(); const item = normalize(created); const items = await readCache<T>(key); await writeCache(key, [item, ...items.filter(existing => String((existing as any).id) !== String((item as any).id))]); return { item, source: 'api' as const, queued: false }; } catch (error) { if (!isOfflineError(error)) throw error; } }
  const clientId = crypto.randomUUID();
  const localItem = normalize({ ...payload, id: clientId, _offline: true, created_at: new Date().toISOString() });
  await writeCache(key, [localItem, ...(await readCache<T>(key))]);
  offlineQueue.enqueue(entity, 'create', { ...payload, id: clientId });
  return { item: localItem, source: 'cache' as const, queued: true };
}

export const dataRepository = {
  customers: () => read<Customer>('customers', api.customers, ({ items }) => items.map(normalizeCustomer)),
  products: () => read<ProductVariant>('products', api.products, ({ items }) => items.flatMap(product => Array.isArray(product.variants) ? product.variants.map((variant: RawRecord) => normalizeVariant(variant, product.category_id)) : [])),
  orders: () => read<Order>('orders', api.orders, ({ items }) => items.map(normalizeOrder)),
  productCategories: async () => (await api.productCategories()).items,
  createCustomer: (payload: RawRecord) => createWithFallback<Customer>('customers', 'customer', payload, () => api.createCustomer(payload) as Promise<RawRecord>, normalizeCustomer),
  createProduct: (payload: RawRecord) => createWithFallback<ProductVariant>('products', 'product', payload, async () => { const raw = await api.createProduct(payload) as RawRecord; const variant = Array.isArray(raw.variants) ? raw.variants[0] : raw.variant; return variant ? { ...variant, category_id: raw.category_id ?? payload.categoryId } : raw; }, normalizeVariant),
  createOrder: (payload: RawRecord) => createWithFallback<Order>('orders', 'order', payload, () => api.createOrder(payload) as Promise<RawRecord>, normalizeOrder),
  updateVariant: async (variantId: string, payload: RawRecord) => { if (!navigator.onLine) throw new Error('La modification du catalogue nécessite une connexion pour garantir la cohérence serveur.'); const result = await api.updateVariant(variantId, payload); await dataRepository.products(); return normalizeVariant(result as RawRecord); },
  adjustStock: async (variantId: string, quantity: number, reason: string) => { if (!navigator.onLine) throw new Error('L’ajustement de stock nécessite une connexion pour éviter les écarts de stock.'); const result = await api.adjustStock({ variantId, quantity, reason }); await dataRepository.products(); return result; },
  clearCache: async () => { for (const key of ['customers','products','orders'] as CacheKey[]) { try { localStorage.removeItem(cacheKey(key)); } catch {} await removeIndexedCache(cacheKey(key)); } },
};
export type DataRepository = typeof dataRepository;
