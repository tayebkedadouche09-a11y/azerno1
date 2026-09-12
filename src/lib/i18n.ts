import { AppLanguage } from '../types';

export interface Translations {
  appName: string;
  tagline: string;
  today: string;
  sales: string;
  profit: string;
  orders: string;
  deliveries: string;
  customerDebt: string;
  stockAlert: string;
  productionNeeded: string;
  quickActions: string;
  newOrder: string;
  quickSale: string;
  production: string;
  expense: string;
  payment: string;
  scan: string;
  home: string;
  products: string;
  customers: string;
  suppliers: string;
  money: string;
  livestock: string;
  documents: string;
  reports: string;
  settings: string;
  auditLog: string;
  stock: string;
  currentStock: string;
  reservedStock: string;
  availableStock: string;
  unit: string;
  price: string;
  retailPrice: string;
  wholesalePrice: string;
  productionCost: string;
  margin: string;
  status: string;
  actions: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  confirm: string;
  search: string;
  filter: string;
  all: string;
  draft: string;
  confirmed: string;
  preparing: string;
  ready: string;
  partiallyDelivered: string;
  delivered: string;
  cancelled: string;
  unpaid: string;
  partiallyPaid: string;
  paid: string;
  bonDeCommande: string;
  bonDeLivraison: string;
  facture: string;
  recuPaiement: string;
  shareWhatsApp: string;
  downloadPDF: string;
  printDoc: string;
  customerProfile: string;
  totalPurchases: string;
  totalPaid: string;
  balanceOwed: string;
  repeatOrder: string;
  recordPayment: string;
  partialDelivery: string;
  fullDelivery: string;
  cows: string;
  goats: string;
  milkInput: string;
  cheeseOutput: string;
  costPerUnit: string;
  batchNumber: string;
  addBatch: string;
  addExpense: string;
  addCustomer: string;
  addProduct: string;
  emptyList: string;
  offlineMode: string;
  synced: string;
  syncPending: string;
  roleOwner: string;
  roleManager: string;
  roleWorker: string;
}

