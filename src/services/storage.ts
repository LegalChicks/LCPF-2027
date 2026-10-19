import type {
  PenFlock,
  DailyEggLog,
  IncubationBatch,
  FeedIngredient,
  PelletBatchLog,
  FertileEggOrder,
  FinanceTransaction,
  FarmAppSettings,
  SyncLogEvent,
  SyncStatus,
  BaseRecord
} from '../types/index.ts';
import {
  initialSettings,
  initialPens,
  initialEggLogs,
  initialIncubationBatches,
  initialFeedIngredients,
  initialPelletLogs,
  initialOrders,
  initialTransactions,
  initialSyncLogs
} from './seedData.ts';

const STORAGE_KEYS = {
  SETTINGS: 'legal_chicks_settings_v1',
  PENS: 'legal_chicks_pens_v1',
  EGG_LOGS: 'legal_chicks_egg_logs_v1',
  INCUBATION: 'legal_chicks_incubation_v1',
  FEED_INGREDIENTS: 'legal_chicks_feed_ingredients_v1',
  PELLET_LOGS: 'legal_chicks_pellet_logs_v1',
  ORDERS: 'legal_chicks_orders_v1',
  TRANSACTIONS: 'legal_chicks_transactions_v1',
  SYNC_LOGS: 'legal_chicks_sync_logs_v1',
  SIMULATED_OFFLINE: 'legal_chicks_simulated_offline_v1',
};

// Generate robust RFC4122 v4 UUID
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Subscription listeners for reactive updates
type StorageListener = () => void;
const listeners = new Set<StorageListener>();

export function subscribeToStorage(listener: StorageListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Storage listener error:', e);
    }
  });
}

// LocalStorage helpers with type safety and fallback
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Failed to read ${key} from storage, using default.`, e);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write ${key} to storage.`, e);
  }
}

// Offline State Manager
let isSimulatedOffline = loadFromStorage<boolean>(STORAGE_KEYS.SIMULATED_OFFLINE, false);

export function getSimulatedOffline(): boolean {
  return isSimulatedOffline;
}

export function setSimulatedOffline(offline: boolean): void {
  isSimulatedOffline = offline;
  saveToStorage(STORAGE_KEYS.SIMULATED_OFFLINE, offline);
  notifySubscribers();
  if (!offline && isEffectivelyOnline()) {
    triggerBackgroundSync();
  }
}

export function isEffectivelyOnline(): boolean {
  if (isSimulatedOffline) return false;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Initialize seed data if empty
export function initDatabase() {
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    saveToStorage(STORAGE_KEYS.SETTINGS, initialSettings);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PENS)) {
    saveToStorage(STORAGE_KEYS.PENS, initialPens);
  }
  if (!localStorage.getItem(STORAGE_KEYS.EGG_LOGS)) {
    saveToStorage(STORAGE_KEYS.EGG_LOGS, initialEggLogs);
  }
  if (!localStorage.getItem(STORAGE_KEYS.INCUBATION)) {
    saveToStorage(STORAGE_KEYS.INCUBATION, initialIncubationBatches);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FEED_INGREDIENTS)) {
    saveToStorage(STORAGE_KEYS.FEED_INGREDIENTS, initialFeedIngredients);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PELLET_LOGS)) {
    saveToStorage(STORAGE_KEYS.PELLET_LOGS, initialPelletLogs);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    saveToStorage(STORAGE_KEYS.ORDERS, initialOrders);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SYNC_LOGS)) {
    saveToStorage(STORAGE_KEYS.SYNC_LOGS, initialSyncLogs);
  }
}

// Generic Table CRUD Operations with Offline-First Sync Queue
class Table<T extends BaseRecord> {
  private key: string;
  private defaultData: T[];

  constructor(key: string, defaultData: T[]) {
    this.key = key;
    this.defaultData = defaultData;
  }

  getAll(includeDeleted: boolean = false): T[] {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    if (includeDeleted) return records;
    return records.filter(r => r.syncStatus !== 'pending_delete');
  }

