import React, { useState, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  Save,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  DollarSign,
  Building2,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Bird,
  Egg,
  Calendar,
  Cpu,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  getFarmSettings,
  updateFarmSettings,
  resetSettingsToDefault,
  resetAllRecordsToZero,
  resetModuleToZero,
  restoreSampleDemoData,
  exportFullBackupJson,
  importBackupJson,
  pensTable,
  eggLogsTable,
  incubationTable,
  feedIngredientsTable,
  pelletLogsTable,
  ordersTable,
  transactionsTable,
  subscribeToStorage,
} from '../services/storage.ts';
import type { FarmAppSettings } from '../types/index.ts';
import { formatPhp } from '../utils/poultryMath.ts';

export const SettingsView: React.FC = () => {
  const [form, setForm] = useState<FarmAppSettings>(getFarmSettings());
  const [toast, setToast] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'zero_keep_structure' | 'complete_wipe' | 'restore_demo'>(null);

  // Live record counts for the Reset Center
  const [counts, setCounts] = useState({
    pens: pensTable.getAll().length,
    birds: pensTable.getAll().reduce((s, p) => s + p.hensCount + p.roostersCount, 0),
    eggLogs: eggLogsTable.getAll().length,
    batches: incubationTable.getAll().length,
    feedKg: feedIngredientsTable.getAll().reduce((s, f) => s + f.stockKg, 0),
    pelletRuns: pelletLogsTable.getAll().length,
    orders: ordersTable.getAll().length,
    transactions: transactionsTable.getAll().length,
  });

  const refreshCounts = () => {
    const pens = pensTable.getAll();
    const feed = feedIngredientsTable.getAll();
    setCounts({
      pens: pens.length,
      birds: pens.reduce((s, p) => s + p.hensCount + p.roostersCount, 0),
      eggLogs: eggLogsTable.getAll().length,
      batches: incubationTable.getAll().length,
      feedKg: feed.reduce((s, f) => s + f.stockKg, 0),
      pelletRuns: pelletLogsTable.getAll().length,
      orders: ordersTable.getAll().length,
      transactions: transactionsTable.getAll().length,
    });
  };

  useEffect(() => {
    refreshCounts();
    return subscribeToStorage(() => {
      refreshCounts();
      setForm(getFarmSettings());
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateFarmSettings(form);
    showToast('Farm settings saved and applied across all modules!');
  };

  const handleResetPricesAndInputsToZero = () => {
    setForm((prev) => ({
      ...prev,
      defaultRirEggPrice: 0,
      defaultAustralorpEggPrice: 0,
      defaultDocPrice: 0,
      defaultTableEggPrice: 0,
      bulkDiscountTier30: 0,
      bulkDiscountTier60: 0,
      bulkDiscountTier100: 0,
      packagingFeeSmall: 0,
      packagingFeeMedium: 0,
      packagingFeeLarge: 0,
      lowStockThresholdKg: 0,
      startInputsFromZero: true,
    }));
    showToast('Settings numeric inputs reset to 0. Click "Save All Settings" to persist.');
  };

  const handleRestoreDefaultSettings = () => {
    const def = resetSettingsToDefault();
    setForm(def);
    showToast('Default farm configuration restored!');
  };

  const executeResetAction = () => {
    if (confirmAction === 'zero_keep_structure') {
      resetAllRecordsToZero(true);
      showToast('All bird counts, feed stock, logs, batches, orders, and ledger reset to 0!');
    } else if (confirmAction === 'complete_wipe') {
      resetAllRecordsToZero(false);
      showToast('Complete factory wipe finished! All pens, ingredients, and records are now at 0.');
    } else if (confirmAction === 'restore_demo') {
      restoreSampleDemoData();
      showToast('Sample Solana, Cagayan farm dataset restored!');
    }
    setConfirmAction(null);
    refreshCounts();
  };

  const handleGranularReset = (
    moduleName: 'pens' | 'eggLogs' | 'incubation' | 'feed' | 'orders' | 'finance',
    label: string
  ) => {
    resetModuleToZero(moduleName);
    refreshCounts();
    showToast(`${label} reset to 0!`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const res = importBackupJson(content);
      showToast(res.message);
      refreshCounts();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 p-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>Farm Configuration & Reset Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Configure farm identity, default pricing, bulk discounts, form behavior, and reset farm data to start from 0
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetPricesAndInputsToZero}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/40 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zero Settings Inputs</span>
          </button>
          <button
            type="button"
            onClick={handleRestoreDefaultSettings}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Default Settings</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: START FROM 0 / RESET DATA CONTROL CENTER */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/25 border border-amber-500/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1.5">
              <RotateCcw className="w-3 h-3" />
              <span>Start From 0 • Clean Slate Manager</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Reset Farm Data & Inputs to Start from 0
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ready to log your own real poultry house numbers from scratch? Zero out all pre-loaded counts and logs below, or reset individual modules to 0.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmAction('zero_keep_structure')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Counts & Logs to 0</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmAction('complete_wipe')}
              className="px-3.5 py-2.5 bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-700/70 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Wipe Everything (Blank Slate)</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmAction('restore_demo')}
              className="px-3.5 py-2.5 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Restore Demo Data</span>
            </button>
          </div>
        </div>

        {/* Inline Confirmation Banner (No window.confirm needed) */}
        {confirmAction && (
          <div className="p-4 rounded-xl bg-zinc-950 border-2 border-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-white text-sm block">
                  {confirmAction === 'zero_keep_structure' && 'Confirm: Zero Out All Bird Counts, Stock & Logs to 0?'}
                  {confirmAction === 'complete_wipe' && 'Confirm: Complete Factory Wipe (Remove All Pens, Ingredients & Records)?'}
                  {confirmAction === 'restore_demo' && 'Confirm: Restore Pre-Loaded Solana Cagayan Demo Data?'}
                </strong>
                <span className="text-zinc-300">
                  {confirmAction === 'zero_keep_structure' &&
                    'This sets all pen hens/roosters to 0, feed stock to 0 kg, and clears all egg logs, incubator batches, orders, and financial records so every KPI starts at 0.'}
                  {confirmAction === 'complete_wipe' &&
                    'This deletes all pens, all feed ingredients, and all historical records so the database is 100% empty.'}
                  {confirmAction === 'restore_demo' &&
                    'This loads the sample 370 RIR & 69 Black Australorp pens, active incubator batches, feed stock, and sample orders.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetAction}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-lg text-xs cursor-pointer shadow"
              >
                Yes, Proceed Now
              </button>
            </div>
          </div>
        )}

        {/* Granular Module Reset Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Flock Birds</span>
                <Bird className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <strong className="text-base text-white block">{counts.birds} heads</strong>
              <span className="text-[10px] text-zinc-500">Across {counts.pens} pens</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('pens', 'Pen bird counts')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Zero Bird Counts
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Egg Harvests</span>
                <Egg className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <strong className="text-base text-white block">{counts.eggLogs} logs</strong>
              <span className="text-[10px] text-zinc-500">Daily harvest records</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('eggLogs', 'Egg harvest logs')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Reset to 0 Logs
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Hatchery</span>
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <strong className="text-base text-white block">{counts.batches} batches</strong>
              <span className="text-[10px] text-zinc-500">21-day incubator runs</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('incubation', 'Incubator batches')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Reset to 0 Batches
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Feed Mill</span>
                <Cpu className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <strong className="text-base text-white block">{counts.feedKg} kg</strong>
              <span className="text-[10px] text-zinc-500">{counts.pelletRuns} pellet batches</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('feed', 'Feed stock & pellet logs')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Zero Stock (0 kg)
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Egg Orders</span>
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <strong className="text-base text-white block">{counts.orders} orders</strong>
              <span className="text-[10px] text-zinc-500">CRM reservations</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('orders', 'Customer egg orders')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Reset to 0 Orders
            </button>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Finance P&L</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <strong className="text-base text-white block">{counts.transactions} entries</strong>
              <span className="text-[10px] text-zinc-500">Income & expense</span>
            </div>
            <button
              type="button"
              onClick={() => handleGranularReset('finance', 'Finance ledger')}
              className="mt-2.5 w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-amber-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Reset to Php 0.00
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: COMPLETE CONFIGURATION FORM */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Card 1: Farm Profile & Messenger Receipt Identity */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Farm Profile & Contact Details</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Farm Name</label>
                <input
                  type="text"
                  required
                  value={form.farmName}
                  onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Farm Address / Location</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">GCash / Contact Number</label>
                  <input
                    type="text"
                    required
                    value={form.ownerContact}
                    onChange={(e) => setForm({ ...form, ownerContact: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">GCash Account Name</label>
                  <input
                    type="text"
                    required
                    value={form.gcashAccountName}
                    onChange={(e) => setForm({ ...form, gcashAccountName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Default Feed Mill Operator</label>
                  <input
                    type="text"
                    value={form.defaultOperator}
                    onChange={(e) => setForm({ ...form, defaultOperator: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Default Incubator Machine</label>
                  <input
                    type="text"
                    value={form.defaultIncubatorName}
                    onChange={(e) => setForm({ ...form, defaultIncubatorName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Product Pricing & Bulk Discount Rules */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Default Pricing & Bulk Discount Tiers (PHP)</h3>
              </div>
              <span className="text-[11px] text-amber-400 font-mono">Currency: PHP (₱)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">RIR Fertile Egg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.defaultRirEggPrice}
                    onChange={(e) => setForm({ ...form, defaultRirEggPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Australorp Egg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.defaultAustralorpEggPrice}
                    onChange={(e) => setForm({ ...form, defaultAustralorpEggPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Day-Old Chick</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.defaultDocPrice}
                    onChange={(e) => setForm({ ...form, defaultDocPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">RTL Pullet</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.defaultPulletPrice ?? 450}
                    onChange={(e) => setForm({ ...form, defaultPulletPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Table Egg / pc</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.defaultTableEggPrice}
                    onChange={(e) => setForm({ ...form, defaultTableEggPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-amber-300 font-semibold block mb-1">30–59 Eggs Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.bulkDiscountTier30}
                    onChange={(e) => setForm({ ...form, bulkDiscountTier30: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-emerald-300 font-semibold block mb-1">60–99 Eggs Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.bulkDiscountTier60}
                    onChange={(e) => setForm({ ...form, bulkDiscountTier60: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-purple-300 font-semibold block mb-1">100+ Eggs Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.bulkDiscountTier100}
                    onChange={(e) => setForm({ ...form, bulkDiscountTier100: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-zinc-400 block mb-1">Box Fee (&lt;30 pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.packagingFeeSmall}
                    onChange={(e) => setForm({ ...form, packagingFeeSmall: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Box Fee (30–59)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.packagingFeeMedium}
                    onChange={(e) => setForm({ ...form, packagingFeeMedium: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Box Fee (60+ pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.packagingFeeLarge}
                    onChange={(e) => setForm({ ...form, packagingFeeLarge: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Form Input Defaults & Operational Thresholds */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Form Input Behavior & Alert Thresholds</h3>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Start All Form Numeric Inputs at 0</span>
                  <span className="text-zinc-400 text-[11px] block mt-0.5">
                    When enabled, opening any Egg Harvest, Incubator, Order, Feed, or Finance form initializes all number fields at 0 instead of sample numbers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.startInputsFromZero}
                  onChange={(e) => setForm({ ...form, startInputsFromZero: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded mt-0.5 shrink-0"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">
                    Global Low Feed Stock Alert (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.lowStockThresholdKg}
                    onChange={(e) => setForm({ ...form, lowStockThresholdKg: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">
                    Auto-Sync Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={form.autoSyncIntervalMinutes}
                    onChange={(e) => setForm({ ...form, autoSyncIntervalMinutes: Math.max(1, parseInt(e.target.value) || 5) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Cloud Sync Endpoint & Portable Backups */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Cloud Sync Webhook & Portable Backups</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Remote Cloud Webhook / API URL
                </label>
                <input
                  type="url"
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                  placeholder="https://api.legalchicksfarm.ph/v1/sync"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportFullBackupJson}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-semibold flex items-center gap-1.5 border border-zinc-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export Full JSON Backup</span>
                </button>

                <label className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-semibold flex items-center gap-1.5 border border-zinc-700 transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import JSON Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Save Bar */}
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-emerald-200">
            <strong>Ready to apply changes?</strong> Settings are stored offline in local storage and take effect immediately across all calculators and receipts.
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
