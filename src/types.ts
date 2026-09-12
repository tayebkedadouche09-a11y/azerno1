export type UserRole = 'owner' | 'manager' | 'worker';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export type CustomerType = 'retail' | 'wholesale' | 'superette' | 'restaurant' | 'distributor';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  notes?: string;
  customPrices?: Record<string, number>;
  creditLimit: number;
  paymentTermsDays: number;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export type UnitType = 'piece' | 'kg' | 'g' | 'litre' | 'pot' | 'pack5' | 'pack10' | 'carton';
export interface ProductCategory { id: string; name: string; nameAr: string; description?: string; iconName: string; sortOrder: number; }
export interface ProductPriceHistory { date: string; retailPrice: number; wholesalePrice: number; cost: number; reason?: string; }

export interface ProductVariant {
  id: string;
  categoryId: string;
  name: string;
  nameAr?: string;
  sku: string;
  barcode?: string;
  unit: UnitType;
  weightGrams?: number;
  packageType?: string;
  retailPrice: number;
  wholesalePrice: number;
  cost: number;
  minStock: number;
  minOrderQty: number;
  expiryDays?: number;
  image?: string;
  active: boolean;
  currentStock: number;
  reservedStock?: number;
  priceHistory: ProductPriceHistory[];
  createdAt: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'preparing' | 'ready' | 'partially_delivered' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export interface OrderItem { variantId: string; productName: string; unit: UnitType; unitPrice: number; cost: number; quantity: number; deliveredQuantity: number; discountPercent?: number; subtotal: number; }
export interface Order { id: string; orderNumber: string; customerId: string; customerName: string; customerPhone: string; status: OrderStatus; items: OrderItem[]; subtotal: number; discount: number; total: number; totalCost: number; expectedProfit: number; paymentStatus: PaymentStatus; paidAmount: number; deliveryDate: string; notes?: string; createdAt: string; updatedAt: string; confirmedAt?: string; deliveredAt?: string; invoicedAt?: string; isRecurring?: boolean; }

export type MovementType = 'production' | 'sale' | 'order_reservation' | 'delivery' | 'purchase' | 'return' | 'waste' | 'adjustment';
export interface StockMovement { id: string; variantId: string; variantName: string; type: MovementType; quantity: number; previousStock: number; newStock: number; referenceType?: 'order' | 'delivery' | 'sale' | 'production' | 'waste' | 'return'; referenceId?: string; reason?: string; date: string; userId?: string; }
export interface DeliveryItem { variantId: string; productName: string; unit: UnitType; quantity: number; }
export interface Delivery { id: string; deliveryNumber: string; orderId: string; orderNumber: string; customerId: string; customerName: string; customerPhone: string; customerAddress: string; items: DeliveryItem[]; deliveryDate: string; deliveryPerson?: string; status: 'completed' | 'partial'; notes?: string; createdAt: string; }
export interface InvoiceItem { variantId: string; productName: string; unit: UnitType; unitPrice: number; quantity: number; subtotal: number; }
export interface Invoice { id: string; invoiceNumber: string; orderId?: string; orderNumber?: string; customerId: string; customerName: string; customerPhone: string; customerAddress: string; date: string; dueDate: string; items: InvoiceItem[]; subtotal: number; discount: number; total: number; paidAmount: number; balanceRemaining: number; status: PaymentStatus; notes?: string; createdAt: string; }
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';
export interface Payment { id: string; receiptNumber: string; customerId: string; customerName: string; invoiceId?: string; invoiceNumber?: string; orderId?: string; amount: number; date: string; method: PaymentMethod; notes?: string; receivedBy: string; createdAt: string; }
export interface Supplier { id: string; name: string; phone: string; address: string; materials: string[]; totalPurchases: number; totalPaid: number; balanceOwed: number; notes?: string; active: boolean; }
export interface QuickSaleItem { variantId: string; productName: string; unit: UnitType; unitPrice: number; cost: number; quantity: number; subtotal: number; }
export interface QuickSale { id: string; saleNumber: string; date: string; customerId?: string; customerName?: string; items: QuickSaleItem[]; total: number; totalCost: number; profit: number; paymentMethod: PaymentMethod; amountPaid: number; notes?: string; createdAt: string; }
export type MilkType = 'cow' | 'goat' | 'mixed';
export interface ProductionCostItem { id: string; label: string; amount: number; }
export interface ProductionBatch { id: string; batchNumber: string; productVariantId: string; productName: string; date: string; milkType: MilkType; milkInputLiters: number; milkCostPerLiter: number; additionalCosts: ProductionCostItem[]; totalCost: number; outputQuantity: number; outputUnit: UnitType; costPerUnit: number; expiryDate?: string; status: 'in_progress' | 'curing' | 'completed'; notes?: string; createdAt: string; }
export type ExpenseCategory = 'milk' | 'feed' | 'salt_materials' | 'packaging' | 'transport' | 'electricity' | 'veterinary' | 'medicine' | 'maintenance' | 'labor' | 'other';
export interface Expense { id: string; date: string; amount: number; category: ExpenseCategory; supplierId?: string; supplierName?: string; notes?: string; paymentMethod: PaymentMethod; createdAt: string; }
export interface PurchaseItem { materialName: string; quantity: number; unit: string; unitPrice: number; subtotal: number; }
export interface Purchase { id: string; purchaseNumber: string; supplierId: string; supplierName: string; date: string; items: PurchaseItem[]; total: number; paidAmount: number; balanceRemaining: number; paymentMethod: PaymentMethod; status: PaymentStatus; notes?: string; createdAt: string; }
export type AnimalType = 'cow' | 'goat';
export type AnimalStatus = 'lactating' | 'dry' | 'pregnant' | 'calf' | 'kid' | 'sold' | 'deceased';
export interface LivestockAnimal { id: string; tagNumber: string; name?: string; type: AnimalType; breed: string; birthDate?: string; gender: 'female' | 'male'; status: AnimalStatus; currentLactationLiters?: number; notes?: string; createdAt: string; }
export type LivestockEventType = 'birth' | 'purchase' | 'sale' | 'loss' | 'vaccination' | 'treatment' | 'insemination' | 'weaning';
export interface LivestockEvent { id: string; animalId?: string; animalTag?: string; animalType: AnimalType; type: LivestockEventType; date: string; cost?: number; notes?: string; veterinarian?: string; createdAt: string; }
export interface FeedRecord { id: string; date: string; feedType: string; quantity: number; unit: string; cost: number; supplierId?: string; supplierName?: string; consumedBy: 'cows' | 'goats' | 'both'; notes?: string; createdAt: string; }
export type WasteReason = 'spoiled' | 'damaged' | 'lost' | 'expired' | 'production_loss' | 'other';
export interface WasteLoss { id: string; date: string; variantId: string; variantName: string; quantity: number; unit: UnitType; estimatedLossValue: number; reason: WasteReason; notes?: string; createdAt: string; }
export interface ProductReturn { id: string; date: string; orderId?: string; customerId: string; customerName: string; variantId: string; variantName: string; quantity: number; unit: UnitType; reason: string; condition: 'resellable' | 'spoiled'; refundAmount: number; stockRestored: boolean; notes?: string; createdAt: string; }
export interface RecurringOrderSchedule { id: string; customerId: string; customerName: string; items: OrderItem[]; frequency: 'weekly' | 'biweekly' | 'monthly'; dayOfWeek: number; active: boolean; autoCreateDraft: boolean; lastGeneratedDate?: string; notes?: string; createdAt: string; }
export interface BusinessSettings { name: string; nameAr: string; slogan: string; phone: string; phoneSecondary?: string; address: string; wilaya: string; email: string; nif?: string; nis?: string; rc?: string; rib?: string; logo?: string; currency: string; documentPrefixes: { order: string; delivery: string; invoice: string; receipt: string; sale: string; batch: string; purchase: string; }; documentCounters: { order: number; delivery: number; invoice: number; receipt: number; sale: number; batch: number; purchase: number; }; defaultTerms: string; whatsappMessageTemplate: string; }
export interface AuditLog { id: string; timestamp: string; userId: string; userName: string; action: string; entity: string; entityId?: string; details: string; }
export interface NotificationItem { id: string; type: 'low_stock' | 'order_due' | 'unpaid_balance' | 'pending_delivery' | 'expiry_alert'; title: string; message: string; severity: 'warning' | 'info' | 'urgent'; timestamp: string; read: boolean; actionUrl?: string; }
export type AppLanguage = 'fr' | 'ar' | 'en';
export type AppTheme = 'light' | 'dark';
export type CompanySettings = BusinessSettings;
export interface CashRegister { cashBalance: number; bankBalance: number; }
export type Animal = LivestockAnimal;