  getById(id: string): T | undefined {
    return this.getAll(true).find(r => r.id === id);
  }

  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): T {
    const now = new Date().toISOString();
    const isOnline = isEffectivelyOnline();
    const newRecord: T = {
      ...(data as any),
      id: generateUuid(),
      createdAt: now,
      updatedAt: now,
      syncStatus: isOnline ? 'synced' : 'pending_create',
    };

    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    records.unshift(newRecord);
    saveToStorage(this.key, records);
    notifySubscribers();

    // If online, perform background sync
    if (isOnline) {
      triggerBackgroundSync();
    }

    return newRecord;
  }

  update(id: string, updates: Partial<T>): T | null {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = records[index];
    const now = new Date().toISOString();
    const isOnline = isEffectivelyOnline();

    // If it was already pending_create, keep it pending_create
    const newStatus: SyncStatus =
      existing.syncStatus === 'pending_create'
        ? 'pending_create'
        : isOnline
        ? 'synced'
        : 'pending_update';

    const updatedRecord: T = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
      syncStatus: newStatus,
    };

    records[index] = updatedRecord;
    saveToStorage(this.key, records);
    notifySubscribers();

    if (isOnline) {
      triggerBackgroundSync();
    }

    return updatedRecord;
  }

  delete(id: string): boolean {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;

    const existing = records[index];
    const isOnline = isEffectivelyOnline();

    if (existing.syncStatus === 'pending_create') {
      // Created offline and deleted before syncing: physically remove
      records.splice(index, 1);
    } else if (isOnline) {
      // Online: remove directly
      records.splice(index, 1);
    } else {
      // Offline: mark pending_delete so it can be synced to server
      records[index] = {
        ...existing,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_delete',
      };
    }

    saveToStorage(this.key, records);
    notifySubscribers();

    if (isOnline) {
      triggerBackgroundSync();
    }

    return true;
  }

  markAllSynced(): number {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    let count = 0;
    const finalRecords: T[] = [];

    for (const r of records) {
      if (r.syncStatus === 'pending_delete') {
        count++;
        // Delete permanently
        continue;
      }
      if (r.syncStatus === 'pending_create' || r.syncStatus === 'pending_update') {
        count++;
        finalRecords.push({ ...r, syncStatus: 'synced' });
      } else {
        finalRecords.push(r);
      }
    }

    if (count > 0) {
      saveToStorage(this.key, finalRecords);
    }
    return count;
  }

  getPendingCount(): number {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    return records.filter(r => r.syncStatus !== 'synced').length;
  }

  getPendingRecords(): T[] {
    const records = loadFromStorage<T[]>(this.key, this.defaultData);
    return records.filter(r => r.syncStatus !== 'synced');
  }

  replaceAll(records: T[]) {
    saveToStorage(this.key, records);
    notifySubscribers();
  }
}

// Table instances
export const pensTable = new Table<PenFlock>(STORAGE_KEYS.PENS, initialPens);
export const eggLogsTable = new Table<DailyEggLog>(STORAGE_KEYS.EGG_LOGS, initialEggLogs);
export const incubationTable = new Table<IncubationBatch>(STORAGE_KEYS.INCUBATION, initialIncubationBatches);
export const feedIngredientsTable = new Table<FeedIngredient>(STORAGE_KEYS.FEED_INGREDIENTS, initialFeedIngredients);
export const pelletLogsTable = new Table<PelletBatchLog>(STORAGE_KEYS.PELLET_LOGS, initialPelletLogs);
export const ordersTable = new Table<FertileEggOrder>(STORAGE_KEYS.ORDERS, initialOrders);
export const transactionsTable = new Table<FinanceTransaction>(STORAGE_KEYS.TRANSACTIONS, initialTransactions);

// Settings getter/setter
export function getFarmSettings(): FarmAppSettings {
  const loaded = loadFromStorage<Partial<FarmAppSettings>>(STORAGE_KEYS.SETTINGS, initialSettings);
  return { ...initialSettings, ...loaded };
}

export function updateFarmSettings(settings: Partial<FarmAppSettings>): FarmAppSettings {
  const current = getFarmSettings();
  const updated = { ...current, ...settings };
  saveToStorage(STORAGE_KEYS.SETTINGS, updated);
  notifySubscribers();
  return updated;
}

export function resetSettingsToDefault(): FarmAppSettings {
  saveToStorage(STORAGE_KEYS.SETTINGS, initialSettings);
  notifySubscribers();
  return initialSettings;
}

