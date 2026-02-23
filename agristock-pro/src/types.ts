
/**
 * Item defines the product master data. 
 * COMMENT: It represents the specification of what we sell/stock, not the physical quantity.
 */
export interface Item {
  id: string;
  skuCode: string;
  name: string;
  category: 'Clex' | 'Browser' | 'Segawean' | 'Other';
  packSize: number; // e.g., 25 for 25kg bags
  leadTimeDays: number;
  moq: number; // Minimum Order Quantity
  costPerUnit: number;
  notes?: string;
  // ADDED: shelfLifeDays defines product freshness lifetime in days (e.g., 180, 365)
  shelfLifeDays?: number;
}

/**
 * Inventory Lot tracks the physical batches. 
 * COMMENT: Added quantityReceived to match upgrade requirements.
 */
export interface InventoryLot {
  id: string;
  itemId: string;
  lotNumber: string;
  expiryDate: string | null; // Optional ISO Date
  quantityRemaining: number;
  receivedDate: string | null; // Optional ISO Date
  quantityReceived?: number | null; // New field for total intake tracking
  status: 'available' | 'expired' | 'damaged';
  notes?: string;
}

/**
 * Stock Count Entry for auditing.
 */
export interface StockCountEntry {
  id: string;
  date: string;
  lotId: string;
  countedQty: number;
  reason: 'adjustment' | 'damage' | 'correction' | 'routine';
  notes?: string;
}

/**
 * Sales History for forecasting.
 */
export interface SalesHistory {
  id: string;
  itemId: string;
  month: string; // YYYY-MM
  quantitySold: number;
}

/**
 * Global application settings.
 * COMMENT: Added fields for forecasting methods, weights, and alert rules.
 */
export interface Settings {
  defaultLeadTimeDays: number;
  safetyStockDays: number;
  reviewPeriodDays: number;
  lowStockDaysCoverThreshold: number;
  expiryWarningDays: number;
  notificationCooldownHours: number; // Hours to wait before re-alerting
  currencySymbol: string;
  whatsappMode: 'disabled' | 'clickToWhatsApp' | 'webhookAPI';
  whatsappNumber: string; // Default single recipient
  whatsappRecipients: string[]; // List of numbers for multiple distribution
  webhookUrl?: string; // For Upgrade 3 webhook support
  webhookApiKey?: string;
  forecastMethod: 'simpleAverage6Months' | 'weightedAverage';
  weights: number[]; // Array of 6 weights for weighted average
  lowStockRule: 'belowDaysCover' | 'belowReorderPoint';
}

/**
 * Alert data model.
 * COMMENT: Stores detected inventory issues for manual action.
 */
export interface InventoryAlert {
  id: string;
  createdAt: string;
  itemId: string;
  type: 'lowStock' | 'expiry';
  message: string;
  status: 'pending' | 'sent' | 'dismissed';
  lastSentAt?: string;
  recipientsSnapshot?: string[];
}

/**
 * Planning Data Structure (Joined View)
 */
export interface ItemPlanningView {
  item: Item;
  lots: InventoryLot[];
  sales: SalesHistory[];
  availableStock: number;
  avgMonthlyDemand: number;
  dailyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  // ADDED: freshness cap info
  freshnessCapApplied?: boolean;
  freshnessCapQty?: number;
  // ADDED: projected days cover after placing suggested order (uses final suggestedOrderQty)
  projectedDaysCoverAfterOrder?: number;
  daysCover: number;
  lowStockFlag: boolean;
  expiringSoonLots: InventoryLot[];
}
