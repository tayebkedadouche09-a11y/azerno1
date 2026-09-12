export type UserRole = 'owner' | 'manager' | 'worker';
export type AppLanguage = 'fr' | 'ar' | 'en';
export type AppTheme = 'light' | 'dark' | 'system';
export type OrderStatus = 'draft' | 'confirmed' | 'preparing' | 'processing' | 'ready' | 'delivered' | 'partially_delivered' | 'cancelled' | 'partial';
export type PaymentStatus = 'unpaid' | 'partial' | 'partially_paid' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'bank' | 'bank_transfer' | 'transfer' | 'card' | 'cheque' | 'credit';

export interface User { id: string; name: string; role: UserRole; pin: string; phone?: string; email?: string; active: boolean; [key: string]: any; }
export type CustomerType = 'retail' | 'wholesale' | 'superette' | 'restaurant' | 'distributor';
export interface Customer { id: string; name?: string; phone?: string; address?: string; type?: CustomerType; notes?: string; customPrices?: Record<string, number>; creditLimit?: number; paymentTermsDays?: number; totalPurchases: number; totalPaid: number; outstandingBalance: number; createdAt: string; updatedAt: string; active: boolean; [key: string]: any; }
export type UnitType = 'piece' | 'kg' | 'g' | 'litre' | 'pot' | 'pack5' | 'pack10' | 'carton';
export interface ProductCategory { id: string; name: string; nameAr: string; description?: string; iconName: string; sortOrder: number; [key: string]: any; }
export interface ProductPriceHistory { date: string; retailPrice: number; wholesalePrice: number; cost: number; reason?: string; [key: string]: any; }
export interface ProductVariant { id: string; categoryId?: string; name?: string; nameAr?: string; sku?: string; barcode?: string; unit?: UnitType; weightGrams?: number; packageType?: string; retailPrice?: number; wholesalePrice?: number; cost?: number; minStock?: number; minOrderQty?: number; expiryDays?: number; image?: string; active?: boolean; currentStock?: number; reservedStock?: number; priceHistory: ProductPriceHistory[]; createdAt: string; [key: string]: any; }
export interface Supplier { id: string; name?: string; phone?: string; address?: string; email?: string; notes?: string; active?: boolean; totalPurchases?: number; totalPaid?: number; balanceOwed?: number; [key: string]: any; }
export interface StockMovement { id: string; variantId?: string; productId?: string; type?: string; quantity?: number; reason?: string; reference?: string; createdAt?: string; [key: string]: any; }
export interface OrderItem { id?: string; orderId?: string; variantId?: string; productId?: string; quantity?: number; unitPrice?: number; discount?: number; total?: number; [key: string]: any; }
export interface Order { id: string; customerId?: string; status: OrderStatus; items?: OrderItem[]; total?: number; subtotal?: number; paidAmount?: number; paymentStatus?: PaymentStatus; createdAt?: string; updatedAt?: string; [key: string]: any; }
export interface Delivery { id: string; orderId?: string; customerId?: string; status?: string; deliveredAt?: string; [key: string]: any; }
export interface Invoice { id: string; orderId?: string; customerId?: string; number?: string; total?: number; status?: string; issuedAt?: string; [key: string]: any; }
export interface Payment { id: string; orderId?: string; customerId?: string; amount?: number; method?: PaymentMethod; status?: PaymentStatus; date?: string; [key: string]: any; }
export interface QuickSale { id: string; items?: OrderItem[]; total?: number; paymentMethod?: PaymentMethod; createdAt?: string; [key: string]: any; }
export interface ProductionBatch { id: string; productId?: string; variantId?: string; quantity?: number; status?: string; cost?: number; createdAt?: string; [key: string]: any; }
export interface Expense { id: string; category?: string; description?: string; amount?: number; date?: string; paymentMethod?: PaymentMethod; idempotencyKey?: string; [key: string]: any; }
export interface Purchase { id: string; supplierId?: string; items?: OrderItem[]; total?: number; status?: string; createdAt?: string; [key: string]: any; }
export interface LivestockAnimal { id: string; tag?: string; name?: string; species?: string; breed?: string; sex?: string; status?: string; birthDate?: string; [key: string]: any; }
export interface LivestockEvent { id: string; animalId?: string; type?: string; date?: string; notes?: string; amount?: number; [key: string]: any; }
export interface FeedRecord { id: string; animalId?: string; feedType?: string; quantity?: number; cost?: number; date?: string; [key: string]: any; }
export interface WasteLoss { id: string; variantId?: string; quantity?: number; reason?: string; date?: string; [key: string]: any; }
export interface ProductReturn { id: string; orderId?: string; variantId?: string; quantity?: number; reason?: string; date?: string; [key: string]: any; }
export interface RecurringOrderSchedule { id: string; customerId?: string; frequency?: string; nextRun?: string; active?: boolean; [key: string]: any; }
export interface BusinessSettings { name: string; nameAr?: string; slogan?: string; phone?: string; phoneSecondary?: string; address?: string; wilaya?: string; email?: string; nif?: string; nis?: string; rc?: string; rib?: string; currency: string; documentPrefixes?: Record<string, string>; documentCounters?: Record<string, number>; defaultTerms?: string; whatsappMessageTemplate?: string; [key: string]: any; }
export type CompanySettings = BusinessSettings;
export interface AuditLog { id: string; userId?: string; action?: string; entity?: string; entityId?: string; details?: any; createdAt?: string; [key: string]: any; }
export interface NotificationItem { id: string; title?: string; message?: string; type?: string; read?: boolean; createdAt?: string; [key: string]: any; }
export interface CashRegister { id?: string; name?: string; cashBalance: number; bankBalance: number; balance?: number; openingBalance?: number; closingBalance?: number; date?: string; [key: string]: any; }
