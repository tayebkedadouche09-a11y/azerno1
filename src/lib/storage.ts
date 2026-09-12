import {
  User, Customer, Supplier, ProductCategory, ProductVariant, StockMovement,
  Order, OrderItem, OrderStatus, Delivery, Invoice, Payment, QuickSale, ProductionBatch, Expense,
  Purchase, LivestockAnimal, LivestockEvent, FeedRecord, WasteLoss, ProductReturn,
  RecurringOrderSchedule, BusinessSettings, AuditLog, NotificationItem,
  UserRole
} from '../types';

const STORAGE_KEY_PREFIX = 'azrnou_v1_';

// Initial Business Settings
export const DEFAULT_SETTINGS: BusinessSettings = {
  name: 'AZRNOU Fromagerie & Élevage',
  nameAr: 'أزرنو للأجبان وتربية المواشي',
  slogan: 'L\'excellence du terroir laitier & fromager artisanal',
  phone: '+213 550 12 34 56',
  phoneSecondary: '+213 661 78 90 12',
  address: 'Zone Rurale Agricole, Route Nationale N° 12',
  wilaya: 'Tizi Ouzou, Algérie',
  email: 'contact@azrnou-fromagerie.dz',
  nif: '099815024891234',
  nis: '1988150200123',
  rc: '15/00-1284920B21',
  rib: '002 00015 1520001234 45 (BEA)',
  currency: 'DA',
  documentPrefixes: {
    order: 'BC-',
    delivery: 'BL-',
    invoice: 'FAC-',
    receipt: 'REC-',
    sale: 'VNT-',
    batch: 'LOT-',
    purchase: 'ACH-'
  },
  documentCounters: {
    order: 104,
    delivery: 88,
    invoice: 102,
    receipt: 76,
    sale: 215,
    batch: 34,
    purchase: 42
  },
  defaultTerms: 'Règlement à réception sauf accord commercial préalable. Marchandise vérifiée à la livraison.',
  whatsappMessageTemplate: 'Bonjour {customer}, voici votre document {docNumber} d\'un montant de {amount} DA de la part de AZRNOU Fromagerie. Merci pour votre confiance !'
};

// Default Users
export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_owner',
    name: 'Karim Azrnou',
    role: 'owner',
    pin: '1234',
    phone: '+213 550 12 34 56',
    email: 'karim@azrnou.dz',
    active: true
  },
  {
    id: 'usr_manager',
    name: 'Amina Mansouri',
    role: 'manager',
    pin: '5678',
    phone: '+213 551 22 33 44',
    email: 'compta@azrnou.dz',
    active: true
  },
  {
    id: 'usr_worker',
    name: 'Youcef Kaci',
    role: 'worker',
    pin: '0000',
    phone: '+213 552 99 88 77',
    active: true
  }
];

// Product Categories
export const DEFAULT_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat_goat_cheese',
    name: 'Fromage de Chèvre',
    nameAr: 'جبن الماعز',
    description: 'Fromages fermiers pur chèvre au lait cru affiné et frais',
    iconName: 'Sparkles',
    sortOrder: 1
  },
  {
    id: 'cat_cow_cheese',
    name: 'Fromage de Vache',
    nameAr: 'جبن البقر',
    description: 'Tomme, pâte pressée, gouda et camembert artisanal',
    iconName: 'Shield',
    sortOrder: 2
  },
  {
    id: 'cat_fresh_dairy',
    name: 'Produits Frais & Lait',
    nameAr: 'ألبان وحليب طازج',
    description: 'Lait entier pasteurisé, beurre fermier, petit-lait et caillé',
    iconName: 'Milk',
    sortOrder: 3
  }
];

// Product Variants
export const DEFAULT_VARIANTS: ProductVariant[] = [
  {
    id: 'var_goat_fresh_250',
    categoryId: 'cat_goat_cheese',
    name: 'Crottin de Chèvre Frais 250g',
    nameAr: 'جبن ماعز طازج 250 غ',
    sku: 'CHEV-FR-250',
    barcode: '613000100101',
    unit: 'piece',
    weightGrams: 250,
    packageType: 'Barquette thermoformée',
    retailPrice: 550,
    wholesalePrice: 460,
    cost: 290,
    minStock: 25,
    minOrderQty: 5,
    expiryDays: 21,
    active: true,
    currentStock: 65,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 500, wholesalePrice: 420, cost: 270, reason: 'Prix initial' },
      { date: '2026-06-01', retailPrice: 550, wholesalePrice: 460, cost: 290, reason: 'Hausse coût emballage et alimentation' }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_goat_herbs_250',
    categoryId: 'cat_goat_cheese',
    name: 'Chèvre Frais aux Fines Herbes 250g',
    nameAr: 'جبن ماعز بالأعشاب 250 غ',
    sku: 'CHEV-HB-250',
    barcode: '613000100102',
    unit: 'piece',
    weightGrams: 250,
    packageType: 'Barquette',
    retailPrice: 600,
    wholesalePrice: 500,
    cost: 320,
    minStock: 20,
    minOrderQty: 5,
    expiryDays: 21,
    active: true,
    currentStock: 40,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 600, wholesalePrice: 500, cost: 320, reason: 'Création' }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_goat_aged_kg',
    categoryId: 'cat_goat_cheese',
    name: 'Bûche de Chèvre Cendrée Affinée (au kg)',
    nameAr: 'جبن ماعز معتق رمادي (بالكلغ)',
    sku: 'CHEV-AFF-KG',
    barcode: '613000100103',
    unit: 'kg',
    packageType: 'Papier paraffiné',
    retailPrice: 2800,
    wholesalePrice: 2400,
    cost: 1550,
    minStock: 10,
    minOrderQty: 1,
    expiryDays: 60,
    active: true,
    currentStock: 18,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 2800, wholesalePrice: 2400, cost: 1550 }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_cow_tomme_kg',
    categoryId: 'cat_cow_cheese',
    name: 'Tomme Fermière de Vache Affinée 3 Mois (au kg)',
    nameAr: 'جبن التوم البقري المعتق 3 أشهر (بالكلغ)',
    sku: 'VACH-TOM-KG',
    barcode: '613000100201',
    unit: 'kg',
    packageType: 'Meule entière / sous-vide',
    retailPrice: 2200,
    wholesalePrice: 1850,
    cost: 1100,
    minStock: 15,
    minOrderQty: 1,
    expiryDays: 90,
    active: true,
    currentStock: 42,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 2200, wholesalePrice: 1850, cost: 1100 }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_cow_gouda_500',
    categoryId: 'cat_cow_cheese',
    name: 'Gouda Fermier Artisanal 500g',
    nameAr: 'جبن غودا حرفي 500 غ',
    sku: 'VACH-GOU-500',
    barcode: '613000100202',
    unit: 'piece',
    weightGrams: 500,
    packageType: 'Sous-vide thermo',
    retailPrice: 1200,
    wholesalePrice: 1000,
    cost: 620,
    minStock: 30,
    minOrderQty: 5,
    expiryDays: 60,
    active: true,
    currentStock: 52,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 1200, wholesalePrice: 1000, cost: 620 }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_cow_butter_500',
    categoryId: 'cat_fresh_dairy',
    name: 'Beurre Fermier Cru Artisanal 500g',
    nameAr: 'زبدة ريفية طبيعية 500 غ',
    sku: 'LAIT-BEUR-500',
    barcode: '613000100301',
    unit: 'piece',
    weightGrams: 500,
    packageType: 'Papier beurrier traditionnel',
    retailPrice: 900,
    wholesalePrice: 780,
    cost: 490,
    minStock: 15,
    minOrderQty: 4,
    expiryDays: 15,
    active: true,
    currentStock: 22,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 900, wholesalePrice: 780, cost: 490 }
    ],
    createdAt: '2026-01-10'
  },
  {
    id: 'var_fresh_milk_raw_l',
    categoryId: 'cat_fresh_dairy',
    name: 'Lait Cru Entier de Ferme (1 Litre)',
    nameAr: 'حليب خام طازج كامل الدسم (1 لتر)',
    sku: 'LAIT-CRU-1L',
    barcode: '613000100302',
    unit: 'litre',
    packageType: 'Bouteille verre consigné',
    retailPrice: 140,
    wholesalePrice: 115,
    cost: 75,
    minStock: 40,
    minOrderQty: 10,
    expiryDays: 3,
    active: true,
    currentStock: 95,
    priceHistory: [
      { date: '2026-01-10', retailPrice: 140, wholesalePrice: 115, cost: 75 }
    ],
    createdAt: '2026-01-10'
  }
];

