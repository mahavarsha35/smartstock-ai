export type NavPage =
  | 'dashboard'
  | 'products'
  | 'stock-movement'
  | 'ai-insights'
  | 'suppliers'
  | 'reports-analytics'
  | 'notifications'
  | 'staff-management'
  | 'settings'
  | 'ai-concierge';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: 'Staples' | 'Snacks' | 'Dairy' | 'Household' | 'Personal Care' | 'Wellness';
  stockUnits: number;
  minStock: number;
  unitLabel: string;
  costPrice: number;
  sellingPrice: number;
  supplierId: string;
  supplierName: string;
  bayLocation: string;
  dailyVelocity: number;
  leadTimeHours: number;
  expiryDate?: string;
  batchNo?: string;
  imageUrl: string;
  monthlyFamilies?: number;
  weeklyRevenue?: number;
  weeklyGrowthPct?: number;
  aisleNote?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  cityHub: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  categories: string[];
  keyLines: string[];
  completedOrders: number;
  leadTimeHours: number;
  paymentTerms: string;
  pendingAmount: number;
  rating: number;
  status: 'Active' | 'Pending Review' | 'Inactive';
  tier: string;
  inwardBay: string;
  fulfillmentRate: number;
  gstrMatched: boolean;
}

export interface StockMovement {
  id: string;
  txnCode: string;
  createdAt: string;
  displayTime: string;
  displayDate: string;
  productId: string;
  productName: string;
  sku: string;
  imageUrl?: string;
  type: 'Stock In' | 'Stock Out' | 'Damage Write-Off' | 'Adjustment';
  qtyChanged: number;
  previousStock: number;
  newStock: number;
  reasonTitle: string;
  referenceNote: string;
  handledBy: string;
  handledRole: string;
  unitCost?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  gstin: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitLabel: string;
  unitPrice: number;
  gstRate: number;
  totalAmount: number;
  status: 'Draft' | 'Dispatched' | 'In-Transit' | 'Delivered';
  expectedAt: string;
  createdAt: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'Low Stock' | 'Expiry' | 'Supplier' | 'System';
  createdAt: string;
  read: boolean;
  productId?: string;
  actionLabel?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  branch: string;
  phone: string;
  email: string;
  shift: string;
  status: 'On Shift' | 'Off Duty';
  permissions: string[];
  avatarUrl?: string;
}

export interface StoreSettings {
  curatorName: string;
  curatorEmail: string;
  curatorPhone: string;
  curatorDesignation: string;
  storeName: string;
  storeCode: string;
  storeAddress: string;
  conciergeLine: string;
  businessVertical: string;
  gstin: string;
  hsnClasses: string;
  lowStockDefault: number;
  criticalBufferDays: number;
  baseMetricFamily: string;
  autonomousPoEnabled: boolean;
  alertsLowStock: boolean;
  alertsMorningBriefing: boolean;
  alertsSupplierDelays: boolean;
  alertsAiCopilot: boolean;
  alertsNightDigest: boolean;
  inactivityTimeout: string;
  twoFactorEnabled: boolean;
  language: 'en' | 'ta' | 'hi';
  themeMode: 'ivory' | 'espresso';
  lastBackupAt: string;
}

export interface ConciergeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'voice' | 'text';
  badge?: string;
  draftPo?: PurchaseOrder;
  bundles?: Array<{
    title: string;
    price: number;
    marginPct: number;
    readyKits: number;
    subtitle: string;
    imageUrl: string;
  }>;
}

export interface DbHealth {
  storageMode: 'supabase' | 'local';
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
  lastSyncedAt: string;
}

export interface BootstrapData {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  notifications: NotificationItem[];
  staff: StaffMember[];
  settings: StoreSettings;
  health: DbHealth;
}
