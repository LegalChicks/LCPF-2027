import React from 'react';
import {
  Bird,
  Egg,
  Calendar,
  ShoppingBag,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Flame,
  Plus,
} from 'lucide-react';
import {
  pensTable,
  eggLogsTable,
  incubationTable,
  ordersTable,
  transactionsTable,
  feedIngredientsTable,
} from '../services/storage.ts';
import {
  calculateLayingRate,
  formatPhp,
  getIncubationCurrentState,
} from '../utils/poultryMath.ts';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenQuickAction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAction,
}) => {
  const pens = pensTable.getAll();
  const eggLogs = eggLogsTable.getAll();
  const batches = incubationTable.getAll();
  const orders = ordersTable.getAll();
  const transactions = transactionsTable.getAll();
  const feedIngredients = feedIngredientsTable.getAll();

  // 1. Total Active Birds
  const rirHens = pens
    .filter((p) => p.breed === 'Rhode Island Red')
    .reduce((sum, p) => sum + p.hensCount, 0);
  const rirRoosters = pens
    .filter((p) => p.breed === 'Rhode Island Red')
    .reduce((sum, p) => sum + p.roostersCount, 0);

  const baHens = pens
    .filter((p) => p.breed === 'Black Australorp')
    .reduce((sum, p) => sum + p.hensCount, 0);
  const baRoosters = pens
    .filter((p) => p.breed === 'Black Australorp')
    .reduce((sum, p) => sum + p.roostersCount, 0);

  const totalHens = rirHens + baHens;
  const totalBirds = totalHens + rirRoosters + baRoosters;

  // 2. Today's Egg Collection & Laying Rate %
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = eggLogs.filter((l) => l.date === todayStr);
  const todayEggsTotal = todayLogs.reduce((sum, l) => sum + l.totalEggs, 0);
  const todayFertile = todayLogs.reduce((sum, l) => sum + l.fertileEggs, 0);
  const todayTable = todayLogs.reduce((sum, l) => sum + l.tableEggs, 0);
  const todayRejects = todayLogs.reduce((sum, l) => sum + l.rejects, 0);

  const hensForHarvest = todayLogs.length > 0
    ? todayLogs.reduce((sum, l) => sum + l.activeHensOnDate, 0)
    : (eggLogs[0]?.activeHensOnDate || 110);
  const eggsForHarvest = todayEggsTotal > 0 ? todayEggsTotal : (eggLogs[0]?.totalEggs || 92);
  const overallLayingRate = calculateLayingRate(eggsForHarvest, hensForHarvest);

  // 3. Active Incubator Batches approaching Day 18/21
  const activeBatches = batches.filter((b) => b.status !== 'Completed' && b.status !== 'Archived');
  const criticalBatches = activeBatches.map((b) => {
    const state = getIncubationCurrentState(b.dateSet, todayStr);
    return { ...b, state };
  });

  // 4. Pending Fertile Egg Orders
  const pendingOrders = orders.filter((o) => o.status === 'Reserved' || o.status === 'Paid');
  const pendingOrdersValue = pendingOrders.reduce((sum, o) => sum + o.totalAmountPhp, 0);

  // 5. Monthly Net Profit (₱)
  const totalIncome = transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amountPhp, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amountPhp, 0);
  const netProfit = totalIncome - totalExpenses;

  // 6. Low Feed Stock Alerts (< 35kg)
  const lowFeedItems = feedIngredients.filter((f) => f.stockKg <= f.reorderLevelKg);

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Farm Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-zinc-900 border border-emerald-700/50 p-5 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Offline-First Command Center • Cagayan Valley</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Legal Chicks Poultry Farm
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 max-w-xl">
              Centro Solana, Cagayan • Purebred Rhode Island Reds & Black Australorps breeding station, on-site feed pelletizing, and automated 21-day incubation management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenQuickAction}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Coop Log</span>
            </button>
            <button
              onClick={() => onNavigate('incubator')}
              className="px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-600/50 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Hatchery</span>
              <ChevronRight className="w-4 h-4 text-emerald-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Incubation / Low Stock Alert Ribbon */}
      {criticalBatches.some((b) => b.state.isLockdown) && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <div>
              <strong className="text-white">Incubator Alert:</strong> Batch{' '}
              <span className="font-mono text-amber-300 font-bold">
                {criticalBatches.find((b) => b.state.isLockdown)?.batchCode}
              </span>{' '}
              is currently in <strong>LOCKDOWN (Day 18-21)</strong>! Maintain humidity at 70%+ and verify egg turners are OFF.
            </div>
          </div>
          <button
            onClick={() => onNavigate('incubator')}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg shrink-0 cursor-pointer"
          >
            Check Batch
          </button>
        </div>
      )}

      {lowFeedItems.length > 0 && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Low Feed Stock Alert:</strong> {lowFeedItems.map((f) => `${f.name} (${f.stockKg}kg left)`).join(', ')} is at or below reorder level.
            </span>
          </div>
          <button
            onClick={() => onNavigate('feed')}
            className="px-2.5 py-1 bg-red-900/80 hover:bg-red-800 text-white font-medium text-xs rounded-lg shrink-0 cursor-pointer"
          >
            Restock
          </button>
        </div>
      )}

      {/* 6 Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* KPI 1: Total Active Birds */}
        <div
          onClick={() => onNavigate('flock')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-600/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Birds</span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 group-hover:scale-110 transition">
              <Bird className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalBirds}</span>
            <span className="text-xs text-emerald-400 font-medium">heads</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span>🔴 RIR: <strong>{rirHens + rirRoosters}</strong></span>
            <span>⚫ Australorp: <strong>{baHens + baRoosters}</strong></span>
          </div>
        </div>

        {/* KPI 2: Today's Egg Collection & Laying Rate */}
        <div
          onClick={() => onNavigate('flock')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Egg Harvest Today</span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 group-hover:scale-110 transition">
              <Egg className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {todayEggsTotal > 0 ? todayEggsTotal : 208}
            </span>
            <span className="text-xs text-amber-400 font-bold">
              {overallLayingRate}% Laying
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span>🥚 Fertile: <strong>{todayFertile > 0 ? todayFertile : 172}</strong></span>
            <span>🍳 Table: <strong>{todayTable > 0 ? todayTable : 30}</strong></span>
          </div>
        </div>

        {/* KPI 3: Active Incubator Batches */}
        <div
          onClick={() => onNavigate('incubator')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Incubator Batches</span>
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 group-hover:scale-110 transition">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{activeBatches.length}</span>
            <span className="text-xs text-purple-300 font-medium">batches in machine</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span>Eggs Setting: <strong>{activeBatches.reduce((s, b) => s + b.eggsSetCount, 0)} pcs</strong></span>
            <span className="text-amber-400 font-semibold">Day 18 Lockdown!</span>
          </div>
        </div>

        {/* KPI 4: Pending Fertile Egg Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-blue-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Orders</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 group-hover:scale-110 transition">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{pendingOrders.length}</span>
            <span className="text-xs text-blue-300 font-bold">{formatPhp(pendingOrdersValue)}</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span>Tuguegarao & Solana clients</span>
            <span className="text-emerald-400 font-medium">Ready to dispatch</span>
          </div>
        </div>

        {/* KPI 5: Monthly Net Profit (₱) */}
        <div
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Farm Profit</span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPhp(netProfit)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span className="text-emerald-400 font-medium">In: {formatPhp(totalIncome)}</span>
            <span className="text-zinc-400">Ex: {formatPhp(totalExpenses)}</span>
          </div>
        </div>

        {/* KPI 6: Feed Mill & Pelletizer Stock */}
        <div
          onClick={() => onNavigate('feed')}
          className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Feed Mill Stock</span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 group-hover:scale-110 transition">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {feedIngredients.reduce((s, f) => s + f.stockKg, 0)}
            </span>
            <span className="text-xs text-amber-300 font-medium">kg raw materials</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 flex justify-between">
            <span>Corn: 420kg • Darak: 310kg</span>
            <span className="text-emerald-400">Pelletizer ready</span>
          </div>
        </div>

      </div>

      {/* Dual Column: Active Hatchery Schedule & Breed Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Active Incubator Batches Timeline Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">21-Day Incubation Pipeline</h2>
            </div>
            <button
              onClick={() => onNavigate('incubator')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-0.5 font-medium cursor-pointer"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {activeBatches.map((batch) => {
              const state = getIncubationCurrentState(batch.dateSet, todayStr);
              return (
                <div
                  key={batch.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{batch.batchCode}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        batch.breed === 'Rhode Island Red'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                      }`}>
                        {batch.breed}
                      </span>
                      <span className="text-zinc-400">({batch.eggsSetCount} eggs)</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] mt-1">
                      Set: <strong>{batch.dateSet}</strong> • Expected Hatch: <strong className="text-amber-400">{batch.day21HatchDate}</strong>
                    </p>
                  </div>

                  <div className="text-right sm:text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      state.isLockdown
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {state.statusText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breed Comparison & Laying Persistence */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Bird className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Breeding Flock Breakdown</h2>
            </div>
            <button
              onClick={() => onNavigate('flock')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium cursor-pointer"
            >
              <span>View Pens</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rhode Island Red */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                  <strong className="text-white text-sm">Rhode Island Red (RIR)</strong>
                </div>
                <span className="text-amber-400 font-bold font-mono">310 Hens • 60 Roosters</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed mb-2">
                Heavy egg production breed acclimated to Cagayan Valley humidity. Standard layer diet + Azolla produces dark brown, thick-shelled hatching eggs.
              </p>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-amber-500 h-2 rounded-full" style={{ width: '84%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>Avg Laying Rate: 84.2%</span>
                <span className="text-emerald-400">Breeding Ratio 1:5.1</span>
              </div>
            </div>

            {/* Black Australorp */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-zinc-400 inline-block" />
                  <strong className="text-white text-sm">Black Australorp (Heritage)</strong>
                </div>
                <span className="text-amber-400 font-bold font-mono">58 Hens • 11 Roosters</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed mb-2">
                World record egg layer pedigree. Hardy dual-purpose line with iridescent green plumage and docile foraging behavior.
              </p>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-zinc-500 to-emerald-400 h-2 rounded-full" style={{ width: '82%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>Avg Laying Rate: 82.8%</span>
                <span className="text-emerald-400">Breeding Ratio 1:5.2</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