// Realistic Initial Customers
export const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_ahmed',
    name: 'Ahmed Benali (Superette El-Djazair)',
    phone: '+213 550 44 55 66',
    address: '14 Rue Larbi Ben M\'hidi, Alger Centre',
    type: 'superette',
    notes: 'Client régulier. Livraison hebdomadaire le lundi matin.',
    customPrices: {
      'var_goat_fresh_250': 450,
      'var_cow_gouda_500': 980
    },
    totalPurchases: 284000,
    totalPaid: 242000,
    outstandingBalance: 42000,
    createdAt: '2026-01-15',
    updatedAt: '2026-09-10',
    active: true
  },
  {
    id: 'cust_boulangerie_baraka',
    name: 'Boulangerie & Pâtisserie El-Baraka',
    phone: '+213 661 33 22 11',
    address: 'Boulevard Colonel Amirouche, Bab Ezzouar',
    type: 'restaurant',
    notes: 'Achète principalement le beurre fermier et crottin de chèvre.',
    totalPurchases: 145000,
    totalPaid: 145000,
    outstandingBalance: 0,
    createdAt: '2026-02-01',
    updatedAt: '2026-09-08',
    active: true
  },
  {
    id: 'cust_epicerie_atlas',
    name: 'Épicerie Fine Atlas Gourmet',
    phone: '+213 770 88 99 00',
    address: 'Route de Chéraga, Dely Brahim',
    type: 'wholesale',
    notes: 'Grand volume sur les fromages affinés (tommes et bûches cendrées).',
    totalPurchases: 420000,
    totalPaid: 360000,
    outstandingBalance: 60000,
    createdAt: '2026-02-15',
    updatedAt: '2026-09-11',
    active: true
  },
  {
    id: 'cust_particulier_salim',
    name: 'Dr. Salim Bouzid',
    phone: '+213 552 11 44 77',
    address: 'Résidence Les Pins, Hydra',
    type: 'retail',
    notes: 'Commandes privées mensuelles de panier dégustation.',
    totalPurchases: 32000,
    totalPaid: 32000,
    outstandingBalance: 0,
    createdAt: '2026-03-10',
    updatedAt: '2026-09-05',
    active: true
  }
];

// Suppliers
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_ferme_bouira',
    name: 'Coopérative Laitière de Bouira',
    phone: '+213 26 93 10 20',
    address: 'Zone d\'Activités, Bouira',
    materials: ['Lait cru de vache', 'Présure naturelle', 'Ferments lactiques'],
    totalPurchases: 540000,
    totalPaid: 480000,
    balanceOwed: 60000,
    notes: 'Livraison de lait frais tous les deux jours par camion isotherme.',
    active: true
  },
  {
    id: 'sup_agro_fourrage',
    name: 'Agro-Fourrage & Nutrition Animale',
    phone: '+213 24 81 40 50',
    address: 'Bordj Bou Arréridj',
    materials: ['Balles de luzerne', 'Foin de prairie', 'Aliment concentré 18%'],
    totalPurchases: 320000,
    totalPaid: 320000,
    balanceOwed: 0,
    notes: 'Fournisseur d\'alimentation certifié.',
    active: true
  },
  {
    id: 'sup_plast_emballage',
    name: 'Emballages & Plastiques du Maghreb',
    phone: '+213 21 82 12 34',
    address: 'Zone Industrielle Oued Smar, Alger',
    materials: ['Barquettes thermo', 'Papier beurrier', 'Étiquettes imprimées', 'Poches sous-vide'],
    totalPurchases: 180000,
    totalPaid: 165000,
    balanceOwed: 15000,
    notes: 'Délai d\'impression 7 jours.',
    active: true
  }
];

// Initial Orders
export const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord_101',
    orderNumber: 'BC-000101',
    customerId: 'cust_ahmed',
    customerName: 'Ahmed Benali (Superette El-Djazair)',
    customerPhone: '+213 550 44 55 66',
    status: 'delivered',
    items: [
      {
        variantId: 'var_goat_fresh_250',
        productName: 'Crottin de Chèvre Frais 250g',
        unit: 'piece',
        unitPrice: 450, // Custom negotiated price
        cost: 290,
        quantity: 50,
        deliveredQuantity: 50,
        subtotal: 22500
      },
      {
        variantId: 'var_cow_gouda_500',
        productName: 'Gouda Fermier Artisanal 500g',
        unit: 'piece',
        unitPrice: 980, // Custom negotiated price
        cost: 620,
        quantity: 30,
        deliveredQuantity: 30,
        subtotal: 29400
      }
    ],
    subtotal: 51900,
    discount: 0,
    total: 51900,
    totalCost: 33100,
    expectedProfit: 18800,
    paymentStatus: 'paid',
    paidAmount: 51900,
    deliveryDate: '2026-09-08',
    createdAt: '2026-09-06T08:30:00Z',
    updatedAt: '2026-09-08T14:20:00Z',
    confirmedAt: '2026-09-06T09:00:00Z',
    deliveredAt: '2026-09-08T11:00:00Z',
    invoicedAt: '2026-09-08T11:30:00Z'
  },
  {
    id: 'ord_102',
    orderNumber: 'BC-000102',
    customerId: 'cust_epicerie_atlas',
    customerName: 'Épicerie Fine Atlas Gourmet',
    customerPhone: '+213 770 88 99 00',
    status: 'partially_delivered',
    items: [
      {
        variantId: 'var_cow_tomme_kg',
        productName: 'Tomme Fermière de Vache Affinée 3 Mois (au kg)',
        unit: 'kg',
        unitPrice: 1850,
        cost: 1100,
        quantity: 20,
        deliveredQuantity: 12, // 8 pending
        subtotal: 37000
      },
      {
        variantId: 'var_goat_aged_kg',
        productName: 'Bûche de Chèvre Cendrée Affinée (au kg)',
        unit: 'kg',
        unitPrice: 2400,
        cost: 1550,
        quantity: 15,
        deliveredQuantity: 15,
        subtotal: 36000
      }
    ],
    subtotal: 73000,
    discount: 0,
    total: 73000,
    totalCost: 45250,
    expectedProfit: 27750,
    paymentStatus: 'partially_paid',
    paidAmount: 35000,
    deliveryDate: '2026-09-11',
    notes: 'Reste 8kg de Tomme à livrer dès fin d\'affinage.',
    createdAt: '2026-09-09T10:00:00Z',
    updatedAt: '2026-09-11T16:00:00Z',
    confirmedAt: '2026-09-09T10:15:00Z',
    deliveredAt: '2026-09-11T15:30:00Z',
    invoicedAt: '2026-09-11T16:00:00Z'
  },
  {
    id: 'ord_103',
    orderNumber: 'BC-000103',
    customerId: 'cust_ahmed',
    customerName: 'Ahmed Benali (Superette El-Djazair)',
    customerPhone: '+213 550 44 55 66',
    status: 'confirmed',
    items: [
      {
        variantId: 'var_goat_fresh_250',
        productName: 'Crottin de Chèvre Frais 250g',
        unit: 'piece',
        unitPrice: 450,
        cost: 290,
        quantity: 100,
        deliveredQuantity: 0,
        subtotal: 45000
      },
      {
        variantId: 'var_cow_gouda_500',
        productName: 'Gouda Fermier Artisanal 500g',
        unit: 'piece',
        unitPrice: 980,
        cost: 620,
        quantity: 50,
        deliveredQuantity: 0,
        subtotal: 49000
      }
    ],
    subtotal: 94000,
    discount: 0,
    total: 94000,
    totalCost: 60000,
    expectedProfit: 34000,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    deliveryDate: '2026-09-13', // Demain
    notes: 'Commande hebdomadaire principale.',
    createdAt: '2026-09-12T07:15:00Z',
    updatedAt: '2026-09-12T07:20:00Z',
    confirmedAt: '2026-09-12T07:20:00Z'
  }
];

