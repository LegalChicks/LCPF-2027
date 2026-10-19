import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Bird,
  Calendar,
  Cpu,
  ShoppingBag,
  DollarSign,
  Plus,
  Sun,
  Moon,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { NetworkSyncBar } from './components/NetworkSyncBar.tsx';
import { SyncModal } from './components/SyncModal.tsx';
import { QuickActionModal } from './components/QuickActionModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { FlockEggLogView } from './components/FlockEggLogView.tsx';
import { IncubatorManagerView } from './components/IncubatorManagerView.tsx';
import { FeedMillView } from './components/FeedMillView.tsx';
import { OrdersCrmView } from './components/OrdersCrmView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import {
  isEffectivelyOnline,
  getSimulatedOffline,
  getTotalPendingCount,
  subscribeToStorage,
} from './services/storage.ts';

type ActiveTab = 'dashboard' | 'flock' | 'incubator' | 'feed' | 'orders' | 'finance';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSunlightMode, setIsSunlightMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isEffectivelyOnline());
  const [isSimulated, setIsSimulated] = useState(getSimulatedOffline());
  const [pendingCount, setPendingCount] = useState(getTotalPendingCount());

  useEffect(() => {
    const handleUpdate = () => {
      setIsOnline(isEffectivelyOnline());
      setIsSimulated(getSimulatedOffline());
      setPendingCount(getTotalPendingCount());
    };

    handleUpdate();
    return subscribeToStorage(handleUpdate);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'flock' as const, label: 'Flock & Eggs', icon: Bird },
    { id: 'incubator' as const, label: '21-Day Hatchery', icon: Calendar },
    { id: 'feed' as const, label: 'Feed Mill', icon: Cpu },
    { id: 'orders' as const, label: 'Egg Orders', icon: ShoppingBag },
    { id: 'finance' as const, label: 'Finance & P&L', icon: DollarSign },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isSunlightMode
          ? 'bg-zinc-100 text-zinc-900'
          : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* Real-time Network & Sync Status Header Bar */}
      <NetworkSyncBar
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
      />

      {/* Secondary Subheader / Navigation Bar */}
      <div className="border-b border-emerald-900/40 bg-zinc-900/80 backdrop-blur-md sticky top-14 sm:top-16 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Desktop Navigation Tabs */}
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar" aria-label="Main Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                        : isSunlightMode
                        ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Sunlight Mode & Quick Log Trigger */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-2">
              <button
                onClick={() => setIsSunlightMode(!isSunlightMode)}
                className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  isSunlightMode
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
                title={isSunlightMode ? 'Switch to Dark Command Center' : 'Switch to High-Contrast Sunlight Mode for outdoor poultry pens'}
                aria-label="Toggle Sunlight Mode"
              >
                {isSunlightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden lg:inline text-[11px] font-semibold">
                  {isSunlightMode ? 'Coop Dark' : 'Sunlight'}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
            onOpenQuickAction={() => setIsQuickActionOpen(true)}
          />
        )}
        {activeTab === 'flock' && <FlockEggLogView />}
        {activeTab === 'incubator' && <IncubatorManagerView />}
        {activeTab === 'feed' && <FeedMillView />}
        {activeTab === 'orders' && <OrdersCrmView />}
        {activeTab === 'finance' && <FinanceView />}
      </main>

      {/* Floating Action Button (FAB) for One-Handed Coop Logging */}
      <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40">
        <button
          onClick={() => setIsQuickActionOpen(true)}
          aria-label="Quick Coop Logging Action"
          className="group relative flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-extrabold shadow-xl hover:shadow-amber-500/30 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-amber-300"
          title="Quick Action: Fast One-Handed Harvest & Order Logging"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          <span className="hidden sm:inline-block ml-2 text-xs font-black uppercase tracking-wider pr-1">
            Coop Log
          </span>
        </button>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md px-1 py-1.5 flex items-center justify-around text-[10px] font-semibold">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg transition ${
                isActive ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[55px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Persistent Offline Status Toast (when offline) */}
      {!isOnline && (
        <div className="fixed bottom-14 sm:bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-500 text-zinc-950 font-bold px-3 py-1.5 text-xs shadow-2xl border border-amber-400 animate-fadeIn">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isSimulated ? 'Simulated Offline' : 'Offline'} ({pendingCount} queued)
          </span>
        </div>
      )}

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onSuccess={triggerToast}
      />
    </div>
  );
}