export const translations: Record<AppLanguage, Translations> = {
  fr: {
    appName: 'AZRNOU',
    tagline: 'Fromagerie & Élevage',
    today: 'Aujourd\'hui',
    sales: 'Ventes',
    profit: 'Bénéfice Réel',
    orders: 'Commandes',
    deliveries: 'Livraisons',
    customerDebt: 'Créances Clients',
    stockAlert: 'Alertes Stock',
    productionNeeded: 'Besoin Fabrication',
    quickActions: 'Actions Rapides',
    newOrder: 'Nouvelle Commande',
    quickSale: 'Vente Comptoir',
    production: 'Fabrication',
    expense: 'Dépense',
    payment: 'Paiement',
    scan: 'Scanner Code',
    home: 'Accueil',
    products: 'Produits & Stock',
    customers: 'Clients & Dettes',
    suppliers: 'Fournisseurs',
    money: 'Caisse & Finances',
    livestock: 'Élevage & Troupeau',
    documents: 'Documents Commerciaux',
    reports: 'Rapports & Rentabilité',
    settings: 'Paramètres',
    auditLog: 'Journal d\'Audit',
    stock: 'Stock',
    currentStock: 'Stock Physique',
    reservedStock: 'Stock Réservé',
    availableStock: 'Stock Disponible',
    unit: 'Unité',
    price: 'Prix',
    retailPrice: 'Prix Détail',
    wholesalePrice: 'Prix Gros',
    productionCost: 'Coût de Revient',
    margin: 'Marge',
    status: 'Statut',
    actions: 'Actions',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    confirm: 'Confirmer',
    search: 'Rechercher client, produit, document...',
    filter: 'Filtrer',
    all: 'Tous',
    draft: 'Brouillon',
    confirmed: 'Confirmée',
    preparing: 'En préparation',
    ready: 'Prête',
    partiallyDelivered: 'Partiellement livrée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    unpaid: 'Non payé',
    partiallyPaid: 'Acompte versé',
    paid: 'Totalement payé',
    bonDeCommande: 'Bon de Commande',
    bonDeLivraison: 'Bon de Livraison',
    facture: 'Facture',
    recuPaiement: 'Reçu de Paiement',
    shareWhatsApp: 'Partager sur WhatsApp',
    downloadPDF: 'Télécharger PDF',
    printDoc: 'Imprimer',
    customerProfile: 'Fiche Client',
    totalPurchases: 'Total Commandé',
    totalPaid: 'Total Réglé',
    balanceOwed: 'Solde Restant',
    repeatOrder: 'Renouveler Commande',
    recordPayment: 'Encaisser Paiement',
    partialDelivery: 'Livraison Partielle',
    fullDelivery: 'Livraison Totale',
    cows: 'Vaches Laitières',
    goats: 'Chèvres Laitières',
    milkInput: 'Lait mis en œuvre',
    cheeseOutput: 'Fromage obtenu',
    costPerUnit: 'Coût unitaire',
    batchNumber: 'N° de Lot',
    addBatch: 'Nouveau Lot de Fabrication',
    addExpense: 'Enregistrer Dépense',
    addCustomer: 'Nouveau Client',
    addProduct: 'Nouveau Produit / Déclinaison',
    emptyList: 'Aucun élément trouvé',
    offlineMode: 'Mode Hors-ligne Actif',
    synced: 'Données Synchronisées',
    syncPending: 'Modifications en attente de synchronisation',
    roleOwner: 'Propriétaire',
    roleManager: 'Gestionnaire / Compta',
    roleWorker: 'Opérateur / Livreur'
  },
  ar: {
    appName: 'أزرنو',
    tagline: 'أجبان حرفية وتربية المواشي',
    today: 'اليوم',
    sales: 'المبيعات',
    profit: 'الأرباح الحقيقية',
    orders: 'الطلبيات',
    deliveries: 'التوصيلات',
    customerDebt: 'ديون الزبائن',
    stockAlert: 'تنبيه المخزون',
    productionNeeded: 'احتياج الإنتاج',
    quickActions: 'إجراءات سريعة',
    newOrder: 'طلبية جديدة',
    quickSale: 'بيع فوري / كوارتر',
    production: 'الإنتاج والتحويل',
    expense: 'مصاريف',
    payment: 'تسجيل دفعة',
    scan: 'مسح الرمز',
    home: 'الرئيسية',
    products: 'المنتجات والمخزون',
    customers: 'الزبائن والديون',
    suppliers: 'الموردون',
    money: 'الصندوق والمالية',
    livestock: 'المواشي والقطيع',
    documents: 'المستندات التجارية',
    reports: 'التقارير والمردودية',
    settings: 'الإعدادات',
    auditLog: 'سجل العمليات',
    stock: 'المخزون',
    currentStock: 'المخزون الفعلي',
    reservedStock: 'المخزون المحجوز',
    availableStock: 'المخزون المتاح',
    unit: 'الوحدة',
    price: 'السعر',
    retailPrice: 'سعر التجزئة',
    wholesalePrice: 'سعر الجملة',
    productionCost: 'تكلفة الإنتاج',
    margin: 'هامش الربح',
    status: 'الحالة',
    actions: 'إجراءات',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    confirm: 'تأكيد',
    search: 'بحث عن زبون، منتج، فاتورة...',
    filter: 'تصفية',
    all: 'الكل',
    draft: 'مسودة',
    confirmed: 'مؤكدة',
    preparing: 'قيد التحضير',
    ready: 'جاهزة للتسليم',
    partiallyDelivered: 'تم التسليم جزئياً',
    delivered: 'تم التسليم بالكامل',
    cancelled: 'ملغاة',
    unpaid: 'غير مدفوع',
    partiallyPaid: 'مدفوع جزئياً',
    paid: 'مدفوع بالكامل',
    bonDeCommande: 'وصل طلبية',
    bonDeLivraison: 'وصل تسليم',
    facture: 'فاتورة',
    recuPaiement: 'وصل قبض / دفع',
    shareWhatsApp: 'مشاركة عبر واتساب',
    downloadPDF: 'تحميل PDF',
    printDoc: 'طباعة المستند',
    customerProfile: 'بطاقة الزبون',
    totalPurchases: 'إجمالي المشتريات',
    totalPaid: 'إجمالي المدفوع',
    balanceOwed: 'المبلغ المتبقي',
    repeatOrder: 'تكرار نفس الطلبية',
    recordPayment: 'تسجيل دفعة نقدية',
    partialDelivery: 'تسليم جزئي',
    fullDelivery: 'تسليم كامل',
    cows: 'أبقار حلوب',
    goats: 'ماعز حلوب',
    milkInput: 'الحليب المستعمل',
    cheeseOutput: 'الجبن الناتج',
    costPerUnit: 'التكلفة للوحدة',
    batchNumber: 'رقم الدفعة',
    addBatch: 'دفعة تصنيع جديدة',
    addExpense: 'تسجيل مصروف',
    addCustomer: 'إضافة زبون جديد',
    addProduct: 'إضافة منتج أو مقاس',
    emptyList: 'لا توجد عناصر',
    offlineMode: 'العمل بدون إنترنت',
    synced: 'البيانات متزامنة',
    syncPending: 'تعديلات قيد المزامنة',
    roleOwner: 'المالك / المسير',
    roleManager: 'المحاسب / الإدارة',
    roleWorker: 'عامل / موزع'
  },
  en: {
    appName: 'AZRNOU',
    tagline: 'Artisan Dairy & Livestock',
    today: 'Today',
    sales: 'Sales',
    profit: 'Real Profit',
    orders: 'Orders',
    deliveries: 'Deliveries',
    customerDebt: 'Customer Debt',
    stockAlert: 'Stock Alerts',
    productionNeeded: 'Production Need',
    quickActions: 'Quick Actions',
    newOrder: 'New Order',
    quickSale: 'Quick Sale',
    production: 'Production',
    expense: 'Expense',
    payment: 'Payment',
    scan: 'Scan Code',
    home: 'Home',
    products: 'Products & Stock',
    customers: 'Customers & Debt',
    suppliers: 'Suppliers',
    money: 'Cash & Finance',
    livestock: 'Livestock & Herd',
    documents: 'Documents',
    reports: 'Reports & Profit',
    settings: 'Settings',
    auditLog: 'Audit Trail',
    stock: 'Stock',
    currentStock: 'Physical Stock',
    reservedStock: 'Reserved Stock',
    availableStock: 'Available Stock',
    unit: 'Unit',
    price: 'Price',
    retailPrice: 'Retail Price',
    wholesalePrice: 'Wholesale Price',
    productionCost: 'Unit Cost',
    margin: 'Margin',
    status: 'Status',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    search: 'Search customer, product, document...',
    filter: 'Filter',
    all: 'All',
    draft: 'Draft',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    partiallyDelivered: 'Partially Delivered',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    unpaid: 'Unpaid',
    partiallyPaid: 'Partially Paid',
    paid: 'Fully Paid',
    bonDeCommande: 'Purchase Order',
    bonDeLivraison: 'Delivery Slip',
    facture: 'Invoice',
    recuPaiement: 'Payment Receipt',
    shareWhatsApp: 'Share on WhatsApp',
    downloadPDF: 'Download PDF',
    printDoc: 'Print Document',
    customerProfile: 'Customer Profile',
    totalPurchases: 'Total Ordered',
    totalPaid: 'Total Paid',
    balanceOwed: 'Outstanding Debt',
    repeatOrder: 'Reorder Previous',
    recordPayment: 'Record Payment',
    partialDelivery: 'Partial Delivery',
    fullDelivery: 'Full Delivery',
    cows: 'Dairy Cows',
    goats: 'Dairy Goats',
    milkInput: 'Milk Processed',
    cheeseOutput: 'Cheese Produced',
    costPerUnit: 'Cost per unit',
    batchNumber: 'Batch #',
    addBatch: 'New Production Batch',
    addExpense: 'Record Expense',
    addCustomer: 'New Customer',
    addProduct: 'New Product / Variant',
    emptyList: 'No records found',
    offlineMode: 'Offline Mode Active',
    synced: 'Data Synced',
    syncPending: 'Changes pending sync',
    roleOwner: 'Owner',
    roleManager: 'Manager / Accountant',
    roleWorker: 'Operator / Driver'
  }
};
