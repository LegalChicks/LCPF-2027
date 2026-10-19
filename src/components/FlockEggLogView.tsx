import React, { useState, useEffect } from 'react';
import {
  Bird,
  Egg,
  Plus,
  Trash2,
  Download,
  Search,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import {
  pensTable,
  eggLogsTable,
  exportTableToCsv,
  getFarmSettings,
  resetModuleToZero,
  subscribeToStorage,
} from '../services/storage.ts';
import {
  calculateLayingRate,
} from '../utils/poultryMath.ts';
import type { PenFlock, DailyEggLog, PoultryBreed } from '../types/index.ts';

export const FlockEggLogView: React.FC = () => {
  const settings = getFarmSettings();
  const [pens, setPens] = useState<PenFlock[]>(pensTable.getAll());
  const [logs, setLogs] = useState<DailyEggLog[]>(eggLogsTable.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBreed, setFilterBreed] = useState<'All' | PoultryBreed>('All');

  // New Pen Modal State
  const [isPenModalOpen, setIsPenModalOpen] = useState(false);
  const [penCode, setPenCode] = useState('');
  const [penBreed, setPenBreed] = useState<PoultryBreed>('Rhode Island Red');
  const [roostersCount, setRoostersCount] = useState<number>(settings.startInputsFromZero ? 0 : 10);
  const [hensCount, setHensCount] = useState<number>(settings.startInputsFromZero ? 0 : 50);
  const [housingType, setHousingType] = useState<'Deep Litter' | 'Free Range Pasture' | 'Breeding Pen'>('Free Range Pasture');
  const [penNotes, setPenNotes] = useState('');

  // New Egg Log Form State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedPenId, setSelectedPenId] = useState(pens[0]?.id || '');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [fertileEggs, setFertileEggs] = useState<number>(settings.startInputsFromZero ? 0 : 45);
  const [tableEggs, setTableEggs] = useState<number>(settings.startInputsFromZero ? 0 : 8);
  const [rejects, setRejects] = useState<number>(0);
  const [mortalityHens, setMortalityHens] = useState<number>(0);
  const [mortalityRoosters, setMortalityRoosters] = useState<number>(0);
  const [vitamins, setVitamins] = useState(settings.startInputsFromZero ? '' : 'Electrolytes in morning water + Azolla forage');
  const [logNotes, setLogNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const syncData = () => {
      const latestPens = pensTable.getAll();
      setPens(latestPens);
      setLogs(eggLogsTable.getAll());
      if (latestPens.length > 0 && !latestPens.some((p) => p.id === selectedPenId)) {
        setSelectedPenId(latestPens[0].id);
      }
    };
    syncData();
    return subscribeToStorage(syncData);
  }, [selectedPenId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenPenModal = () => {
    const s = getFarmSettings();
    setPenCode('');
    setPenNotes('');
    setHensCount(s.startInputsFromZero ? 0 : 50);
    setRoostersCount(s.startInputsFromZero ? 0 : 10);
    setIsPenModalOpen(true);
  };

  const handleResetPenFormToZero = () => {
    setPenCode('');
    setHensCount(0);
    setRoostersCount(0);
    setPenNotes('');
  };

  const handleOpenLogModal = () => {
    const s = getFarmSettings();
    const currentPens = pensTable.getAll();
    setSelectedPenId(currentPens[0]?.id || '');
    setFertileEggs(s.startInputsFromZero ? 0 : 45);
    setTableEggs(s.startInputsFromZero ? 0 : 8);
    setRejects(0);
    setMortalityHens(0);
    setMortalityRoosters(0);
    setVitamins(s.startInputsFromZero ? '' : 'Electrolytes in morning water + Azolla forage');
    setLogNotes('');
    setIsLogModalOpen(true);
  };

  const handleResetLogFormToZero = () => {
    setFertileEggs(0);
    setTableEggs(0);
    setRejects(0);
    setMortalityHens(0);
    setMortalityRoosters(0);
    setVitamins('');
    setLogNotes('');
  };

  const handleCreatePen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penCode.trim()) return;

    pensTable.create({
      penCode: penCode.trim(),
      breed: penBreed,
      roostersCount: Math.max(0, Number(roostersCount)),
      hensCount: Math.max(0, Number(hensCount)),
      housingType,
      notes: penNotes.trim(),
    });

    setPens(pensTable.getAll());
    setIsPenModalOpen(false);
    setPenCode('');
    setPenNotes('');
    showToast(`Pen ${penCode} saved!`);
  };

  const handleDeletePen = (id: string, code: string) => {
    pensTable.delete(id);
    setPens(pensTable.getAll());
    showToast(`Pen ${code} deleted.`);
  };

  const handleZeroSinglePen = (pen: PenFlock) => {
    pensTable.update(pen.id, { hensCount: 0, roostersCount: 0 });
    setPens(pensTable.getAll());
    showToast(`${pen.penCode} bird counts reset to 0.`);
  };

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    const pen = pens.find((p) => p.id === selectedPenId) || pens[0];
    if (!pen) return;

    const totalEggs = Number(fertileEggs) + Number(tableEggs) + Number(rejects);
    const layingRate = calculateLayingRate(totalEggs, pen.hensCount);

    eggLogsTable.create({
      date: logDate,
      penId: pen.id,
      breed: pen.breed,
      fertileEggs: Number(fertileEggs),
      tableEggs: Number(tableEggs),
      rejects: Number(rejects),
      totalEggs,
      mortalityHens: Number(mortalityHens),
      mortalityRoosters: Number(mortalityRoosters),
      activeHensOnDate: pen.hensCount,
      layingRatePercent: layingRate,
      vitaminsAndSupplements: vitamins,
      notes: logNotes.trim(),
    });

    if (mortalityHens > 0 || mortalityRoosters > 0) {
      pensTable.update(pen.id, {
        hensCount: Math.max(0, pen.hensCount - mortalityHens),
        roostersCount: Math.max(0, pen.roostersCount - mortalityRoosters),
      });
      setPens(pensTable.getAll());
    }

    setLogs(eggLogsTable.getAll());
    setIsLogModalOpen(false);
    showToast(`Egg harvest recorded for ${pen.penCode}: ${totalEggs} eggs (${layingRate}% rate)`);
  };

  const handleDeleteLog = (id: string) => {
    eggLogsTable.delete(id);
    setLogs(eggLogsTable.getAll());
    showToast('Record deleted.');
  };

  const handleZeroAllFlockAndLogs = () => {
    resetModuleToZero('pens');
    resetModuleToZero('eggLogs');
    setPens(pensTable.getAll());
    setLogs(eggLogsTable.getAll());
    showToast('All pen bird counts and egg harvest logs reset to 0!');
  };

  const selectedPen = pens.find((p) => p.id === selectedPenId) || pens[0];
  const previewTotal = Number(fertileEggs) + Number(tableEggs) + Number(rejects);
  const previewRate = selectedPen ? calculateLayingRate(previewTotal, selectedPen.hensCount) : 0;

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const pen = pens.find((p) => p.id === log.penId);
    const penName = pen?.penCode || '';
    const matchesSearch =
      penName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.date.includes(searchTerm) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBreed = filterBreed === 'All' || log.breed === filterBreed;
    return matchesSearch && matchesBreed;
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Flock & Daily Egg Harvest Log
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Pen inventory, fertility ratio tracking, daily egg sorting, and mortality records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllFlockAndLogs}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
            title="Zero all bird counts and clear egg logs to start from 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Module to 0</span>
          </button>
          <button
            onClick={handleOpenPenModal}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Bird className="w-4 h-4 text-emerald-400" />
            <span>Add Pen</span>
          </button>
          <button
            onClick={handleOpenLogModal}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Daily Harvest</span>
          </button>
        </div>
      </div>

      {/* Pens Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pens.map((pen) => {
          const penLogs = logs.filter((l) => l.penId === pen.id);
          const latestLog = penLogs[0];
          const breedingRatio = pen.roostersCount > 0 ? (pen.hensCount / pen.roostersCount).toFixed(1) : '0';

          return (
            <div
              key={pen.id}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between hover:border-emerald-600/60 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm tracking-tight">{pen.penCode}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleZeroSinglePen(pen)}
                      className="text-zinc-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] font-semibold transition cursor-pointer"
                      title="Reset this pen's bird count to 0"
                    >
                      Zero
                    </button>
                    <button
                      onClick={() => handleDeletePen(pen.id, pen.penCode)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition cursor-pointer"
                      title="Delete pen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    pen.breed === 'Rhode Island Red'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}>
                    {pen.breed}
                  </span>
                  <span className="text-[11px] text-zinc-400">• {pen.housingType}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Hens</span>
                    <strong className="text-sm text-emerald-400">{pen.hensCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Roosters</span>
                    <strong className="text-sm text-amber-400">{pen.roostersCount}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Ratio</span>
                    <strong className="text-sm text-zinc-200">1:{breedingRatio}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400 text-[11px]">
                  Latest Harvest: {latestLog ? `${latestLog.totalEggs} eggs` : 'No logs yet'}
                </span>
                <span className="text-amber-400 font-bold">
                  {latestLog ? `${latestLog.layingRatePercent}% Laying` : '0%'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Egg Harvest Log Table Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by pen, date, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={filterBreed}
              onChange={(e) => setFilterBreed(e.target.value as any)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none"
            >
              <option value="All">All Breeds</option>
              <option value="Rhode Island Red">Rhode Island Red</option>
              <option value="Black Australorp">Black Australorp</option>
            </select>
          </div>

          <button
            onClick={() => exportTableToCsv('eggLogs', 'legal-chicks-daily-eggs')}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Pen & Breed</th>
                <th className="p-3 text-center">Fertile (Hatch)</th>
                <th className="p-3 text-center">Table Eggs</th>
                <th className="p-3 text-center">Rejects</th>
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center">Laying Rate</th>
                <th className="p-3">Vitamins / Notes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200 bg-zinc-900/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-zinc-500">
                    0 egg harvest records. Click "Log Daily Harvest" to start logging from 0.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const pen = pens.find((p) => p.id === log.penId);
                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/50 transition">
                      <td className="p-3 font-mono font-medium text-white">{log.date}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{pen?.penCode || log.penId}</div>
                        <span className="text-[10px] text-zinc-400">{log.breed}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-bold border border-amber-900/50">
                          {log.fertileEggs}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-900/50">
                          {log.tableEggs}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          log.rejects > 0 ? 'bg-red-950/80 text-red-300' : 'text-zinc-500'
                        }`}>
                          {log.rejects}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-white text-sm">
                        {log.totalEggs}
                      </td>
                      <td className="p-3 text-center font-bold text-amber-400">
                        {log.layingRatePercent}%
                      </td>
                      <td className="p-3 max-w-xs truncate text-[11px] text-zinc-300">
                        {log.vitaminsAndSupplements || log.notes || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Pen */}
      {isPenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bird className="w-5 h-5 text-emerald-400" />
                <span>Add New Breeding Pen / Flock</span>
              </h3>
              <button
                type="button"
                onClick={handleResetPenFormToZero}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>
            <form onSubmit={handleCreatePen} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Pen Name / Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pen RIR-4 (South Pasture)"
                  value={penCode}
                  onChange={(e) => setPenCode(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Breed</label>
                <select
                  value={penBreed}
                  onChange={(e) => setPenBreed(e.target.value as PoultryBreed)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="Rhode Island Red">Rhode Island Red</option>
                  <option value="Black Australorp">Black Australorp</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Active Hens Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hensCount}
                    onChange={(e) => setHensCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Roosters Count</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={roostersCount}
                    onChange={(e) => setRoostersCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Housing Type</label>
                <select
                  value={housingType}
                  onChange={(e) => setHousingType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="Free Range Pasture">Free Range Pasture</option>
                  <option value="Deep Litter">Deep Litter (Rice Hull / Shavings)</option>
                  <option value="Breeding Pen">Breeding Trio / Pedigree Pen</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Notes / Pedigree Details</label>
                <textarea
                  rows={2}
                  value={penNotes}
                  onChange={(e) => setPenNotes(e.target.value)}
                  placeholder="Parent stock lineage, vaccination history, etc."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPenModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Pen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Daily Harvest */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Egg className="w-5 h-5 text-amber-400" />
                <span>Log Daily Egg Harvest</span>
              </h3>
              <button
                type="button"
                onClick={handleResetLogFormToZero}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Inputs to 0</span>
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Harvest Date</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Breeding Pen</label>
                  <select
                    value={selectedPenId}
                    onChange={(e) => setSelectedPenId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    {pens.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.penCode} ({p.hensCount} hens)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Egg Quantities */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-900/60 text-center">
                  <label className="text-amber-400 font-bold block mb-1">🥚 FERTILE (HATCH)</label>
                  <input
                    type="number"
                    min="0"
                    value={fertileEggs}
                    onChange={(e) => setFertileEggs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-lg font-bold bg-zinc-900 border border-zinc-700 rounded py-1 text-white"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1">Clean, 50-65g</span>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-emerald-900/60 text-center">
                  <label className="text-emerald-400 font-bold block mb-1">🍳 TABLE EGGS</label>
                  <input
                    type="number"
                    min="0"
                    value={tableEggs}
                    onChange={(e) => setTableEggs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-lg font-bold bg-zinc-900 border border-zinc-700 rounded py-1 text-white"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1">Small/oversized</span>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-red-950 text-center">
                  <label className="text-red-400 font-bold block mb-1">⚠️ REJECTS</label>
                  <input
                    type="number"
                    min="0"
                    value={rejects}
                    onChange={(e) => setRejects(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-lg font-bold bg-zinc-900 border border-zinc-700 rounded py-1 text-white"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1">Cracked / soiled</span>
                </div>
              </div>

              {/* Mortality Counts */}
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Hen Mortality (if any)</label>
                  <input
                    type="number"
                    min="0"
                    value={mortalityHens}
                    onChange={(e) => setMortalityHens(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-center bg-zinc-900 border border-zinc-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Rooster Mortality</label>
                  <input
                    type="number"
                    min="0"
                    value={mortalityRoosters}
                    onChange={(e) => setMortalityRoosters(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-center bg-zinc-900 border border-zinc-700 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Vitamins & Supplements Administered</label>
                <input
                  type="text"
                  value={vitamins}
                  onChange={(e) => setVitamins(e.target.value)}
                  placeholder="e.g. B-Complex, fresh Azolla, Apple Cider Vinegar"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Observations / Pen Notes</label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Weather sunny, clean nest shavings"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              {/* Auto Calculated Live Preview */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Total Harvested</span>
                  <strong className="text-base text-white">{previewTotal} eggs</strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 block text-[11px]">Calculated Laying Rate</span>
                  <strong className="text-base text-amber-400">{previewRate}%</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
