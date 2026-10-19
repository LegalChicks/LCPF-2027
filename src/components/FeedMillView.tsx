import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  feedIngredientsTable,
  pelletLogsTable,
} from '../services/storage.ts';
import {
  calculatePelletBatchCost,
  formatPhp,
} from '../utils/poultryMath.ts';
import type { FeedIngredient, PelletBatchLog, PoultryBreed } from '../types/index.ts';

export const FeedMillView: React.FC = () => {
  const [ingredients, setIngredients] = useState<FeedIngredient[]>(feedIngredientsTable.getAll());
  const [pelletLogs, setPelletLogs] = useState<PelletBatchLog[]>(pelletLogsTable.getAll());
  
  // Restock modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState(ingredients[0]?.id || '');
  const [addKg, setAddKg] = useState<number>(100);
  const [newCostPhp, setNewCostPhp] = useState<number>(26);

  // New Ingredient modal state
  const [isNewIngOpen, setIsNewIngOpen] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState<'Grain' | 'By-Product' | 'Forage/Protein' | 'Mineral/Vitamin' | 'Binder'>('Grain');
  const [ingStockKg, setIngStockKg] = useState<number>(100);
  const [ingUnitCost, setIngUnitCost] = useState<number>(25);
  const [ingReorder, setIngReorder] = useState<number>(30);

  // Pelletizer Batch Runner State
  const [isPelletRunnerOpen, setIsPelletRunnerOpen] = useState(false);
  const [batchTargetKg, setBatchTargetKg] = useState<number>(100);
  const [recipeName, setRecipeName] = useState('Solana High-Yield Layer Pellets (17.5% CP)');
  const [targetBreed, setTargetBreed] = useState<PoultryBreed | 'All Flocks'>('All Flocks');
  const [operator, setOperator] = useState('Mang Edmar (Farm Lead)');
  const [batchNotes, setBatchNotes] = useState('Die size 3mm. Steam treated, cooled before bagging.');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const ing = ingredients.find((i) => i.id === selectedIngId);
    if (!ing) return;

    const updatedStock = ing.stockKg + Number(addKg);
    feedIngredientsTable.update(ing.id, {
      stockKg: updatedStock,
      unitCostPhp: Number(newCostPhp),
    });

    setIngredients(feedIngredientsTable.getAll());
    setIsRestockOpen(false);
    showToast(`Restocked ${ing.name} (+${addKg}kg). New stock: ${updatedStock}kg.`);
  };

  const handleCreateIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;

    feedIngredientsTable.create({
      name: ingName.trim(),
      category: ingCategory,
      stockKg: Number(ingStockKg),
      unitCostPhp: Number(ingUnitCost),
      reorderLevelKg: Number(ingReorder),
    });

    setIngredients(feedIngredientsTable.getAll());
    setIsNewIngOpen(false);
    setIngName('');
    showToast(`Added ${ingName} to inventory.`);
  };

  // Preset Recipe Proportions:
  // Yellow Corn: 45%, D1 Darak: 30%, Azolla: 10%, Molasses: 5%, Premix: 10%
  const corn = ingredients.find((i) => i.name.toLowerCase().includes('corn'));
  const darak = ingredients.find((i) => i.name.toLowerCase().includes('bran') || i.name.toLowerCase().includes('darak'));
  const azolla = ingredients.find((i) => i.name.toLowerCase().includes('azolla'));
  const molasses = ingredients.find((i) => i.name.toLowerCase().includes('molasses'));
  const premix = ingredients.find((i) => i.name.toLowerCase().includes('premix'));

  const currentBatchBreakdown = [
    {
      ingredientId: corn?.id || 'none',
      name: corn?.name || 'Yellow Corn',
      kgUsed: batchTargetKg * 0.45,
      unitCostPhp: corn?.unitCostPhp || 26,
      stockAvailable: corn?.stockKg || 0,
    },
    {
      ingredientId: darak?.id || 'none',
      name: darak?.name || 'Rice Bran (D1)',
      kgUsed: batchTargetKg * 0.30,
      unitCostPhp: darak?.unitCostPhp || 16.5,
      stockAvailable: darak?.stockKg || 0,
    },
    {
      ingredientId: azolla?.id || 'none',
      name: azolla?.name || 'Azolla Sun-Dried',
      kgUsed: batchTargetKg * 0.10,
      unitCostPhp: azolla?.unitCostPhp || 12,
      stockAvailable: azolla?.stockKg || 0,
    },
    {
      ingredientId: molasses?.id || 'none',
      name: molasses?.name || 'Molasses Binder',
      kgUsed: batchTargetKg * 0.05,
      unitCostPhp: molasses?.unitCostPhp || 35,
      stockAvailable: molasses?.stockKg || 0,
    },
    {
      ingredientId: premix?.id || 'none',
      name: premix?.name || 'Breeder Premix',
      kgUsed: batchTargetKg * 0.10,
      unitCostPhp: premix?.unitCostPhp || 145,
      stockAvailable: premix?.stockKg || 0,
    },
  ];

  const calculatedBatch = calculatePelletBatchCost(currentBatchBreakdown);
  const hasInsufficientStock = currentBatchBreakdown.some((i) => i.kgUsed > i.stockAvailable);

  const handleRunPelletizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInsufficientStock) {
      alert('Cannot run batch: Insufficient ingredient stock for the selected batch size.');
      return;
    }

    // Deduct stock from each ingredient
    for (const item of currentBatchBreakdown) {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (ing) {
        feedIngredientsTable.update(ing.id, {
          stockKg: Math.max(0, ing.stockKg - item.kgUsed),
        });
      }
    }

    const batchCode = `PLT-2026-0${pelletLogs.length + 25}`;
    const today = new Date().toISOString().split('T')[0];

    pelletLogsTable.create({
      batchNumber: batchCode,
      date: today,
      recipeName,
      targetBreed,
      totalKgProduced: calculatedBatch.totalKgProduced,
      costPerKgPhp: calculatedBatch.costPerKgPhp,
      totalBatchCostPhp: calculatedBatch.totalBatchCostPhp,
      ingredientsUsed: currentBatchBreakdown.map((b) => ({
        ingredientId: b.ingredientId,
        ingredientName: b.name,
        kgUsed: b.kgUsed,
        costPhp: b.kgUsed * b.unitCostPhp,
      })),
      operator: operator.trim(),
      notes: batchNotes.trim(),
    });

    setIngredients(feedIngredientsTable.getAll());
    setPelletLogs(pelletLogsTable.getAll());
    setIsPelletRunnerOpen(false);
    showToast(`Pelletizer Batch ${batchCode} completed! Produced ${batchTargetKg}kg at ${formatPhp(calculatedBatch.costPerKgPhp)}/kg.`);
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

      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Feed Mill & Pelletizer Inventory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Raw materials stock in kg, on-farm pellet blending, and real-time cost-per-kg calculation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRestockOpen(true)}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>Restock Stock</span>
          </button>
          <button
            onClick={() => setIsPelletRunnerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
            <span>Run Pelletizer Batch</span>
          </button>
        </div>
      </div>

      {/* Raw Ingredients Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ingredients.map((ing) => {
          const isLow = ing.stockKg <= ing.reorderLevelKg;
          return (
            <div
              key={ing.id}
              className={`p-4 rounded-xl bg-zinc-900 border transition ${
                isLow ? 'border-red-800/80 bg-red-950/15' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{ing.name}</h3>
                  <span className="text-[11px] text-zinc-400">{ing.category}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isLow
                    ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {isLow ? 'Low Stock' : 'In Stock'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Available</span>
                  <strong className="text-lg text-white font-bold">{ing.stockKg} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Unit Cost (₱/kg)</span>
                  <strong className="text-lg text-amber-400 font-bold">{formatPhp(ing.unitCostPhp)}</strong>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Reorder threshold: {ing.reorderLevelKg} kg</span>
                <span className="font-mono text-zinc-300">
                  Total Value: {formatPhp(ing.stockKg * ing.unitCostPhp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pelletizer Batch Runs History Table */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Recent Pelletizer Production Runs</h2>
          </div>
          <span className="text-xs text-zinc-400">{pelletLogs.length} batches logged</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Batch #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Recipe</th>
                <th className="p-3 text-center">Output</th>
                <th className="p-3 text-center">Cost / kg (₱)</th>
                <th className="p-3 text-center">Batch Total (₱)</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200 bg-zinc-900/60">
              {pelletLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/50 transition">
                  <td className="p-3 font-mono font-bold text-amber-400">{log.batchNumber}</td>
                  <td className="p-3 font-mono text-zinc-300">{log.date}</td>
                  <td className="p-3 font-medium text-white">{log.recipeName}</td>
                  <td className="p-3 text-center font-bold text-white text-sm">
                    {log.totalKgProduced} kg
                  </td>
                  <td className="p-3 text-center font-bold text-emerald-400 text-sm">
                    {formatPhp(log.costPerKgPhp)}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-zinc-200">
                    {formatPhp(log.totalBatchCostPhp)}
                  </td>
                  <td className="p-3 text-zinc-300">{log.operator}</td>
                  <td className="p-3 text-[11px] text-zinc-400 max-w-xs truncate">{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Restock Raw Ingredient */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <span>Restock Feed Ingredient</span>
            </h3>

            <form onSubmit={handleRestock} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Select Ingredient</label>
                <select
                  value={selectedIngId}
                  onChange={(e) => setSelectedIngId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Current: {ing.stockKg}kg @ {formatPhp(ing.unitCostPhp)}/kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Additional kg</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addKg}
                    onChange={(e) => setAddKg(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Unit Cost (₱/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={newCostPhp}
                    onChange={(e) => setNewCostPhp(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-zinc-400">Restock Purchase Total:</span>
                <strong className="text-amber-400 font-mono text-sm">{formatPhp(addKg * newCostPhp)}</strong>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Run Pelletizer Batch Tool */}
      {isPelletRunnerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-zinc-900 border border-emerald-600/70 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span>Pelletizer Batch Formulation & Runner</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Select output kg, verify raw material deductions, and compute precise cost-per-kg
            </p>

            <form onSubmit={handleRunPelletizer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Target Batch Size (kg)</label>
                  <div className="flex gap-1.5">
                    {[50, 100, 150, 200].map((kg) => (
                      <button
                        key={kg}
                        type="button"
                        onClick={() => setBatchTargetKg(kg)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                          batchTargetKg === kg
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {kg}kg
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Target Flock</label>
                  <select
                    value={targetBreed}
                    onChange={(e) => setTargetBreed(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="All Flocks">All Flocks (Standard 17.5% CP)</option>
                    <option value="Rhode Island Red">Rhode Island Red Pens</option>
                    <option value="Black Australorp">Black Australorp Pens</option>
                  </select>
                </div>
              </div>

              {/* Ingredients Deduction Breakdown */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <span className="font-bold text-white text-xs block">
                  Ingredient Deduction Formula ({batchTargetKg} kg Total)
                </span>
                <div className="space-y-1.5 divide-y divide-zinc-900">
                  {currentBatchBreakdown.map((item, idx) => {
                    const isShort = item.kgUsed > item.stockAvailable;
                    return (
                      <div key={idx} className="pt-1.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-zinc-200">{item.name}</span>
                          <span className="text-[11px] text-zinc-500 ml-1.5 font-mono">
                            ({item.stockAvailable}kg available)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold ${isShort ? 'text-red-400' : 'text-zinc-300'}`}>
                            {item.kgUsed} kg
                          </span>
                          <span className="text-amber-400/90 font-mono text-[11px]">
                            {formatPhp(item.kgUsed * item.unitCostPhp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cost per kg result box */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 text-[11px] block">Total Batch Cost</span>
                  <strong className="text-base text-white">{formatPhp(calculatedBatch.totalBatchCostPhp)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[11px] block">Cost Per Kilogram</span>
                  <strong className="text-lg text-emerald-400 font-extrabold">
                    {formatPhp(calculatedBatch.costPerKgPhp)} / kg
                  </strong>
                </div>
              </div>

              {hasInsufficientStock && (
                <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cannot run batch: One or more ingredients do not have sufficient stock.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Operator</label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Die Size & Notes</label>
                  <input
                    type="text"
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPelletRunnerOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasInsufficientStock}
                  className={`px-4 py-2 font-bold rounded-lg shadow transition cursor-pointer ${
                    hasInsufficientStock
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  Run Batch ({batchTargetKg} kg)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