// Initial Invoices
export const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv_101',
    invoiceNumber: 'FAC-000101',
    orderId: 'ord_101',
    orderNumber: 'BC-000101',
    customerId: 'cust_ahmed',
    customerName: 'Ahmed Benali (Superette El-Djazair)',
    customerPhone: '+213 550 44 55 66',
    customerAddress: '14 Rue Larbi Ben M\'hidi, Alger Centre',
    date: '2026-09-08',
    dueDate: '2026-09-22',
    items: [
      {
        variantId: 'var_goat_fresh_250',
        productName: 'Crottin de Chèvre Frais 250g',
        unit: 'piece',
        unitPrice: 450,
        quantity: 50,
        subtotal: 22500
      },
      {
        variantId: 'var_cow_gouda_500',
        productName: 'Gouda Fermier Artisanal 500g',
        unit: 'piece',
        unitPrice: 980,
        quantity: 30,
        subtotal: 29400
      }
    ],
    subtotal: 51900,
    discount: 0,
    total: 51900,
    paidAmount: 51900,
    balanceRemaining: 0,
    status: 'paid',
    createdAt: '2026-09-08'
  },
  {
    id: 'inv_102',
    invoiceNumber: 'FAC-000102',
    orderId: 'ord_102',
    orderNumber: 'BC-000102',
    customerId: 'cust_epicerie_atlas',
    customerName: 'Épicerie Fine Atlas Gourmet',
    customerPhone: '+213 770 88 99 00',
    customerAddress: 'Route de Chéraga, Dely Brahim',
    date: '2026-09-11',
    dueDate: '2026-09-25',
    items: [
      {
        variantId: 'var_cow_tomme_kg',
        productName: 'Tomme Fermière de Vache Affinée 3 Mois (au kg)',
        unit: 'kg',
        unitPrice: 1850,
        quantity: 12,
        subtotal: 22200
      },
      {
        variantId: 'var_goat_aged_kg',
        productName: 'Bûche de Chèvre Cendrée Affinée (au kg)',
        unit: 'kg',
        unitPrice: 2400,
        quantity: 15,
        subtotal: 36000
      }
    ],
    subtotal: 58200,
    discount: 0,
    total: 58200,
    paidAmount: 35000,
    balanceRemaining: 23200,
    status: 'partially_paid',
    notes: 'Acompte versé par virement. Solde à réception du reliquat de tomme.',
    createdAt: '2026-09-11'
  }
];

// Deliveries
export const DEFAULT_DELIVERIES: Delivery[] = [
  {
    id: 'del_087',
    deliveryNumber: 'BL-000087',
    orderId: 'ord_101',
    orderNumber: 'BC-000101',
    customerId: 'cust_ahmed',
    customerName: 'Ahmed Benali (Superette El-Djazair)',
    customerPhone: '+213 550 44 55 66',
    customerAddress: '14 Rue Larbi Ben M\'hidi, Alger Centre',
    items: [
      {
        variantId: 'var_goat_fresh_250',
        productName: 'Crottin de Chèvre Frais 250g',
        unit: 'piece',
        quantity: 50
      },
      {
        variantId: 'var_cow_gouda_500',
        productName: 'Gouda Fermier Artisanal 500g',
        unit: 'piece',
        quantity: 30
      }
    ],
    deliveryDate: '2026-09-08',
    deliveryPerson: 'Youcef Kaci',
    status: 'completed',
    createdAt: '2026-09-08'
  },
  {
    id: 'del_088',
    deliveryNumber: 'BL-000088',
    orderId: 'ord_102',
    orderNumber: 'BC-000102',
    customerId: 'cust_epicerie_atlas',
    customerName: 'Épicerie Fine Atlas Gourmet',
    customerPhone: '+213 770 88 99 00',
    customerAddress: 'Route de Chéraga, Dely Brahim',
    items: [
      {
        variantId: 'var_cow_tomme_kg',
        productName: 'Tomme Fermière de Vache Affinée 3 Mois (au kg)',
        unit: 'kg',
        quantity: 12
      },
      {
        variantId: 'var_goat_aged_kg',
        productName: 'Bûche de Chèvre Cendrée Affinée (au kg)',
        unit: 'kg',
        quantity: 15
      }
    ],
    deliveryDate: '2026-09-11',
    deliveryPerson: 'Youcef Kaci',
    status: 'partial',
    notes: 'Livraison partielle. 8kg de tomme restent en cave d\'affinage.',
    createdAt: '2026-09-11'
  }
];

// Payments
export const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 'pay_075',
    receiptNumber: 'REC-000075',
    customerId: 'cust_ahmed',
    customerName: 'Ahmed Benali (Superette El-Djazair)',
    invoiceId: 'inv_101',
    invoiceNumber: 'FAC-000101',
    orderId: 'ord_101',
    amount: 51900,
    date: '2026-09-08',
    method: 'cash',
    notes: 'Règlement intégral en espèces à la livraison.',
    receivedBy: 'Youcef Kaci',
    createdAt: '2026-09-08T11:45:00Z'
  },
  {
    id: 'pay_076',
    receiptNumber: 'REC-000076',
    customerId: 'cust_epicerie_atlas',
    customerName: 'Épicerie Fine Atlas Gourmet',
    invoiceId: 'inv_102',
    invoiceNumber: 'FAC-000102',
    orderId: 'ord_102',
    amount: 35000,
    date: '2026-09-11',
    method: 'bank_transfer',
    notes: 'Virement BEA réf TRF-9921.',
    receivedBy: 'Amina Mansouri',
    createdAt: '2026-09-11T16:15:00Z'
  }
];

// Production Batches
export const DEFAULT_BATCHES: ProductionBatch[] = [
  {
    id: 'batch_033',
    batchNumber: 'LOT-2026-033',
    productVariantId: 'var_goat_fresh_250',
    productName: 'Crottin de Chèvre Frais 250g',
    date: '2026-09-09',
    milkType: 'goat',
    milkInputLiters: 180,
    milkCostPerLiter: 90, // 16,200 DA
    additionalCosts: [
      { id: 'c1', label: 'Ferments & Présure', amount: 950 },
      { id: 'c2', label: 'Barquettes & Étiquettes (120 pcs)', amount: 1800 },
      { id: 'c3', label: 'Main d\'œuvre & Énergie', amount: 3500 }
    ],
    totalCost: 22450,
    outputQuantity: 120,
    outputUnit: 'piece',
    costPerUnit: 187,
    expiryDate: '2026-09-30',
    status: 'completed',
    notes: 'Excellente prise de caillé. Rendement optimal.',
    createdAt: '2026-09-09'
  },
  {
    id: 'batch_034',
    batchNumber: 'LOT-2026-034',
    productVariantId: 'var_cow_gouda_500',
    productName: 'Gouda Fermier Artisanal 500g',
    date: '2026-09-11',
    milkType: 'cow',
    milkInputLiters: 500,
    milkCostPerLiter: 65, // 32,500 DA
    additionalCosts: [
      { id: 'c1', label: 'Ferments spécifiques Gouda', amount: 1600 },
      { id: 'c2', label: 'Sels de saumurage & épices', amount: 800 },
      { id: 'c3', label: 'Sachets sous-vide & étiquettes', amount: 2400 },
      { id: 'c4', label: 'Énergie & Affinage', amount: 4800 }
    ],
    totalCost: 42100,
    outputQuantity: 70, // 35 kg total = 70 pièces 500g
    outputUnit: 'piece',
    costPerUnit: 601,
    expiryDate: '2026-11-10',
    status: 'curing',
    notes: 'En cave d\'affinage à 12°C.',
    createdAt: '2026-09-11'
  }
];

