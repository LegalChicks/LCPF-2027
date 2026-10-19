import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Cloud,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  History,
  Layers,
  ExternalLink,
} from 'lucide-react';
import {
  getSyncLogs,
  getTotalPendingCount,
  getPendingDetails,
  triggerBackgroundSync,
  isCurrentlySyncing,
  getFarmSettings,
  updateFarmSettings,
  exportFullBackupJson,
  exportTableToCsv,
  importBackupJson,
  isEffectivelyOnline,
  subscribeToStorage,
} from '../services/storage.ts';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'cloud' | 'backup'>('status');
  const [logs, setLogs] = useState(getSyncLogs());
  const [pending, setPending] = useState(getPendingDetails());
  const [syncing, setSyncing] = useState(isCurrentlySyncing());
  const [settings, setSettings] = useState(getFarmSettings());
  const [webhookInput, setWebhookInput] = useState(settings.webhookUrl);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const update = () => {
      setLogs(getSyncLogs());
      setPending(getPendingDetails());
      setSyncing(isCurrentlySyncing());
      const s = getFarmSettings();
      setSettings(s);
      setWebhookInput(s.webhookUrl);
    };

    update();
    return subscribeToStorage(update);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSyncNow = async () => {
    setSyncing(true);
    await triggerBackgroundSync();
    setSyncing(false);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    updateFarmSettings({ webhookUrl: webhookInput.trim() });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBackupJson(content);
      setImportStatus(res.message);
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isOnline = isEffectivelyOnline();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-emerald-950/40 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-600/40 text-emerald-300">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cloud Sync Engine & Data Hub
              </h2>
              <p className="text-xs text-zinc-400">
                Offline-First IndexedDB synchronization for Legal Chicks Farm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-4 pt-2 gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'status'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Sync Queue ({pending.total})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sync History</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'cloud'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Cloud Webhook</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'backup'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Export / Backup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1">
          
          {/* TAB 1: Status & Queue */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-mono">CONNECTION STATUS</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="font-semibold text-white">
                      {isOnline ? 'Connected (Ready to Sync)' : 'Offline / Standalone Mode'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleManualSyncNow}
                  disabled={syncing || !isOnline}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isOnline
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-2">
                  Pending Sync Records Breakdown ({pending.total} items)
                </h3>
                {pending.total === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-950/60 border border-emerald-900/40 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-300 font-medium text-sm">All local records are synchronized!</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Any new egg harvest logs, incubation batches, orders, or feed runs will save locally first and queue for automatic cloud backup.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Egg Harvest Logs</span>
                      <p className="text-base font-bold text-amber-400">{pending.eggLogs.length} pending</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Incubator Batches</span>
                      <p className="text-base font-bold text-amber-400">{pending.incubation.length} pending</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Fertile Egg Orders</span>
                      <p className="text-base font-bold text-amber-400">{pending.orders.length} pending</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Feed Ingredients</span>
                      <p className="text-base font-bold text-amber-400">{pending.feedIngredients.length} pending</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Pelletizer Runs</span>
                      <p className="text-base font-bold text-amber-400">{pending.pelletLogs.length} pending</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Finance Ledger</span>
                      <p className="text-base font-bold text-amber-400">{pending.transactions.length} pending</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-xl text-xs text-emerald-300">
                <p className="font-semibold mb-1">💡 Offline-First Guarantee:</p>
                <p className="text-emerald-200/90 leading-relaxed">
                  You can walk into the breeding pens in Solana with zero mobile signal. Every egg counted, chick hatched, and pellet batch blended is saved immediately in your browser’s IndexedDB with an RFC4122 UUID and timestamp. When your phone reconnects, our background worker synchronizes everything automatically.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Sync History Logs */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">LATEST 50 SYNC EVENTS</span>
                <span className="text-xs text-emerald-400 font-medium">{logs.length} logged events</span>
              </div>
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 divide-y divide-zinc-800/80">
                {logs.length === 0 ? (
                  <p className="p-4 text-xs text-zinc-500 text-center">No sync logs recorded yet.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'success'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {log.type.replace('_', ' ')}
                          </span>
                          <span className="text-zinc-300 font-medium">{log.details}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block font-mono">
                          {new Date(log.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila Time)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">
                        {log.recordsAffected} records
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Cloud Webhook Config */}
          {activeTab === 'cloud' && (
            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Custom Cloud Webhook / API Endpoint URL
                </label>
                <p className="text-xs text-zinc-400">
                  Enter your remote REST endpoint, Google Apps Script Web App, or Webhook URL. Whenever you sync, the payload with all pending changes is posted here.
                </p>
                <input
                  type="url"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://api.yourfarm.com/sync"
                  className="w-full mt-1.5 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Save Webhook Settings
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Settings Saved!
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs text-zinc-400">
                <p className="font-semibold text-zinc-300">Default Farm Information:</p>
                <p>• Farm: <strong className="text-zinc-200">{settings.farmName}</strong></p>
                <p>• Location: <strong className="text-zinc-200">{settings.location}</strong></p>
                <p>• Currency: <strong className="text-zinc-200">{settings.currency}</strong></p>
                <p>• Timezone: <strong className="text-zinc-200">{settings.timezone}</strong></p>
              </div>
            </form>
          )}

          {/* TAB 4: Export / Import Backups */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  Full Snapshot Export
                </h4>
                <p className="text-xs text-zinc-400">
                  Export complete farm data including all Rhode Island Red & Black Australorp flocks, egg harvest logs, active 21-day incubation batches, feed mill stock, customer orders, and financial records as a single portable JSON file.
                </p>
                <button
                  onClick={exportFullBackupJson}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Full JSON Backup (.json)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Export Spreadsheets (CSV)
                </h4>
                <p className="text-xs text-zinc-400">
                  Open your farm data in Microsoft Excel or Google Sheets for bookkeeping and agricultural reporting:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportTableToCsv('eggLogs', 'legal-chicks-daily-eggs')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Daily Egg Harvest Log (.csv)
                  </button>
                  <button
                    onClick={() => exportTableToCsv('orders', 'legal-chicks-fertile-egg-orders')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Fertile Egg Orders CRM (.csv)
                  </button>
                  <button
                    onClick={() => exportTableToCsv('transactions', 'legal-chicks-finance-ledger')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Finance Ledger (.csv)
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  Restore / Import Backup
                </h4>
                <p className="text-xs text-zinc-400">
                  Restore previously saved JSON backup onto this device or a new farm tablet:
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Choose JSON Backup File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {importStatus && (
                  <p className="text-xs text-amber-400 font-medium bg-zinc-900 p-2 rounded border border-zinc-700">
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/80 rounded-b-2xl flex items-center justify-between text-xs text-zinc-400">
          <span>Legal Chicks Farm • Solana, Cagayan</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
