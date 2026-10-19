import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Flame,
  CheckCircle2,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  incubationTable,
  getFarmSettings,
  resetModuleToZero,
  subscribeToStorage,
} from '../services/storage.ts';
import {
  calculateIncubationMilestones,
  getIncubationCurrentState,
  calculateFertilityAndHatchability,
} from '../utils/poultryMath.ts';
import type { IncubationBatch, PoultryBreed } from '../types/index.ts';

export const IncubatorManagerView: React.FC = () => {
  const settings = getFarmSettings();
  const [batches, setBatches] = useState<IncubationBatch[]>(incubationTable.getAll());
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<IncubationBatch | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form states for New Batch
  const [batchCode, setBatchCode] = useState(`LC-INC-2026-0${batches.length + 20}`);
  const [incubatorName, setIncubatorName] = useState(settings.defaultIncubatorName);
  const [breed, setBreed] = useState<PoultryBreed>('Rhode Island Red');
  const [dateSet, setDateSet] = useState(new Date().toISOString().split('T')[0]);
  const [eggsSetCount, setEggsSetCount] = useState<number>(settings.startInputsFromZero ? 0 : 120);
  const [batchNotes, setBatchNotes] = useState('');

  // Candling & Hatch logging state
  const [clearsDay7, setClearsDay7] = useState<number>(0);
  const [deadDay14, setDeadDay14] = useState<number>(0);
  const [chicksHatched, setChicksHatched] = useState<number>(0);
  const [weakChicks, setWeakChicks] = useState<number>(0);
  const [deadInShell, setDeadInShell] = useState<number>(0);
  const [statusOverride, setStatusOverride] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const syncData = () => {
      setBatches(incubationTable.getAll());
    };
    syncData();
    return subscribeToStorage(syncData);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenNewBatch = () => {
    const s = getFarmSettings();
    const current = incubationTable.getAll();
    setBatchCode(`LC-INC-2026-0${current.length + 20}`);
    setIncubatorName(s.defaultIncubatorName);
    setEggsSetCount(s.startInputsFromZero ? 0 : 120);
    setBatchNotes('');
    setIsNewBatchOpen(true);
  };

  const handleResetNewBatchToZero = () => {
    setEggsSetCount(0);
    setBatchNotes('');
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (eggsSetCount <= 0) {
      showToast('Please enter at least 1 egg set count.');
      return;
    }
    const milestones = calculateIncubationMilestones(dateSet);

    incubationTable.create({
      batchCode: batchCode.trim(),
      incubatorName: incubatorName.trim(),
      breed,
      dateSet,
      eggsSetCount: Number(eggsSetCount),
      day7CandlingDate: milestones.day7CandlingDate,
      day14CandlingDate: milestones.day14CandlingDate,
      day18LockdownDate: milestones.day18LockdownDate,
      day21HatchDate: milestones.day21HatchDate,
      status: 'Set / Warming',
      notes: batchNotes.trim(),
    });

    setBatches(incubationTable.getAll());
    setIsNewBatchOpen(false);
    showToast(`Incubation batch ${batchCode} created!`);
  };

  const handleOpenEdit = (batch: IncubationBatch) => {
    setEditingBatch(batch);
    setClearsDay7(batch.day7ClearsCount || 0);
    setDeadDay14(batch.day14DeadCount || 0);
    setChicksHatched(batch.chicksHatchedCount || 0);
    setWeakChicks(batch.weakChicksCount || 0);
    setDeadInShell(batch.deadInShellCount || 0);
    setStatusOverride(batch.status);
  };

  const handleResetInspectionToZero = () => {
    setClearsDay7(0);
    setDeadDay14(0);
    setChicksHatched(0);
    setWeakChicks(0);
    setDeadInShell(0);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    const stats = calculateFertilityAndHatchability(
      editingBatch.eggsSetCount,
      clearsDay7,
      deadDay14,
      chicksHatched
    );

    incubationTable.update(editingBatch.id, {
      day7ClearsCount: Number(clearsDay7),
      day14DeadCount: Number(deadDay14),
      chicksHatchedCount: Number(chicksHatched),
      weakChicksCount: Number(weakChicks),
      deadInShellCount: Number(deadInShell),
      fertilityPercent: stats.fertilityPercent,
      hatchabilityPercent: stats.hatchabilityPercent,
      totalHatchabilityPercent: stats.totalHatchabilityPercent,
      status: (statusOverride as any) || editingBatch.status,
    });

    setBatches(incubationTable.getAll());
    setEditingBatch(null);
    showToast(`Updated candling & hatch stats for ${editingBatch.batchCode}!`);
  };

  const handleDeleteBatch = (id: string, code: string) => {
    incubationTable.delete(id);
    setBatches(incubationTable.getAll());
    showToast(`Batch ${code} deleted.`);
  };

  const handleZeroAllBatches = () => {
    resetModuleToZero('incubation');
    setBatches(incubationTable.getAll());
    showToast('All incubator batches reset to 0!');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header and Creator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            21-Day Hatchery & Incubator Manager
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Day 7/14 candling checks, Day 18 lockdown protocols, fertility & hatchability analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllBatches}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Batches to 0</span>
          </button>
          <button
            onClick={handleOpenNewBatch}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Incubation Batch</span>
          </button>
        </div>
      </div>

      {/* Protocol Banner */}
      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <strong className="text-amber-400 block mb-0.5">DAY 1 - 17: SETTING</strong>
          <span>37.5°C • 50-55% Humidity • Hourly automatic turn</span>
        </div>
        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <strong className="text-amber-400 block mb-0.5">DAY 7 CANDLING</strong>
          <span>Identify spider veins • Remove clear/infertile eggs</span>
        </div>
        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <strong className="text-red-400 block mb-0.5">DAY 18 LOCKDOWN</strong>
          <span>Turn off rollers • Boost humidity to 70%+</span>
        </div>
        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <strong className="text-emerald-400 block mb-0.5">DAY 21 HATCH DAY</strong>
          <span>Chicks dry in brooder • Marek & NCD-B1 vaccine</span>
        </div>
      </div>

      {/* Active Batches List */}
      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
            0 incubator batches active. Click "New Incubation Batch" to set your first batch of fertile eggs.
          </div>
        ) : (
          batches.map((batch) => {
            const state = getIncubationCurrentState(batch.dateSet, todayStr);
            const progressPercent = Math.min(100, Math.round((state.currentDay / 21) * 100));

            return (
              <div
                key={batch.id}
                className={`p-4 sm:p-5 rounded-2xl bg-zinc-900 border transition ${
                  state.isLockdown
                    ? 'border-amber-500/80 shadow-lg shadow-amber-950/20'
                    : 'border-zinc-800'
                }`}
              >
                {/* Batch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base sm:text-lg font-bold text-white font-mono">
                      {batch.batchCode}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      batch.breed === 'Rhode Island Red'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}>
                      {batch.breed}
                    </span>
                    <span className="text-xs text-zinc-400">
                      • {batch.incubatorName} • <strong>{batch.eggsSetCount} eggs set</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      state.isLockdown
                        ? 'bg-amber-500 text-zinc-950 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {state.statusText}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(batch)}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                    >
                      Log Candling / Hatch
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id, batch.batchCode)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 21-Day Visual Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Day {state.currentDay} of 21</span>
                    <span className="text-white font-medium">{progressPercent}% complete</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-3 p-0.5 border border-zinc-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        state.isLockdown
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'
                          : 'bg-gradient-to-r from-emerald-600 to-amber-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                    <span className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-zinc-600" title="Day 7" />
                    <span className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-zinc-600" title="Day 14" />
                    <span className="absolute top-0 bottom-0 left-[85%] w-0.5 bg-red-400" title="Day 18 Lockdown" />
                  </div>
                </div>

                {/* 4 Critical Milestones Grid */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${
                    todayStr >= batch.day7CandlingDate
                      ? 'bg-zinc-950 border-emerald-900/60 text-emerald-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block mb-1">Day 7 Candling</span>
                    <strong className="font-mono text-white block">{batch.day7CandlingDate}</strong>
                    <span className="text-[11px] mt-1 block">
                      {batch.day7ClearsCount !== undefined ? `${batch.day7ClearsCount} clears removed` : 'Vein check'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    todayStr >= batch.day14CandlingDate
                      ? 'bg-zinc-950 border-emerald-900/60 text-emerald-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block mb-1">Day 14 Candling</span>
                    <strong className="font-mono text-white block">{batch.day14CandlingDate}</strong>
                    <span className="text-[11px] mt-1 block">
                      {batch.day14DeadCount !== undefined ? `${batch.day14DeadCount} dead in shell` : 'Embryo motion'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    state.isLockdown
                      ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
                      : todayStr > batch.day18LockdownDate
                      ? 'bg-zinc-950 border-emerald-900/60 text-emerald-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block mb-1 text-red-400">
                      Day 18 Lockdown
                    </span>
                    <strong className="font-mono text-white block">{batch.day18LockdownDate}</strong>
                    <span className="text-[11px] mt-1 block">
                      Stop turning • 72% RH
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    state.isHatched
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block mb-1 text-emerald-400">
                      Day 21 Hatch
                    </span>
                    <strong className="font-mono text-white block">{batch.day21HatchDate}</strong>
                    <span className="text-[11px] mt-1 block">
                      {batch.chicksHatchedCount ? `${batch.chicksHatchedCount} hatched chicks` : 'Expected Pip'}
                    </span>
                  </div>
                </div>

                {/* Fertility and Hatchability Analytics Bar */}
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-zinc-400 text-[10px] block">Fertility Rate</span>
                      <strong className="text-amber-400 font-bold text-sm">
                        {batch.fertilityPercent !== undefined ? `${batch.fertilityPercent}%` : 'Pending Day 7'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[10px] block">Hatchability (of Fertile)</span>
                      <strong className="text-emerald-400 font-bold text-sm">
                        {batch.hatchabilityPercent !== undefined ? `${batch.hatchabilityPercent}%` : 'Pending Hatch'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[10px] block">Total Hatch Rate</span>
                      <strong className="text-purple-400 font-bold text-sm">
                        {batch.totalHatchabilityPercent !== undefined ? `${batch.totalHatchabilityPercent}%` : 'Pending Hatch'}
                      </strong>
                    </div>
                  </div>

                  {batch.notes && (
                    <p className="text-zinc-400 text-[11px] italic max-w-sm">
                      "{batch.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Incubation Batch */}
      {isNewBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>Create 21-Day Incubation Batch</span>
              </h3>
              <button
                type="button"
                onClick={handleResetNewBatchToZero}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Batch Code</label>
                <input
                  type="text"
                  required
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Incubator Unit Name</label>
                <input
                  type="text"
                  required
                  value={incubatorName}
                  onChange={(e) => setIncubatorName(e.target.value)}
                  placeholder="e.g. Solana Master Cabinet 1"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Breed</label>
                  <select
                    value={breed}
                    onChange={(e) => setBreed(e.target.value as PoultryBreed)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Rhode Island Red">Rhode Island Red</option>
                    <option value="Black Australorp">Black Australorp</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Eggs Set Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={eggsSetCount}
                    onChange={(e) => setEggsSetCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Date Set (Warm Day 1)</label>
                <input
                  type="date"
                  required
                  value={dateSet}
                  onChange={(e) => setDateSet(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              {/* Live Preview of Calculated Milestones */}
              {dateSet && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1 text-[11px] text-zinc-300">
                  <div className="font-bold text-amber-400 mb-1">Auto-Calculated Milestones:</div>
                  <div>• Day 7 Candling: <strong className="text-white">{calculateIncubationMilestones(dateSet).day7CandlingDate}</strong></div>
                  <div>• Day 14 Candling: <strong className="text-white">{calculateIncubationMilestones(dateSet).day14CandlingDate}</strong></div>
                  <div>• Day 18 Lockdown: <strong className="text-red-400 font-bold">{calculateIncubationMilestones(dateSet).day18LockdownDate}</strong></div>
                  <div>• Day 21 Expected Hatch: <strong className="text-emerald-400 font-bold">{calculateIncubationMilestones(dateSet).day21HatchDate}</strong></div>
                </div>
              )}

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Sanitization notes, temperature calibration..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewBatchOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow cursor-pointer"
                >
                  Start Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Candling & Hatch Results */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>Inspection & Hatch Log: {editingBatch.batchCode}</span>
              </h3>
              <button
                type="button"
                onClick={handleResetInspectionToZero}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              {editingBatch.breed} • Set on {editingBatch.dateSet} ({editingBatch.eggsSetCount} eggs)
            </p>

            <form onSubmit={handleSaveInspection} className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-bold text-amber-400 block">Day 7 & Day 14 Candling Results</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Day 7 Clear / Infertile</label>
                    <input
                      type="number"
                      min="0"
                      value={clearsDay7}
                      onChange={(e) => setClearsDay7(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Day 14 Dead in Shell</label>
                    <input
                      type="number"
                      min="0"
                      value={deadDay14}
                      onChange={(e) => setDeadDay14(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-bold text-emerald-400 block">Day 21 Hatch Counts</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-400 block mb-1">Chicks Hatched</label>
                    <input
                      type="number"
                      min="0"
                      value={chicksHatched}
                      onChange={(e) => setChicksHatched(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-emerald-400 font-bold text-base"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Weak / Cull</label>
                    <input
                      type="number"
                      min="0"
                      value={weakChicks}
                      onChange={(e) => setWeakChicks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Dead in Shell</label>
                    <input
                      type="number"
                      min="0"
                      value={deadInShell}
                      onChange={(e) => setDeadInShell(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-red-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Batch Status</label>
                <select
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="Set / Warming">Set / Warming</option>
                  <option value="Day 7 Candling">Day 7 Candling</option>
                  <option value="Day 14 Candling">Day 14 Candling</option>
                  <option value="Lockdown (Day 18+)">Lockdown (Day 18+)</option>
                  <option value="Hatching">Hatching in Progress</option>
                  <option value="Completed">Completed (Chicks Transferred)</option>
                </select>
              </div>

              {/* Calculated Stats Preview */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Computed Fertility:</span>
                  <strong className="text-amber-400">
                    {calculateFertilityAndHatchability(editingBatch.eggsSetCount, clearsDay7, deadDay14, chicksHatched).fertilityPercent}%
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Hatchability (of Fertile):</span>
                  <strong className="text-emerald-400">
                    {calculateFertilityAndHatchability(editingBatch.eggsSetCount, clearsDay7, deadDay14, chicksHatched).hatchabilityPercent}%
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  Update Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
