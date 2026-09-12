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
  creditLimit?: number;
  paymentTermsDays?: number;
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
