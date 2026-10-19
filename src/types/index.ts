export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export type PoultryBreed = 'Rhode Island Red' | 'Black Australorp';

export interface PenFlock extends BaseRecord {
  penCode: string; // e.g. 'Pen RIR-1', 'Pen RIR-2', 'Pen BA-1'
  breed: PoultryBreed;
  roostersCount: number;
  hensCount: number;
  housingType: 'Deep Litter' | 'Free Range Pasture' | 'Breeding Pen';
  notes?: string;
}

export interface DailyEggLog extends BaseRecord {
  date: string; // YYYY-MM-DD
  penId: string;
  breed: PoultryBreed;
  fertileEggs: number; // Hatching quality
  tableEggs: number; // Clean edible table eggs
  rejects: number; // Cracked, misshapen, soft shell
  totalEggs: number;
  mortalityHens: number;
  mortalityRoosters: number;
  activeHensOnDate: number;
  layingRatePercent: number; // (totalEggs / activeHensOnDate) * 100
  vitaminsAndSupplements?: string; // e.g. "Electrolytes in water + Apple Cider Vinegar"
  notes?: string;
}

export interface IncubationBatch extends BaseRecord {
  batchCode: string; // e.g. "LC-INC-2026-004"
  incubatorName: string; // e.g. "Solana Master-1 (Cabinet)"
  breed: PoultryBreed;
  dateSet: string; // YYYY-MM-DD
  eggsSetCount: number;
  
  // Milestones (Auto-calculated YYYY-MM-DD)
  day7CandlingDate: string;
  day14CandlingDate: string;
  day18LockdownDate: string;
  day21HatchDate: string;
  
  // Inspections and Results
  day7ClearsCount?: number; // Infertile clears
  day14DeadCount?: number; // Blood ring / early dead
  chicksHatchedCount?: number; // Healthy day-old chicks
  weakChicksCount?: number;
  deadInShellCount?: number;

  // Calculated Stats
  fertilityPercent?: number; // ((eggsSet - day7Clears) / eggsSet) * 100
  hatchabilityPercent?: number; // (chicksHatched / fertileEggs) * 100
  totalHatchabilityPercent?: number; // (chicksHatched / eggsSet) * 100

  status: 'Set / Warming' | 'Day 7 Candling' | 'Day 14 Candling' | 'Lockdown (Day 18+)' | 'Hatching' | 'Completed' | 'Archived';
  notes?: string;
}

export interface FeedIngredient extends BaseRecord {
  name: string; // e.g. "Yellow Corn (Cracked)", "Rice Bran (Darak D1)", "Azolla (Dried)", "Molasses", "Poultry Premix"
  stockKg: number;
  unitCostPhp: number; // Cost per kg in PHP
  reorderLevelKg: number;
  crudeProteinPercent?: number; // Crude Protein (CP %) of the raw ingredient
  category: 'Grain' | 'By-Product' | 'Forage/Protein' | 'Mineral/Vitamin' | 'Binder';
}

export interface PelletBatchLog extends BaseRecord {
  batchNumber: string; // e.g. "PLT-2026-028"
  date: string;
  recipeName: string; // e.g. "Solana High-Yield Layer Pellets (17.5% CP)"
  targetBreed: PoultryBreed | 'All Flocks';
  totalKgProduced: number;
  costPerKgPhp: number;
  totalBatchCostPhp: number;
  crudeProteinPercent?: number; // Auto-calculated weighted Crude Protein % of the formula
  ingredientsUsed: {
    ingredientId: string;
    ingredientName: string;
    kgUsed: number;
    costPhp: number;
    crudeProteinPercent?: number;
  }[];
  operator: string;
  notes?: string;
}

export type OrderStatus = 'Reserved' | 'Paid' | 'Dispatched' | 'Cancelled';
export type OrderItemType = 'Fertile Hatching Eggs' | 'Day-Old Chicks (DOC)' | 'Ready-to-Lay Pullets' | 'Table Fresh Eggs';

export interface FertileEggOrder extends BaseRecord {
  orderNumber: string; // e.g. "ORD-2026-089"
  customerName: string;
  contactNumber: string;
  location: string; // e.g. "Centro Solana, Cagayan" or "Tuguegarao City"
  breed: PoultryBreed;
  itemType: OrderItemType;
  quantity: number;
  unitBasePricePhp: number;
  bulkDiscountPercent: number; // 0, 5, 10, or 15%
  discountAmountPhp: number;
  packagingFeePhp: number;
  totalAmountPhp: number;
  paymentMethod: 'GCash' | 'Cash on Pickup' | 'Bank Transfer (BDO/BPI)' | 'COD';
  status: OrderStatus;
  dateReserved: string;
  targetDispatchDate: string;
  notes?: string;
}

export type TransactionType = 'Income' | 'Expense';

export interface FinanceTransaction extends BaseRecord {
  date: string;
  type: TransactionType;
  category: 
    | 'Fertile Egg Sales'
    | 'Day-Old Chick Sales'
    | 'Table Egg Sales'
    | 'Cull Bird Sales'
    | 'Feed & Raw Materials'
    | 'Incubator Electricity'
    | 'Veterinary & Biosecurity'
    | 'Farm Labor & Maintenance'
    | 'Packaging & Delivery'
    | 'Other Income'
    | 'Other Expense';
  description: string;
  amountPhp: number;
  paymentMethod: string;
  referenceNo?: string;
}

export interface SyncLogEvent {
  id: string;
  timestamp: string;
  type: 'auto_sync' | 'manual_sync' | 'export_backup' | 'import_backup' | 'system_reset';
  status: 'success' | 'failed' | 'pending';
  recordsAffected: number;
  details: string;
}

export interface FarmAppSettings {
  farmName: string;
  location: string;
  currency: string;
  timezone: string;
  ownerContact: string;
  gcashAccountName: string;
  defaultOperator: string;
  defaultIncubatorName: string;
  webhookUrl: string;
  autoSyncIntervalMinutes: number;
  lowStockThresholdKg: number;
  defaultRirEggPrice: number;
  defaultAustralorpEggPrice: number;
  defaultDocPrice: number;
  defaultPulletPrice?: number;
  defaultTableEggPrice: number;
  bulkDiscountTier30: number;
  bulkDiscountTier60: number;
  bulkDiscountTier100: number;
  packagingFeeSmall: number;
  packagingFeeMedium: number;
  packagingFeeLarge: number;
  startInputsFromZero: boolean;
}

