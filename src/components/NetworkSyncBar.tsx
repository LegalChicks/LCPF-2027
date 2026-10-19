import React, { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  SlidersHorizontal,
  MapPin,
  Settings,
} from 'lucide-react';
import {
  isEffectivelyOnline,
  getSimulatedOffline,
  setSimulatedOffline,
  getTotalPendingCount,
  triggerBackgroundSync,
  isCurrentlySyncing,
  getFarmSettings,
  subscribeToStorage,
} from '../services/storage.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NetworkSyncBarProps {
  onOpenSyncModal: () => void;
  onOpenQuickAction: () => void;
  onOpenSettings?: () => void;
}

export const NetworkSyncBar: React.FC<NetworkSyncBarProps> = ({
  onOpenSyncModal,
  onOpenSettings,
}) => {
  const [online, setOnline] = useState(isEffectivelyOnline());
  const [simulatedOffline, setSimOffline] = useState(getSimulatedOffline());
  const [pendingCount, setPendingCount] = useState(getTotalPendingCount());
  const [syncing, setSyncing] = useState(isCurrentlySyncing());
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [settings, setSettings] = useState(getFarmSettings());

  useEffect(() => {
    const update = () => {
      setOnline(isEffectivelyOnline());
      setSimOffline(getSimulatedOffline());
      setPendingCount(getTotalPendingCount());
      setSyncing(isCurrentlySyncing());
      setSettings(getFarmSettings());
    };

    update();
    const unsubscribe = subscribeToStorage(update);

    const handleWindowOnline = () => update();
    const handleWindowOffline = () => update();

    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', handleWindowOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('offline', handleWindowOffline);
    };
  }, []);

  const handleToggleOfflineSimulation = () => {
    const nextState = !simulatedOffline;
    setSimOffline(nextState);
    setSimulatedOffline(nextState);
    setOnline(!nextState && navigator.onLine);
    if (!nextState) {
      setSyncFeedback('Switched to Online: Triggering auto-sync...');
      setTimeout(() => setSyncFeedback(null), 3000);
    } else {
      setSyncFeedback('Simulated Offline Mode: All edits will queue locally.');
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const handleManualSync = async () => {
    if (!online) {
      setSyncFeedback('Cannot sync while offline. Disable offline simulation or connect to network.');
      setTimeout(() => setSyncFeedback(null), 3500);
      return;
    }
    setSyncing(true);
    const result = await triggerBackgroundSync();
    setSyncing(false);
    setSyncFeedback(result.message);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  return (
    <header className="bg-emerald-950/90 border-b border-emerald-800/60 backdrop-blur-md sticky top-0 z-40 text-emerald-100 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Farm Branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-900 border border-amber-500/50 flex items-center justify-center shadow-inner shrink-0">
              <span className="text-amber-400 text-lg">🐔</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate">
                  {settings.farmName}
                </span>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PHP
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-300/80 truncate">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{settings.location}</span>
              </div>
            </div>
          </div>

          {/* Network & Sync Control Hub */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Connection & Offline Simulator Toggle */}
            <div className="flex items-center bg-emerald-900/60 border border-emerald-700/60 rounded-lg p-1 gap-1">
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  online
                    ? 'text-emerald-300 bg-emerald-800/60'
                    : 'text-amber-300 bg-amber-950/80 border border-amber-800/60'
                }`}
                title={online ? 'Network Online' : 'Network Offline'}
              >
                {online ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="font-semibold">Offline</span>
                  </>
                )}
              </div>

              {/* Simulation Toggle Button */}
              <button
                onClick={handleToggleOfflineSimulation}
                aria-label={simulatedOffline ? 'Switch to online mode' : 'Simulate offline mode'}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition cursor-pointer flex items-center gap-1 ${
                  simulatedOffline
                    ? 'bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400'
                    : 'text-emerald-200 hover:bg-emerald-800/50 hover:text-white'
                }`}
                title="Toggle simulated offline mode for field testing in the chicken coop"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden md:inline">
                  {simulatedOffline ? 'Resume Online' : 'Test Offline'}
                </span>
                <span className="md:hidden">
                  {simulatedOffline ? 'Go Live' : 'Offline'}
                </span>
              </button>
            </div>

            {/* Pending Sync Queue Badge & Trigger */}
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50 hover:bg-emerald-800/40'
              }`}
              title="Click to sync local changes to cloud queue"
              aria-label="Synchronize data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncing ? 'animate-spin text-amber-400' : 'text-emerald-400'
                }`}
              />
              <span className="hidden sm:inline font-mono">
                {pendingCount > 0 ? `${pendingCount} Pending` : 'Synced'}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex sm:hidden items-center justify-center px-1.5 py-0.2 bg-amber-500 text-zinc-950 rounded-full text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Sync History & Cloud Config Modal Button */}
            <button
              onClick={onOpenSyncModal}
              className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/50 rounded-lg border border-emerald-700/50 transition cursor-pointer"
              title="Cloud Sync History, Webhooks & Full Data Backup"
              aria-label="Open Sync History and Cloud Configuration"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Settings & Reset to 0 Button */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 text-amber-300 hover:text-white hover:bg-emerald-800/50 rounded-lg border border-amber-500/40 transition cursor-pointer"
                title="Farm Settings & Reset to Start from 0"
                aria-label="Open Farm Settings and Reset"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Install PWA Button */}
            <PWAInstallButton />
          </div>
        </div>

        {/* Transient Sync Feedback Banner */}
        {syncFeedback && (
          <div className="py-1.5 px-3 mb-2 rounded-lg bg-emerald-900/90 border border-emerald-600/50 text-xs text-emerald-100 flex items-center justify-between animate-fadeIn">
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-emerald-300 hover:text-white ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