// Expenses
export const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    date: '2026-09-10',
    amount: 14500,
    category: 'veterinary',
    supplierName: 'Cabinet Vétérinaire Dr. Medjdoub',
    notes: 'Visite de contrôle sanitaire du troupeau caprin & vitamines.',
    paymentMethod: 'cash',
    createdAt: '2026-09-10'
  },
  {
    id: 'exp_02',
    date: '2026-09-08',
    amount: 8500,
    category: 'transport',
    supplierName: 'Station Naftal',
    notes: 'Gasoil pour la camionnette frigorifique de livraison.',
    paymentMethod: 'cash',
    createdAt: '2026-09-08'
  },
  {
    id: 'exp_03',
    date: '2026-09-05',
    amount: 22000,
    category: 'electricity',
    supplierName: 'Sonelgaz',
    notes: 'Facture d\'énergie chambres froides et atelier de fabrication.',
    paymentMethod: 'bank_transfer',
    createdAt: '2026-09-05'
  }
];

// Livestock: Cows and Goats
export const DEFAULT_LIVESTOCK: LivestockAnimal[] = [
  {
    id: 'ani_c01',
    tagNumber: 'DZ-15-V01',
    name: 'Bella',
    type: 'cow',
    breed: 'Montbéliarde',
    birthDate: '2022-04-12',
    gender: 'female',
    status: 'lactating',
    currentLactationLiters: 24,
    notes: 'Très bonne laitière, lait riche en matière grasse.',
    createdAt: '2024-01-01'
  },
  {
    id: 'ani_c02',
    tagNumber: 'DZ-15-V02',
    name: 'Étoile',
    type: 'cow',
    breed: 'Montbéliarde',
    birthDate: '2023-01-20',
    gender: 'female',
    status: 'lactating',
    currentLactationLiters: 22,
    createdAt: '2024-01-01'
  },
  {
    id: 'ani_c03',
    tagNumber: 'DZ-15-V03',
    name: 'Princesse',
    type: 'cow',
    breed: 'Holstein',
    birthDate: '2021-08-15',
    gender: 'female',
    status: 'pregnant',
    currentLactationLiters: 14,
    notes: 'Tarissement prévu dans 3 semaines.',
    createdAt: '2024-01-01'
  },
  {
    id: 'ani_g01',
    tagNumber: 'DZ-15-C01',
    name: 'Blanchette',
    type: 'goat',
    breed: 'Saanen',
    birthDate: '2023-03-10',
    gender: 'female',
    status: 'lactating',
    currentLactationLiters: 3.8,
    createdAt: '2024-02-01'
  },
  {
    id: 'ani_g02',
    tagNumber: 'DZ-15-C02',
    name: 'Noisette',
    type: 'goat',
    breed: 'Alpine Chamoisée',
    birthDate: '2023-04-05',
    gender: 'female',
    status: 'lactating',
    currentLactationLiters: 3.5,
    createdAt: '2024-02-01'
  },
  {
    id: 'ani_g03',
    tagNumber: 'DZ-15-C03',
    name: 'Sultan',
    type: 'goat',
    breed: 'Alpine',
    birthDate: '2022-02-14',
    gender: 'male',
    status: 'dry',
    notes: 'Bouc reproducteur principal.',
    createdAt: '2024-02-01'
  }
];

// Livestock Events
export const DEFAULT_LIVESTOCK_EVENTS: LivestockEvent[] = [
  {
    id: 'ev_01',
    animalId: 'ani_c01',
    animalTag: 'DZ-15-V01',
    animalType: 'cow',
    type: 'vaccination',
    date: '2026-08-20',
    cost: 3500,
    notes: 'Vaccination annuelle contre la fièvre aphteuse & entérotoxémie.',
    veterinarian: 'Dr. Medjdoub',
    createdAt: '2026-08-20'
  },
  {
    id: 'ev_02',
    animalType: 'goat',
    type: 'birth',
    date: '2026-08-15',
    notes: 'Naissance de 2 chevreaux en parfaite santé.',
    createdAt: '2026-08-15'
  }
];

// Feed Records
export const DEFAULT_FEED_RECORDS: FeedRecord[] = [
  {
    id: 'fd_01',
    date: '2026-09-08',
    feedType: 'Luzerne déshydratée en balles',
    quantity: 40,
    unit: 'balles',
    cost: 48000,
    supplierName: 'Agro-Fourrage',
    consumedBy: 'both',
    notes: 'Stock pour 2 semaines.',
    createdAt: '2026-09-08'
  },
  {
    id: 'fd_02',
    date: '2026-09-02',
    feedType: 'Aliment concentré VL 18%',
    quantity: 25,
    unit: 'sacs 50kg',
    cost: 62500,
    supplierName: 'Agro-Fourrage',
    consumedBy: 'cows',
    notes: 'Ration de production laitière.',
    createdAt: '2026-09-02'
  }
];

// Quick Sales
export const DEFAULT_QUICK_SALES: QuickSale[] = [
  {
    id: 'sale_214',
    saleNumber: 'VNT-000214',
    date: '2026-09-11T16:45:00Z',
    customerName: 'Client Comptoir (Mme. Chaib)',
    items: [
      {
        variantId: 'var_goat_fresh_250',
        productName: 'Crottin de Chèvre Frais 250g',
        unit: 'piece',
        unitPrice: 550,
        cost: 290,
        quantity: 2,
        subtotal: 1100
      },
      {
        variantId: 'var_cow_butter_500',
        productName: 'Beurre Fermier Cru Artisanal 500g',
        unit: 'piece',
        unitPrice: 900,
        cost: 490,
        quantity: 1,
        subtotal: 900
      }
    ],
    total: 2000,
    totalCost: 1070,
    profit: 930,
    paymentMethod: 'cash',
    amountPaid: 2000,
    createdAt: '2026-09-11T16:45:00Z'
  },
  {
    id: 'sale_215',
    saleNumber: 'VNT-000215',
    date: '2026-09-12T07:30:00Z',
    customerName: 'Client Comptoir (M. Larbi)',
    items: [
      {
        variantId: 'var_cow_gouda_500',
        productName: 'Gouda Fermier Artisanal 500g',
        unit: 'piece',
        unitPrice: 1200,
        cost: 620,
        quantity: 1,
        subtotal: 1200
      },
      {
        variantId: 'var_fresh_milk_raw_l',
        productName: 'Lait Cru Entier de Ferme (1 Litre)',
        unit: 'litre',
        unitPrice: 140,
        cost: 75,
        quantity: 3,
        subtotal: 420
      }
    ],
    total: 1620,
    totalCost: 845,
    profit: 775,
    paymentMethod: 'cash',
    amountPaid: 1620,
    createdAt: '2026-09-12T07:30:00Z'
  }
];

// Audit Log initial
export const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-09-12T07:20:00Z',
    userId: 'usr_owner',
    userName: 'Karim Azrnou',
    action: 'CONFIRM_ORDER',
    entity: 'Order',
    entityId: 'ord_103',
    details: 'Confirmation commande BC-000103 pour Superette El-Djazair (94 000 DA)'
  },
  {
    id: 'log_02',
    timestamp: '2026-09-11T16:15:00Z',
    userId: 'usr_manager',
    userName: 'Amina Mansouri',
    action: 'RECORD_PAYMENT',
    entity: 'Payment',
    entityId: 'pay_076',
    details: 'Enregistrement acompte virement de 35 000 DA pour Épicerie Fine Atlas'
  }
];