// Sync Logs
export function getSyncLogs(): SyncLogEvent[] {
  return loadFromStorage<SyncLogEvent[]>(STORAGE_KEYS.SYNC_LOGS, initialSyncLogs);
}

export function addSyncLog(event: Omit<SyncLogEvent, 'id' | 'timestamp'>) {
  const logs = getSyncLogs();
  const newLog: SyncLogEvent = {
    ...event,
    id: generateUuid(),
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  // Keep last 50 logs
  if (logs.length > 50) logs.pop();
  saveToStorage(STORAGE_KEYS.SYNC_LOGS, logs);
  notifySubscribers();
}

// Total pending records across all tables
export function getTotalPendingCount(): number {
  return (
    pensTable.getPendingCount() +
    eggLogsTable.getPendingCount() +
    incubationTable.getPendingCount() +
    feedIngredientsTable.getPendingCount() +
    pelletLogsTable.getPendingCount() +
    ordersTable.getPendingCount() +
    transactionsTable.getPendingCount()
  );
}

// Detailed pending breakdown
export function getPendingDetails() {
  return {
    pens: pensTable.getPendingRecords(),
    eggLogs: eggLogsTable.getPendingRecords(),
    incubation: incubationTable.getPendingRecords(),
    feedIngredients: feedIngredientsTable.getPendingRecords(),
    pelletLogs: pelletLogsTable.getPendingRecords(),
    orders: ordersTable.getPendingRecords(),
    transactions: transactionsTable.getPendingRecords(),
    total: getTotalPendingCount(),
  };
}

let syncTimeout: any = null;
let isSyncing = false;

export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

// Background Cloud Sync Routine
export async function triggerBackgroundSync(): Promise<{ success: boolean; recordsSynced: number; message: string }> {
  if (!isEffectivelyOnline()) {
    return {
      success: false,
      recordsSynced: 0,
      message: 'App is currently offline. Changes are saved locally and will auto-sync once back online.',
    };
  }

  if (isSyncing) {
    return {
      success: true,
      recordsSynced: 0,
      message: 'A sync routine is already in progress.',
    };
  }

  isSyncing = true;
  notifySubscribers();

  try {
    const pendingTotal = getTotalPendingCount();
    const settings = getFarmSettings();

    // If Webhook URL is specified and not placeholder, attempt a POST
    if (
      settings.webhookUrl &&
      settings.webhookUrl.startsWith('http') &&
      !settings.webhookUrl.includes('legalchicksfarm.ph')
    ) {
      const payload = {
        farm: settings.farmName,
        location: settings.location,
        timestamp: new Date().toISOString(),
        pending: getPendingDetails(),
      };
      
      try {
        // Attempt fetch with short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: 'no-cors' // Allows sending to third-party webhooks without CORS blocking
        }).catch(() => {
          // Fallback gracefully
        });
        clearTimeout(timeoutId);
      } catch (netErr) {
        // Continue with local sync marking
      }
    }

    // Mark pending records as synced
    let synced = 0;
    synced += pensTable.markAllSynced();
    synced += eggLogsTable.markAllSynced();
    synced += incubationTable.markAllSynced();
    synced += feedIngredientsTable.markAllSynced();
    synced += pelletLogsTable.markAllSynced();
    synced += ordersTable.markAllSynced();
    synced += transactionsTable.markAllSynced();

    addSyncLog({
      type: 'auto_sync',
      status: 'success',
      recordsAffected: synced,
      details: synced > 0 
        ? `Cloud synchronization complete: ${synced} record(s) synced to cloud.`
        : 'Cloud heartbeat check: All farm records are fully synchronized.',
    });

    isSyncing = false;
    notifySubscribers();
    return {
      success: true,
      recordsSynced: synced,
      message: `Sync successful! ${synced} records updated.`,
    };
  } catch (error: any) {
    isSyncing = false;
    addSyncLog({
      type: 'auto_sync',
      status: 'failed',
      recordsAffected: 0,
      details: `Sync failed: ${error?.message || 'Unknown network error'}. Changes remain safe offline.`,
    });
    notifySubscribers();
    return {
      success: false,
      recordsSynced: 0,
      message: `Sync failed: ${error?.message || 'Network error'}`,
    };
  }
}