// Persistent State Holder
interface DatabaseState {
  settings: BusinessSettings;
  users: User[];
  currentUser: User;
  categories: ProductCategory[];
  variants: ProductVariant[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  deliveries: Delivery[];
  invoices: Invoice[];
  payments: Payment[];
  quickSales: QuickSale[];
  batches: ProductionBatch[];
  expenses: Expense[];
  purchases: Purchase[];
  livestock: LivestockAnimal[];
  livestockEvents: LivestockEvent[];
  feedRecords: FeedRecord[];
  wasteLosses: WasteLoss[];
  productReturns: ProductReturn[];
  recurringOrders: RecurringOrderSchedule[];
  auditLogs: AuditLog[];
  syncPending: number;
}

class StorageEngine {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}db`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          settings: parsed.settings || DEFAULT_SETTINGS,
          users: parsed.users || DEFAULT_USERS,
          currentUser: parsed.currentUser || DEFAULT_USERS[0],
          categories: parsed.categories || DEFAULT_CATEGORIES,
          variants: parsed.variants || DEFAULT_VARIANTS,
          customers: parsed.customers || DEFAULT_CUSTOMERS,
          suppliers: parsed.suppliers || DEFAULT_SUPPLIERS,
          orders: parsed.orders || DEFAULT_ORDERS,
          deliveries: parsed.deliveries || DEFAULT_DELIVERIES,
          invoices: parsed.invoices || DEFAULT_INVOICES,
          payments: parsed.payments || DEFAULT_PAYMENTS,
          quickSales: parsed.quickSales || DEFAULT_QUICK_SALES,
          batches: parsed.batches || DEFAULT_BATCHES,
          expenses: parsed.expenses || DEFAULT_EXPENSES,
          purchases: parsed.purchases || [],
          livestock: parsed.livestock || DEFAULT_LIVESTOCK,
          livestockEvents: parsed.livestockEvents || DEFAULT_LIVESTOCK_EVENTS,
          feedRecords: parsed.feedRecords || DEFAULT_FEED_RECORDS,
          wasteLosses: parsed.wasteLosses || [],
          productReturns: parsed.productReturns || [],
          recurringOrders: parsed.recurringOrders || [],
          auditLogs: parsed.auditLogs || DEFAULT_AUDIT_LOGS,
          syncPending: parsed.syncPending || 0
        };
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }

    // Default Fresh Setup
    return {
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      currentUser: DEFAULT_USERS[0],
      categories: DEFAULT_CATEGORIES,
      variants: DEFAULT_VARIANTS,
      customers: DEFAULT_CUSTOMERS,
      suppliers: DEFAULT_SUPPLIERS,
      orders: DEFAULT_ORDERS,
      deliveries: DEFAULT_DELIVERIES,
      invoices: DEFAULT_INVOICES,
      payments: DEFAULT_PAYMENTS,
      quickSales: DEFAULT_QUICK_SALES,
      batches: DEFAULT_BATCHES,
      expenses: DEFAULT_EXPENSES,
      purchases: [],
      livestock: DEFAULT_LIVESTOCK,
      livestockEvents: DEFAULT_LIVESTOCK_EVENTS,
      feedRecords: DEFAULT_FEED_RECORDS,
      wasteLosses: [],
      productReturns: [],
      recurringOrders: [],
      auditLogs: DEFAULT_AUDIT_LOGS,
      syncPending: 0
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}db`, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to persist state to localStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch (err) { console.error('Storage listener error', err); }
    });
  }

  // --- Audit Log ---
  public logAudit(action: string, entity: string, details: string, entityId?: string) {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: this.state.currentUser.id,
      userName: this.state.currentUser.name,
      action,
      entity,
      entityId,
      details
    };
    this.state.auditLogs = [newLog, ...this.state.auditLogs.slice(0, 199)];
  }

  // --- Getters ---
  public getState(): DatabaseState {
    return this.state;
  }

  public getSettings(): BusinessSettings {
    return this.state.settings;
  }

  public getCurrentUser(): User {
    return this.state.currentUser;
  }

  public setCurrentUser(userId: string): boolean {
    const user = this.state.users.find(u => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      this.logAudit('USER_SWITCH', 'User', `Utilisateur actif changé vers ${user.name}`);
      this.saveState();
      return true;
    }
    return false;
  }

  public getCategories(): ProductCategory[] {
    return this.state.categories;
  }

  public getVariants(): ProductVariant[] {
    return this.state.variants;
  }

  public getActiveVariants(): ProductVariant[] {
    return this.state.variants.filter(v => v.active);
  }

  public getCustomers(): Customer[] {
    return this.state.customers;
  }

  public getSuppliers(): Supplier[] {
    return this.state.suppliers;
  }

  public getOrders(): Order[] {
    return this.state.orders;
  }

  public getDeliveries(): Delivery[] {
    return this.state.deliveries;
  }

  public getInvoices(): Invoice[] {
    return this.state.invoices;
  }

  public getPayments(): Payment[] {
    return this.state.payments;
  }

  public getQuickSales(): QuickSale[] {
    return this.state.quickSales;
  }

  public getBatches(): ProductionBatch[] {
    return this.state.batches;
  }

  public getExpenses(): Expense[] {
    return this.state.expenses;
  }

  public getPurchases(): Purchase[] {
    return this.state.purchases;
  }

  public getLivestock(): LivestockAnimal[] {
    return this.state.livestock;
  }

  public getLivestockEvents(): LivestockEvent[] {
    return this.state.livestockEvents;
  }

  public getFeedRecords(): FeedRecord[] {
    return this.state.feedRecords;
  }

  public getWasteLosses(): WasteLoss[] {
    return this.state.wasteLosses;
  }

  public getProductReturns(): ProductReturn[] {
    return this.state.productReturns;
  }

  public getRecurringOrders(): RecurringOrderSchedule[] {
    return this.state.recurringOrders;
  }

  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  // --- Real Stock Calculation (Current, Reserved, Available) ---
  public getStockBreakdown(variantId: string): { current: number; reserved: number; available: number } {
    const variant = this.state.variants.find(v => v.id === variantId);
    const current = variant ? variant.currentStock : 0;

    // Reserved stock comes from confirmed or preparing or ready orders that have not yet been delivered
    let reserved = 0;
    this.state.orders.forEach(order => {
      if (['confirmed', 'preparing', 'ready', 'partially_delivered'].includes(order.status)) {
        const item = order.items.find(i => i.variantId === variantId);
        if (item) {
          const remainingToDeliver = Math.max(0, item.quantity - item.deliveredQuantity);
          reserved += remainingToDeliver;
        }
      }
    });

    const available = Math.max(0, current - reserved);
    return { current, reserved, available };
  }

  // --- Document Numbering helper ---
  public nextDocNumber(type: 'order' | 'delivery' | 'invoice' | 'receipt' | 'sale' | 'batch' | 'purchase'): string {
    const prefix = this.state.settings.documentPrefixes[type] || 'DOC-';
    const counter = (this.state.settings.documentCounters[type] || 1) + 1;
    this.state.settings.documentCounters[type] = counter;
    return `${prefix}${String(counter).padStart(6, '0')}`;
  }

  // --- Price Resolution for Customers ---
  public resolvePriceForCustomer(variant: ProductVariant, customer?: Customer | null): number {
    if (customer && customer.customPrices && customer.customPrices[variant.id] !== undefined) {
      return customer.customPrices[variant.id];
    }
    if (customer && (customer.type === 'wholesale' || customer.type === 'superette' || customer.type === 'distributor')) {
      return variant.wholesalePrice;
    }
    return variant.retailPrice;
  }

  // --- Product & Variant Mutations ---
  public addProductVariant(data: Omit<ProductVariant, 'id' | 'createdAt' | 'priceHistory'>): ProductVariant {
    const newVariant: ProductVariant = {
      ...data,
      id: 'var_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString().split('T')[0],
      priceHistory: [
        {
          date: new Date().toISOString().split('T')[0],
          retailPrice: data.retailPrice,
          wholesalePrice: data.wholesalePrice,
          cost: data.cost,
          reason: 'Création initiale'
        }
      ]
    };
    this.state.variants.push(newVariant);
    this.logAudit('CREATE_PRODUCT', 'ProductVariant', `Création produit: ${newVariant.name}`, newVariant.id);
    this.saveState();
    return newVariant;
  }

  public updateProductVariant(id: string, updates: Partial<ProductVariant>, priceChangeReason?: string): boolean {
    const idx = this.state.variants.findIndex(v => v.id === id);
    if (idx === -1) return false;
    const old = this.state.variants[idx];

    // Check if price changed
    const hasPriceChange = 
      (updates.retailPrice !== undefined && updates.retailPrice !== old.retailPrice) ||
      (updates.wholesalePrice !== undefined && updates.wholesalePrice !== old.wholesalePrice) ||
      (updates.cost !== undefined && updates.cost !== old.cost);

    let priceHistory = old.priceHistory || [];
    if (hasPriceChange) {
      priceHistory = [
        ...priceHistory,
        {
          date: new Date().toISOString().split('T')[0],
          retailPrice: updates.retailPrice ?? old.retailPrice,
          wholesalePrice: updates.wholesalePrice ?? old.wholesalePrice,
          cost: updates.cost ?? old.cost,
          reason: priceChangeReason || 'Mise à jour tarifaire'
        }
      ];
    }

    this.state.variants[idx] = {
      ...old,
      ...updates,
      priceHistory
    };

    this.logAudit('UPDATE_PRODUCT', 'ProductVariant', `Mise à jour produit: ${old.name}`, id);
    this.saveState();
    return true;
  }

  public adjustStock(variantId: string, deltaQuantity: number, reason: string): boolean {
    const variant = this.state.variants.find(v => v.id === variantId);
    if (!variant) return false;
    const prev = variant.currentStock;
    const next = Math.max(0, prev + deltaQuantity);
    variant.currentStock = next;

    this.logAudit('ADJUST_STOCK', 'Stock', `${variant.name}: ${prev} -> ${next} (${deltaQuantity > 0 ? '+' : ''}${deltaQuantity}) Raison: ${reason}`, variantId);
    this.saveState();
    return true;
  }

  // --- Customer Mutations ---
  public addCustomer(data: Omit<Customer, 'id' | 'totalPurchases' | 'totalPaid' | 'outstandingBalance' | 'createdAt' | 'updatedAt' | 'active'>): Customer {
    const newCust: Customer = {
      ...data,
      id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      active: true
    };
    this.state.customers.push(newCust);
    this.logAudit('CREATE_CUSTOMER', 'Customer', `Nouveau client: ${newCust.name}`, newCust.id);
    this.saveState();
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): boolean {
    const idx = this.state.customers.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.state.customers[idx] = {
      ...this.state.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.logAudit('UPDATE_CUSTOMER', 'Customer', `Mise à jour client: ${this.state.customers[idx].name}`, id);
    this.saveState();
    return true;
  }

  // --- Supplier Mutations ---
  public addSupplier(data: Omit<Supplier, 'id' | 'totalPurchases' | 'totalPaid' | 'balanceOwed' | 'active'>): Supplier {
    const newSup: Supplier = {
      ...data,
      id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      totalPurchases: 0,
      totalPaid: 0,
      balanceOwed: 0,
      active: true
    };
    this.state.suppliers.push(newSup);
    this.logAudit('CREATE_SUPPLIER', 'Supplier', `Nouveau fournisseur: ${newSup.name}`, newSup.id);
    this.saveState();
    return newSup;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>): boolean {
    const idx = this.state.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.state.suppliers[idx] = {
      ...this.state.suppliers[idx],
      ...updates
    };
    this.saveState();
    return true;
  }

  // --- Order Creation & Lifecycle ---
  public createOrder(data: {
    customerId: string;
    deliveryDate: string;
    notes?: string;
    items: { variantId: string; quantity: number; unitPrice?: number; discountPercent?: number }[];
    status?: OrderStatus;
  }): Order {
    const customer = this.state.customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Client introuvable');

    const orderNumber = this.nextDocNumber('order');
    let subtotal = 0;
    let totalCost = 0;

    const orderItems: OrderItem[] = data.items.map(item => {
      const variant = this.state.variants.find(v => v.id === item.variantId);
      if (!variant) throw new Error(`Produit introuvable: ${item.variantId}`);

      const resolvedPrice = item.unitPrice !== undefined ? item.unitPrice : this.resolvePriceForCustomer(variant, customer);
      const discount = item.discountPercent || 0;
      const lineTotal = Math.round(item.quantity * resolvedPrice * (1 - discount / 100));

      subtotal += lineTotal;
      totalCost += Math.round(item.quantity * variant.cost);

      return {
        variantId: variant.id,
        productName: variant.name,
        unit: variant.unit,
        unitPrice: resolvedPrice,
        cost: variant.cost,
        quantity: item.quantity,
        deliveredQuantity: 0,
        discountPercent: discount,
        subtotal: lineTotal
      };
    });

    const newOrder: Order = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      status: data.status || 'confirmed',
      items: orderItems,
      subtotal,
      discount: 0,
      total: subtotal,
      totalCost,
      expectedProfit: subtotal - totalCost,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      deliveryDate: data.deliveryDate,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: (data.status || 'confirmed') === 'confirmed' ? new Date().toISOString() : undefined
    };

    this.state.orders.unshift(newOrder);
    this.logAudit('CREATE_ORDER', 'Order', `Création commande ${orderNumber} pour ${customer.name} (${subtotal} DA)`, newOrder.id);
    this.saveState();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): boolean {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return false;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (status === 'confirmed' && !order.confirmedAt) order.confirmedAt = new Date().toISOString();
    if (status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date().toISOString();

    this.logAudit('ORDER_STATUS', 'Order', `Statut commande ${order.orderNumber} -> ${status}`, orderId);
    this.saveState();
    return true;
  }

  // --- Delivery (Full or Partial) ---
  public recordDelivery(orderId: string, deliveredItems: { variantId: string; quantity: number }[], deliveryPerson?: string, notes?: string): Delivery {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable');

    const customer = this.state.customers.find(c => c.id === order.customerId);
    const deliveryNumber = this.nextDocNumber('delivery');

    // Update delivered quantities in order & reduce physical stock
    const deliveryItems: { variantId: string; productName: string; unit: any; quantity: number }[] = [];
    let allDelivered = true;

    deliveredItems.forEach(delItem => {
      const orderItem = order.items.find(i => i.variantId === delItem.variantId);
      if (orderItem && delItem.quantity > 0) {
        orderItem.deliveredQuantity += delItem.quantity;
        
        // Decrement physical stock
        const variant = this.state.variants.find(v => v.id === delItem.variantId);
        if (variant) {
          variant.currentStock = Math.max(0, variant.currentStock - delItem.quantity);
        }

        deliveryItems.push({
          variantId: orderItem.variantId,
          productName: orderItem.productName,
          unit: orderItem.unit,
          quantity: delItem.quantity
        });
      }
    });

    // Check if whole order is delivered
    order.items.forEach(i => {
      if (i.deliveredQuantity < i.quantity) {
        allDelivered = false;
      }
    });

    order.status = allDelivered ? 'delivered' : 'partially_delivered';
    if (allDelivered) order.deliveredAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    const deliveryRecord: Delivery = {
      id: 'del_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      deliveryNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: customer ? customer.address : '',
      items: deliveryItems,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryPerson: deliveryPerson || this.state.currentUser.name,
      status: allDelivered ? 'completed' : 'partial',
      notes,
      createdAt: new Date().toISOString()
    };

    this.state.deliveries.unshift(deliveryRecord);
    this.logAudit('RECORD_DELIVERY', 'Delivery', `Livraison ${deliveryNumber} (${allDelivered ? 'Complète' : 'Partielle'}) pour ${order.orderNumber}`, deliveryRecord.id);
    this.saveState();
    return deliveryRecord;
  }

  // --- Invoice Creation ---
  public createInvoice(orderId: string, dueDate?: string, notes?: string): Invoice {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable');
    const customer = this.state.customers.find(c => c.id === order.customerId);

    const invoiceNumber = this.nextDocNumber('invoice');
    const invoiceItems = order.items.map(i => ({
      variantId: i.variantId,
      productName: i.productName,
      unit: i.unit,
      unitPrice: i.unitPrice,
      quantity: i.deliveredQuantity > 0 ? i.deliveredQuantity : i.quantity,
      subtotal: (i.deliveredQuantity > 0 ? i.deliveredQuantity : i.quantity) * i.unitPrice
    }));

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal;

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: customer ? customer.address : '',
      date: new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: invoiceItems,
      subtotal,
      discount: 0,
      total,
      paidAmount: order.paidAmount,
      balanceRemaining: Math.max(0, total - order.paidAmount),
      status: order.paidAmount >= total ? 'paid' : (order.paidAmount > 0 ? 'partially_paid' : 'unpaid'),
      notes: notes || order.notes,
      createdAt: new Date().toISOString()
    };

    order.invoicedAt = new Date().toISOString();

    // Update customer balance & purchases
    if (customer) {
      customer.totalPurchases += total;
      customer.outstandingBalance += newInvoice.balanceRemaining;
    }

    this.state.invoices.unshift(newInvoice);
    this.logAudit('CREATE_INVOICE', 'Invoice', `Facturation ${invoiceNumber} pour ${order.customerName} (${total} DA)`, newInvoice.id);
    this.saveState();
    return newInvoice;
  }

  // --- Payment Recording ---
  public recordPayment(data: {
    customerId: string;
    amount: number;
    method: any;
    invoiceId?: string;
    orderId?: string;
    notes?: string;
  }): Payment {
    const customer = this.state.customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Client introuvable');

    const receiptNumber = this.nextDocNumber('receipt');
    let invoiceNumber: string | undefined;

    // If payment is attached to invoice
    if (data.invoiceId) {
      const invoice = this.state.invoices.find(inv => inv.id === data.invoiceId);
      if (invoice) {
        invoiceNumber = invoice.invoiceNumber;
        invoice.paidAmount += data.amount;
        invoice.balanceRemaining = Math.max(0, invoice.total - invoice.paidAmount);
        invoice.status = invoice.balanceRemaining === 0 ? 'paid' : (invoice.paidAmount > 0 ? 'partially_paid' : 'unpaid');
      }
    }

    // If attached to order
    if (data.orderId) {
      const order = this.state.orders.find(o => o.id === data.orderId);
      if (order) {
        order.paidAmount += data.amount;
        order.paymentStatus = order.paidAmount >= order.total ? 'paid' : (order.paidAmount > 0 ? 'partially_paid' : 'unpaid');
      }
    }

    // Update customer global balance
    customer.totalPaid += data.amount;
    customer.outstandingBalance = Math.max(0, customer.outstandingBalance - data.amount);

    const payment: Payment = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      receiptNumber,
      customerId: customer.id,
      customerName: customer.name,
      invoiceId: data.invoiceId,
      invoiceNumber,
      orderId: data.orderId,
      amount: data.amount,
      date: new Date().toISOString().split('T')[0],
      method: data.method,
      notes: data.notes,
      receivedBy: this.state.currentUser.name,
      createdAt: new Date().toISOString()
    };

    this.state.payments.unshift(payment);
    this.logAudit('RECORD_PAYMENT', 'Payment', `Reçu ${receiptNumber}: Paiement de ${data.amount} DA de ${customer.name}`, payment.id);
    this.saveState();
    return payment;
  }

  // --- Quick Walk-in Sale (POS) ---
  public createQuickSale(data: {
    items: { variantId: string; quantity: number; unitPrice?: number }[];
    paymentMethod: any;
    customerName?: string;
    notes?: string;
  }): QuickSale {
    const saleNumber = this.nextDocNumber('sale');
    let total = 0;
    let totalCost = 0;

    const saleItems = data.items.map(item => {
      const variant = this.state.variants.find(v => v.id === item.variantId);
      if (!variant) throw new Error(`Produit introuvable`);
      const price = item.unitPrice ?? variant.retailPrice;
      const subtotal = price * item.quantity;
      const cost = variant.cost * item.quantity;

      total += subtotal;
      totalCost += cost;

      // Decrement physical stock immediately
      variant.currentStock = Math.max(0, variant.currentStock - item.quantity);

      return {
        variantId: variant.id,
        productName: variant.name,
        unit: variant.unit,
        unitPrice: price,
        cost: variant.cost,
        quantity: item.quantity,
        subtotal
      };
    });

    const profit = total - totalCost;

    const quickSale: QuickSale = {
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      saleNumber,
      date: new Date().toISOString(),
      customerName: data.customerName || 'Vente Comptoir',
      items: saleItems,
      total,
      totalCost,
      profit,
      paymentMethod: data.paymentMethod,
      amountPaid: total,
      notes: data.notes,
      createdAt: new Date().toISOString()
    };

    this.state.quickSales.unshift(quickSale);
    this.logAudit('QUICK_SALE', 'QuickSale', `Vente comptoir ${saleNumber}: ${total} DA (Bénéfice: ${profit} DA)`, quickSale.id);
    this.saveState();
    return quickSale;
  }

  // --- Production Batch ---
  public createProductionBatch(data: {
    productVariantId: string;
    milkType: any;
    milkInputLiters: number;
    milkCostPerLiter: number;
    additionalCosts: { label: string; amount: number }[];
    outputQuantity: number;
    expiryDate?: string;
    notes?: string;
  }): ProductionBatch {
    const variant = this.state.variants.find(v => v.id === data.productVariantId);
    if (!variant) throw new Error('Produit introuvable');

    const batchNumber = this.nextDocNumber('batch');
    const milkTotalCost = data.milkInputLiters * data.milkCostPerLiter;
    const additionalTotalCost = data.additionalCosts.reduce((acc, c) => acc + c.amount, 0);
    const totalCost = milkTotalCost + additionalTotalCost;
    const costPerUnit = data.outputQuantity > 0 ? Math.round(totalCost / data.outputQuantity) : 0;

    const batch: ProductionBatch = {
      id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      batchNumber,
      productVariantId: variant.id,
      productName: variant.name,
      date: new Date().toISOString().split('T')[0],
      milkType: data.milkType,
      milkInputLiters: data.milkInputLiters,
      milkCostPerLiter: data.milkCostPerLiter,
      additionalCosts: data.additionalCosts.map((c, i) => ({ id: 'c_' + i, label: c.label, amount: c.amount })),
      totalCost,
      outputQuantity: data.outputQuantity,
      outputUnit: variant.unit,
      costPerUnit,
      expiryDate: data.expiryDate,
      status: 'completed',
      notes: data.notes,
      createdAt: new Date().toISOString()
    };

    // Increase product variant physical inventory!
    variant.currentStock += data.outputQuantity;
    // Update current product cost with moving average or latest cost if valid
    if (costPerUnit > 0) {
      variant.cost = costPerUnit;
    }

    this.state.batches.unshift(batch);
    this.logAudit('CREATE_BATCH', 'ProductionBatch', `Fabrication ${batchNumber}: ${data.outputQuantity} ${variant.unit} de ${variant.name} (Coût unitaire: ${costPerUnit} DA)`, batch.id);
    this.saveState();
    return batch;
  }

  // --- Expenses ---
  public addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expense: Expense = {
      ...data,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString()
    };
    this.state.expenses.unshift(expense);
    this.logAudit('ADD_EXPENSE', 'Expense', `Dépense ${expense.category}: ${expense.amount} DA (${expense.notes || 'Sans note'})`, expense.id);
    this.saveState();
    return expense;
  }

  // --- Waste / Losses ---
  public recordWaste(data: { variantId: string; quantity: number; reason: any; notes?: string }): WasteLoss {
    const variant = this.state.variants.find(v => v.id === data.variantId);
    if (!variant) throw new Error('Produit introuvable');

    variant.currentStock = Math.max(0, variant.currentStock - data.quantity);
    const lossValue = Math.round(data.quantity * variant.cost);

    const waste: WasteLoss = {
      id: 'waste_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      variantId: variant.id,
      variantName: variant.name,
      quantity: data.quantity,
      unit: variant.unit,
      estimatedLossValue: lossValue,
      reason: data.reason,
      notes: data.notes,
      createdAt: new Date().toISOString()
    };

    this.state.wasteLosses.unshift(waste);
    this.logAudit('RECORD_WASTE', 'WasteLoss', `Perte enregistrée: ${data.quantity} ${variant.unit} de ${variant.name} (${lossValue} DA)`, waste.id);
    this.saveState();
    return waste;
  }

  // --- Livestock Management ---
  public addLivestockAnimal(data: Omit<LivestockAnimal, 'id' | 'createdAt'>): LivestockAnimal {
    const animal: LivestockAnimal = {
      ...data,
      id: 'ani_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    this.state.livestock.push(animal);
    this.logAudit('ADD_ANIMAL', 'Livestock', `Nouvel animal: ${animal.tagNumber} (${animal.type === 'cow' ? 'Vache' : 'Chèvre'})`, animal.id);
    this.saveState();
    return animal;
  }

  public updateLivestockAnimal(id: string, updates: Partial<LivestockAnimal>): boolean {
    const idx = this.state.livestock.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.state.livestock[idx] = { ...this.state.livestock[idx], ...updates };
    this.saveState();
    return true;
  }

  public addLivestockEvent(data: Omit<LivestockEvent, 'id' | 'createdAt'>): LivestockEvent {
    const event: LivestockEvent = {
      ...data,
      id: 'ev_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    this.state.livestockEvents.unshift(event);
    this.logAudit('LIVESTOCK_EVENT', 'LivestockEvent', `Événement ${event.type} sur ${event.animalTag || event.animalType}`, event.id);
    this.saveState();
    return event;
  }

  public addFeedRecord(data: Omit<FeedRecord, 'id' | 'createdAt'>): FeedRecord {
    const record: FeedRecord = {
      ...data,
      id: 'fd_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    this.state.feedRecords.unshift(record);
    // Also record an expense if cost > 0
    if (data.cost > 0) {
      this.addExpense({
        date: data.date,
        amount: data.cost,
        category: 'feed',
        supplierName: data.supplierName,
        notes: `Alimentation: ${data.feedType} (${data.quantity} ${data.unit})`,
        paymentMethod: 'cash'
      });
    }
    this.saveState();
    return record;
  }

  // --- Settings Update ---
  public updateSettings(updates: Partial<BusinessSettings>): void {
    this.state.settings = { ...this.state.settings, ...updates };
    this.logAudit('UPDATE_SETTINGS', 'Settings', 'Mise à jour des paramètres de l\'entreprise');
    this.saveState();
  }

  // --- Data Reset / Demo Reload ---
  public resetToFreshData(): void {
    this.state = {
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      currentUser: DEFAULT_USERS[0],
      categories: DEFAULT_CATEGORIES,
      variants: DEFAULT_VARIANTS.map(v => ({ ...v, currentStock: 0 })),
      customers: [],
      suppliers: DEFAULT_SUPPLIERS,
      orders: [],
      deliveries: [],
      invoices: [],
      payments: [],
      quickSales: [],
      batches: [],
      expenses: [],
      purchases: [],
      livestock: [],
      livestockEvents: [],
      feedRecords: [],
      wasteLosses: [],
      productReturns: [],
      recurringOrders: [],
      auditLogs: [],
      syncPending: 0
    };
    this.logAudit('RESET_DB', 'System', 'Réinitialisation complète de la base de données');
    this.saveState();
  }

  public reloadDemoData(): void {
    this.state = {
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      currentUser: DEFAULT_USERS[0],
      categories: DEFAULT_CATEGORIES,
      variants: DEFAULT_VARIANTS,
      customers: DEFAULT_CUSTOMERS,
      suppliers: DEFAULT_SUPPLIERS,
      orders: DEFAULT_ORDERS,
      deliveries: DEFAULT_DELIVERIES,
      invoices: DEFAULT_INVOICES,
      payments: DEFAULT_PAYMENTS,
      quickSales: DEFAULT_QUICK_SALES,
      batches: DEFAULT_BATCHES,
      expenses: DEFAULT_EXPENSES,
      purchases: [],
      livestock: DEFAULT_LIVESTOCK,
      livestockEvents: DEFAULT_LIVESTOCK_EVENTS,
      feedRecords: DEFAULT_FEED_RECORDS,
      wasteLosses: [],
      productReturns: [],
      recurringOrders: [],
      auditLogs: DEFAULT_AUDIT_LOGS,
      syncPending: 0
    };
    this.logAudit('RELOAD_DEMO', 'System', 'Rechargement des données de démonstration');
    this.saveState();
  }

  // --- Backup & Export ---
  public exportBackupJSON(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public restoreBackupJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.settings || !parsed.variants || !Array.isArray(parsed.orders)) {
        throw new Error('Format de sauvegarde invalide');
      }
      this.state = parsed;
      this.logAudit('RESTORE_BACKUP', 'System', 'Restauration réussie d\'une sauvegarde JSON');
      this.saveState();
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  // --- Convenience & Compatibility Aliases ---
  public switchUser(userId: string): boolean {
    return this.setCurrentUser(userId);
  }

  public getVariantByBarcodeOrSku(code: string): ProductVariant | undefined {
    const q = code.trim().toLowerCase();
    return this.state.variants.find(v => 
      (v.barcode && v.barcode.toLowerCase() === q) || 
      v.sku.toLowerCase() === q
    );
  }

  public createCustomer(data: any): Customer {
    return this.addCustomer(data);
  }

  public createSupplier(data: any): Supplier {
    return this.addSupplier({
      name: data.name,
      phone: data.phone || '',
      address: data.address || '',
      materials: [data.category || 'Général'],
      notes: data.notes
    });
  }

  public createExpense(data: { category: any; amount: number; description: string; paidVia: 'cash' | 'bank_transfer' }): Expense {
    return this.addExpense({
      date: new Date().toISOString().split('T')[0],
      amount: data.amount,
      category: data.category,
      notes: data.description,
      paymentMethod: data.paidVia === 'bank_transfer' ? 'bank_transfer' : 'cash'
    });
  }

  public updateVariant(id: string, updates: Partial<ProductVariant>): boolean {
    return this.updateProductVariant(id, updates);
  }

  public getAnimals(): LivestockAnimal[] {
    return this.getLivestock();
  }

  public addAnimal(data: any): LivestockAnimal {
    return this.addLivestockAnimal({
      tagNumber: data.tagNumber,
      name: data.name,
      type: data.species || 'goat',
      breed: data.breed || 'Locale',
      birthDate: data.birthDate,
      gender: 'female',
      status: data.status || 'lactating',
      currentLactationLiters: data.dailyMilkYieldLiters || 3.5,
      notes: data.notes
    });
  }

  public exportData(): string {
    return this.exportBackupJSON();
  }

  public importData(jsonString: string): boolean {
    return this.restoreBackupJSON(jsonString);
  }

  public resetToMockData(): void {
    this.reloadDemoData();
  }

  public createAuditLog(action: string, details: string, entity = 'General', entityId?: string): void {
    this.logAudit(action, entity, details, entityId);
  }

  public getCashRegister() {
    const cashInSales = this.state.quickSales
      .filter(s => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + s.total, 0);
    const cashInPayments = this.state.payments
      .filter(p => p.method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    const cashOutExpenses = this.state.expenses
      .filter(e => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);

    const cashBalance = Math.max(0, 185000 + cashInSales + cashInPayments - cashOutExpenses);
    const bankBalance = 840000;
    return { cashBalance, bankBalance };
  }

  public completeBatch(batchId: string): boolean {
    const batch = this.state.batches.find(b => b.id === batchId);
    if (!batch) return false;
    batch.status = 'completed';
    const variant = this.state.variants.find(v => v.id === batch.productVariantId);
    if (variant) {
      variant.currentStock += batch.outputQuantity;
    }
    this.logAudit('COMPLETE_BATCH', 'ProductionBatch', `Lot ${batch.batchNumber} libéré et intégré au stock (+${batch.outputQuantity})`, batchId);
    this.saveState();
    return true;
  }
}

export const db = new StorageEngine();