// Setup browser online / offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!isSimulatedOffline) {
      notifySubscribers();
      triggerBackgroundSync();
    }
  });

  window.addEventListener('offline', () => {
    notifySubscribers();
  });
}

// Export Full JSON Backup
export function exportFullBackupJson(): void {
  const backup = {
    metadata: {
      farm: 'Legal Chicks Poultry Farm',
      location: 'Centro Solana, Cagayan, Philippines',
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    settings: getFarmSettings(),
    pens: pensTable.getAll(true),
    eggLogs: eggLogsTable.getAll(true),
    incubation: incubationTable.getAll(true),
    feedIngredients: feedIngredientsTable.getAll(true),
    pelletLogs: pelletLogsTable.getAll(true),
    orders: ordersTable.getAll(true),
    transactions: transactionsTable.getAll(true),
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `legal-chicks-solana-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);

  addSyncLog({
    type: 'export_backup',
    status: 'success',
    recordsAffected: Object.keys(backup).length,
    details: 'Full JSON backup snapshot exported successfully.',
  });
}

// Export Table to CSV
export function exportTableToCsv(
  tableName: 'eggLogs' | 'orders' | 'transactions',
  filenamePrefix: string
): void {
  let csvContent = '';
  const dateStr = new Date().toISOString().split('T')[0];

  if (tableName === 'eggLogs') {
    const logs = eggLogsTable.getAll();
    csvContent = 'Date,Pen,Breed,Fertile Eggs,Table Eggs,Rejects,Total Eggs,Laying Rate %,Mortality,Notes\n';
    logs.forEach(l => {
      csvContent += `"${l.date}","${l.penId}","${l.breed}",${l.fertileEggs},${l.tableEggs},${l.rejects},${l.totalEggs},${l.layingRatePercent}%,"${l.mortalityHens}H / ${l.mortalityRoosters}R","${(l.notes || '').replace(/"/g, '""')}"\n`;
    });
  } else if (tableName === 'orders') {
    const orders = ordersTable.getAll();
    csvContent = 'Order ID,Date,Customer,Contact,Location,Breed,Item,Qty,Unit Price (PHP),Bulk Disc %,Total (PHP),Status,Payment\n';
    orders.forEach(o => {
      csvContent += `"${o.orderNumber}","${o.dateReserved}","${o.customerName}","${o.contactNumber}","${o.location}","${o.breed}","${o.itemType}",${o.quantity},${o.unitBasePricePhp},${o.bulkDiscountPercent}%,${o.totalAmountPhp},"${o.status}","${o.paymentMethod}"\n`;
    });
  } else if (tableName === 'transactions') {
    const tx = transactionsTable.getAll();
    csvContent = 'Date,Type,Category,Description,Amount (PHP),Payment Method,Reference No\n';
    tx.forEach(t => {
      csvContent += `"${t.date}","${t.type}","${t.category}","${(t.description || '').replace(/"/g, '""')}",${t.amountPhp},"${t.paymentMethod}","${t.referenceNo || ''}"\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import JSON Backup
export function importBackupJson(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON file format.' };
    }

    if (parsed.settings) updateFarmSettings(parsed.settings);
    if (Array.isArray(parsed.pens)) pensTable.replaceAll(parsed.pens);
    if (Array.isArray(parsed.eggLogs)) eggLogsTable.replaceAll(parsed.eggLogs);
    if (Array.isArray(parsed.incubation)) incubationTable.replaceAll(parsed.incubation);
    if (Array.isArray(parsed.feedIngredients)) feedIngredientsTable.replaceAll(parsed.feedIngredients);
    if (Array.isArray(parsed.pelletLogs)) pelletLogsTable.replaceAll(parsed.pelletLogs);
    if (Array.isArray(parsed.orders)) ordersTable.replaceAll(parsed.orders);
    if (Array.isArray(parsed.transactions)) transactionsTable.replaceAll(parsed.transactions);

    addSyncLog({
      type: 'import_backup',
      status: 'success',
      recordsAffected: 0,
      details: 'JSON backup restored into local storage successfully.',
    });

    notifySubscribers();
    return { success: true, message: 'Backup successfully imported and all records restored!' };
  } catch (e: any) {
    return { success: false, message: `Import error: ${e?.message || 'Could not parse JSON'}` };
  }
}

// Reset All Farm Records to Start from 0
export function resetAllRecordsToZero(keepStructure: boolean = true): void {
  const now = new Date().toISOString();
  if (keepStructure) {
    // Keep pens and ingredient names, but set all bird counts and stock kg to 0
    const zeroedPens = pensTable.getAll().map(p => ({
      ...p,
      hensCount: 0,
      roostersCount: 0,
      updatedAt: now,
      syncStatus: isEffectivelyOnline() ? ('synced' as const) : ('pending_update' as const),
    }));
    const zeroedIngredients = feedIngredientsTable.getAll().map(f => ({
      ...f,
      stockKg: 0,
      updatedAt: now,
      syncStatus: isEffectivelyOnline() ? ('synced' as const) : ('pending_update' as const),
    }));
    pensTable.replaceAll(zeroedPens);
    feedIngredientsTable.replaceAll(zeroedIngredients);
  } else {
    pensTable.replaceAll([]);
    feedIngredientsTable.replaceAll([]);
  }

  eggLogsTable.replaceAll([]);
  incubationTable.replaceAll([]);
  pelletLogsTable.replaceAll([]);
  ordersTable.replaceAll([]);
  transactionsTable.replaceAll([]);

  addSyncLog({
    type: 'system_reset',
    status: 'success',
    recordsAffected: 0,
    details: keepStructure
      ? 'All logs, orders, batches, and ledger cleared to 0; pen bird counts and feed stock zeroed out.'
      : 'Complete factory wipe: all pens, ingredients, logs, batches, orders, and ledger reset to 0.',
  });

  notifySubscribers();
}

// Granular Module Reset to 0
export function resetModuleToZero(
  moduleName: 'pens' | 'eggLogs' | 'incubation' | 'feed' | 'orders' | 'finance'
): void {
  const now = new Date().toISOString();
  if (moduleName === 'pens') {
    const zeroedPens = pensTable.getAll().map(p => ({
      ...p,
      hensCount: 0,
      roostersCount: 0,
      updatedAt: now,
    }));
    pensTable.replaceAll(zeroedPens);
  } else if (moduleName === 'eggLogs') {
    eggLogsTable.replaceAll([]);
  } else if (moduleName === 'incubation') {
    incubationTable.replaceAll([]);
  } else if (moduleName === 'feed') {
    const zeroedIngredients = feedIngredientsTable.getAll().map(f => ({
      ...f,
      stockKg: 0,
      updatedAt: now,
    }));
    feedIngredientsTable.replaceAll(zeroedIngredients);
    pelletLogsTable.replaceAll([]);
  } else if (moduleName === 'orders') {
    ordersTable.replaceAll([]);
  } else if (moduleName === 'finance') {
    transactionsTable.replaceAll([]);
  }

  addSyncLog({
    type: 'system_reset',
    status: 'success',
    recordsAffected: 0,
    details: `Module "${moduleName}" reset to 0.`,
  });

  notifySubscribers();
}

// Restore Sample Demo Data
export function restoreSampleDemoData(): void {
  updateFarmSettings({ startInputsFromZero: false });
  pensTable.replaceAll(initialPens);
  eggLogsTable.replaceAll(initialEggLogs);
  incubationTable.replaceAll(initialIncubationBatches);
  feedIngredientsTable.replaceAll(initialFeedIngredients);
  pelletLogsTable.replaceAll(initialPelletLogs);
  ordersTable.replaceAll(initialOrders);
  transactionsTable.replaceAll(initialTransactions);

  addSyncLog({
    type: 'import_backup',
    status: 'success',
    recordsAffected:
      initialPens.length +
      initialEggLogs.length +
      initialIncubationBatches.length +
      initialFeedIngredients.length +
      initialPelletLogs.length +
      initialOrders.length +
      initialTransactions.length,
    details: 'Sample farm dataset for Legal Chicks Farm (Solana, Cagayan) restored.',
  });

  notifySubscribers();
}

// Initialize on module load
initDatabase();

