import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Package,
  RotateCcw,
  FlaskConical,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  feedIngredientsTable,
  pelletLogsTable,
  getFarmSettings,
  resetModuleToZero,
  subscribeToStorage,
} from '../services/storage.ts';
import {
  calculatePelletBatchCost,
  getDefaultCrudeProteinPercent,
  formatPhp,
} from '../utils/poultryMath.ts';
import type { FeedIngredient, PelletBatchLog, PoultryBreed } from '../types/index.ts';

interface CustomIngredientRow {
  ingredientId: string;
  selected: boolean;
  kgUsed: number;
  cpPercent: number;
}

export const FeedMillView: React.FC = () => {
  const settings = getFarmSettings();
  const [ingredients, setIngredients] = useState<FeedIngredient[]>(feedIngredientsTable.getAll());
  const [pelletLogs, setPelletLogs] = useState<PelletBatchLog[]>(pelletLogsTable.getAll());

  // Restock modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState(ingredients[0]?.id || '');
  const [addKg, setAddKg] = useState<number>(settings.startInputsFromZero ? 0 : 100);
  const [newCostPhp, setNewCostPhp] = useState<number>(settings.startInputsFromZero ? 0 : 26);

  // New Ingredient modal state
  const [isNewIngOpen, setIsNewIngOpen] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState<'Grain' | 'By-Product' | 'Forage/Protein' | 'Mineral/Vitamin' | 'Binder'>('Grain');
  const [ingStockKg, setIngStockKg] = useState<number>(settings.startInputsFromZero ? 0 : 100);
  const [ingUnitCost, setIngUnitCost] = useState<number>(settings.startInputsFromZero ? 0 : 25);
  const [ingReorder, setIngReorder] = useState<number>(settings.lowStockThresholdKg || 30);
  const [ingCpPercent, setIngCpPercent] = useState<number>(settings.startInputsFromZero ? 0 : 12);

  // Pelletizer Batch Runner State
  const [isPelletRunnerOpen, setIsPelletRunnerOpen] = useState(false);
  const [customRows, setCustomRows] = useState<Record<string, CustomIngredientRow>>({});
  const [recipeName, setRecipeName] = useState('Solana Custom Layer & Breeder Pellets');
  const [targetBreed, setTargetBreed] = useState<PoultryBreed | 'All Flocks'>('All Flocks');
  const [operator, setOperator] = useState(settings.defaultOperator);
  const [batchNotes, setBatchNotes] = useState('Die size 3mm. Steam treated, cooled before bagging.');
  const [toast, setToast] = useState<string | null>(null);

  const buildInitialCustomRows = (ings: FeedIngredient[], startAtZero: boolean): Record<string, CustomIngredientRow> => {
    const map: Record<string, CustomIngredientRow> = {};
    ings.forEach((ing) => {
      const cp = ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category);
      const lower = ing.name.toLowerCase();
      let defaultKg = 0;
      if (!startAtZero) {
        if (lower.includes('corn')) defaultKg = 45;
        else if (lower.includes('bran') || lower.includes('darak')) defaultKg = 25;
        else if (lower.includes('copra')) defaultKg = 10;
        else if (lower.includes('azolla')) defaultKg = 10;
        else if (lower.includes('molasses')) defaultKg = 3;
        else if (lower.includes('premix')) defaultKg = 7;
      }
      map[ing.id] = {
        ingredientId: ing.id,
        selected: defaultKg > 0 || !startAtZero,
        kgUsed: defaultKg,
        cpPercent: cp,
      };
    });
    return map;
  };

  useEffect(() => {
    const syncData = () => {
      const latestIngs = feedIngredientsTable.getAll();
      setIngredients(latestIngs);
      setPelletLogs(pelletLogsTable.getAll());
      if (latestIngs.length > 0 && !latestIngs.some((i) => i.id === selectedIngId)) {
        setSelectedIngId(latestIngs[0].id);
      }
    };
    syncData();
    return subscribeToStorage(syncData);
  }, [selectedIngId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenRestock = () => {
    const s = getFarmSettings();
    const first = feedIngredientsTable.getAll()[0];
    setSelectedIngId(first?.id || '');
    setAddKg(s.startInputsFromZero ? 0 : 100);
    setNewCostPhp(s.startInputsFromZero ? 0 : first?.unitCostPhp || 26);
    setIsRestockOpen(true);
  };

  const handleOpenNewIng = () => {
    const s = getFarmSettings();
    setIngName('');
    setIngStockKg(s.startInputsFromZero ? 0 : 100);
    setIngUnitCost(s.startInputsFromZero ? 0 : 25);
    setIngReorder(s.lowStockThresholdKg || 30);
    setIngCpPercent(s.startInputsFromZero ? 0 : 14);
    setIsNewIngOpen(true);
  };

  const handleOpenPelletRunner = () => {
    const s = getFarmSettings();
    const currentIngs = feedIngredientsTable.getAll();
    setIngredients(currentIngs);
    setCustomRows(buildInitialCustomRows(currentIngs, s.startInputsFromZero));
    setOperator(s.defaultOperator);
    setIsPelletRunnerOpen(true);
  };

  // Apply a preset total weight across standard ingredients
  const applyPresetBatchWeight = (totalKg: number) => {
    const next: Record<string, CustomIngredientRow> = {};
    ingredients.forEach((ing) => {
      const cp = customRows[ing.id]?.cpPercent ?? ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category);
      if (totalKg === 0) {
        next[ing.id] = {
          ingredientId: ing.id,
          selected: false,
          kgUsed: 0,
          cpPercent: cp,
        };
        return;
      }
      const lower = ing.name.toLowerCase();
      let ratio = 0;
      if (lower.includes('corn')) ratio = 0.40;
      else if (lower.includes('bran') || lower.includes('darak')) ratio = 0.22;
      else if (lower.includes('copra')) ratio = 0.13;
      else if (lower.includes('azolla')) ratio = 0.12;
      else if (lower.includes('molasses')) ratio = 0.03;
      else if (lower.includes('premix')) ratio = 0.10;

      const kg = Math.round(totalKg * ratio * 100) / 100;
      next[ing.id] = {
        ingredientId: ing.id,
        selected: kg > 0,
        kgUsed: kg,
        cpPercent: cp,
      };
    });
    setCustomRows(next);
  };

  const handleToggleIngredientSelection = (ing: FeedIngredient) => {
    const existing = customRows[ing.id] || {
      ingredientId: ing.id,
      selected: false,
      kgUsed: 0,
      cpPercent: ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category),
    };
    const nextSelected = !existing.selected;
    setCustomRows({
      ...customRows,
      [ing.id]: {
        ...existing,
        selected: nextSelected,
        kgUsed: nextSelected && existing.kgUsed === 0 ? 10 : nextSelected ? existing.kgUsed : 0,
      },
    });
  };

  const handleChangeIngredientKg = (ing: FeedIngredient, rawVal: string) => {
    const parsed = Math.max(0, parseFloat(rawVal) || 0);
    const existing = customRows[ing.id] || {
      ingredientId: ing.id,
      selected: true,
      kgUsed: 0,
      cpPercent: ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category),
    };
    setCustomRows({
      ...customRows,
      [ing.id]: {
        ...existing,
        selected: parsed > 0 ? true : existing.selected,
        kgUsed: parsed,
      },
    });
  };

  const handleChangeIngredientCp = (ing: FeedIngredient, rawVal: string) => {
    const parsed = Math.min(100, Math.max(0, parseFloat(rawVal) || 0));
    const existing = customRows[ing.id] || {
      ingredientId: ing.id,
      selected: false,
      kgUsed: 0,
      cpPercent: parsed,
    };
    setCustomRows({
      ...customRows,
      [ing.id]: {
        ...existing,
        cpPercent: parsed,
      },
    });
  };

  const handleSelectAllIngredients = (selectAll: boolean) => {
    const next: Record<string, CustomIngredientRow> = {};
    ingredients.forEach((ing) => {
      const existing = customRows[ing.id];
      const cp = existing?.cpPercent ?? ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category);
      next[ing.id] = {
        ingredientId: ing.id,
        selected: selectAll,
        kgUsed: selectAll ? (existing?.kgUsed && existing.kgUsed > 0 ? existing.kgUsed : 10) : 0,
        cpPercent: cp,
      };
    });
    setCustomRows(next);
  };

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const ing = ingredients.find((i) => i.id === selectedIngId);
    if (!ing || addKg <= 0) return;

    const updatedStock = Math.round((ing.stockKg + Number(addKg)) * 100) / 100;
    feedIngredientsTable.update(ing.id, {
      stockKg: updatedStock,
      unitCostPhp: Number(newCostPhp) > 0 ? Number(newCostPhp) : ing.unitCostPhp,
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
      stockKg: Math.max(0, Number(ingStockKg)),
      unitCostPhp: Math.max(0, Number(ingUnitCost)),
      reorderLevelKg: Math.max(0, Number(ingReorder)),
      crudeProteinPercent: Math.min(100, Math.max(0, Number(ingCpPercent))),
    });

    setIngredients(feedIngredientsTable.getAll());
    setIsNewIngOpen(false);
    setIngName('');
    showToast(`Added ${ingName} (${ingCpPercent}% CP) to inventory.`);
  };

  const handleZeroSingleIngredient = (ing: FeedIngredient) => {
    feedIngredientsTable.update(ing.id, { stockKg: 0 });
    setIngredients(feedIngredientsTable.getAll());
    showToast(`${ing.name} stock reset to 0 kg.`);
  };

  const handleZeroAllFeedModule = () => {
    resetModuleToZero('feed');
    setIngredients(feedIngredientsTable.getAll());
    setPelletLogs(pelletLogsTable.getAll());
    showToast('All feed stock (0 kg) and pelletizer logs reset to 0!');
  };

  // Build breakdown of all ingredients and filter chosen ones for calculation
  const allRowsDetailed = ingredients.map((ing) => {
    const row = customRows[ing.id];
    const cp = row?.cpPercent ?? ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category);
    const isSelected = row ? row.selected : false;
    const kgUsed = isSelected ? Math.max(0, Number(row?.kgUsed || 0)) : 0;
    return {
      ingredientId: ing.id,
      name: ing.name,
      category: ing.category,
      selected: isSelected,
      kgUsed,
      unitCostPhp: ing.unitCostPhp,
      crudeProteinPercent: cp,
      stockAvailable: ing.stockKg,
    };
  });

  const chosenIngredients = allRowsDetailed.filter((item) => item.selected && item.kgUsed > 0);
  const calculatedBatch = calculatePelletBatchCost(chosenIngredients);
  const hasInsufficientStock = chosenIngredients.some((i) => i.kgUsed > i.stockAvailable);

  // Determine nutrition target classification based on calculated CP%
  const getCpClassification = (cp: number) => {
    if (cp <= 0) return { label: 'Add ingredients to calculate CP%', color: 'text-zinc-400 border-zinc-700 bg-zinc-900' };
    if (cp < 14.5) return { label: 'Maintenance / Scratch Ration (<14.5% CP)', color: 'text-amber-300 border-amber-700/60 bg-amber-950/50' };
    if (cp <= 18.5) return { label: 'Optimal Breeder / Layer Ration (14.5–18.5% CP)', color: 'text-emerald-300 border-emerald-600/60 bg-emerald-950/60' };
    return { label: 'High-Protein Booster / Grower Ration (>18.5% CP)', color: 'text-purple-300 border-purple-600/60 bg-purple-950/60' };
  };

  const cpBadge = getCpClassification(calculatedBatch.crudeProteinPercent);

  const handleRunPelletizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (chosenIngredients.length === 0 || calculatedBatch.totalKgProduced <= 0 || hasInsufficientStock) return;

    // Deduct stock ONLY from chosen ingredients according to their respective measurements
    for (const item of chosenIngredients) {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (ing) {
        feedIngredientsTable.update(ing.id, {
          stockKg: Math.round(Math.max(0, ing.stockKg - item.kgUsed) * 100) / 100,
          crudeProteinPercent: item.crudeProteinPercent,
        });
      }
    }

    const batchCode = `PLT-2026-0${pelletLogs.length + 25}`;
    const today = new Date().toISOString().split('T')[0];
    const finalRecipeTitle = recipeName.includes('CP')
      ? recipeName.trim()
      : `${recipeName.trim()} (${calculatedBatch.crudeProteinPercent}% CP)`;

    pelletLogsTable.create({
      batchNumber: batchCode,
      date: today,
      recipeName: finalRecipeTitle,
      targetBreed,
      totalKgProduced: calculatedBatch.totalKgProduced,
      costPerKgPhp: calculatedBatch.costPerKgPhp,
      totalBatchCostPhp: calculatedBatch.totalBatchCostPhp,
      crudeProteinPercent: calculatedBatch.crudeProteinPercent,
      ingredientsUsed: chosenIngredients.map((b) => ({
        ingredientId: b.ingredientId,
        ingredientName: b.name,
        kgUsed: b.kgUsed,
        costPhp: Math.round(b.kgUsed * b.unitCostPhp * 100) / 100,
        crudeProteinPercent: b.crudeProteinPercent,
      })),
      operator: operator.trim(),
      notes: batchNotes.trim(),
    });

    setIngredients(feedIngredientsTable.getAll());
    setPelletLogs(pelletLogsTable.getAll());
    setIsPelletRunnerOpen(false);
    showToast(
      `Batch ${batchCode} complete! ${calculatedBatch.totalKgProduced}kg @ ${calculatedBatch.crudeProteinPercent}% CP (${formatPhp(calculatedBatch.costPerKgPhp)}/kg).`
    );
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
            Raw materials stock in kg, custom ingredient formulation, Crude Protein (CP %) calculator & cost-per-kg
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllFeedModule}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zero Stock (0 kg)</span>
          </button>
          <button
            onClick={handleOpenNewIng}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Ingredient</span>
          </button>
          <button
            onClick={handleOpenRestock}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>Restock Stock</span>
          </button>
          <button
            onClick={handleOpenPelletRunner}
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
          const isLow = ing.stockKg <= Math.max(ing.reorderLevelKg, settings.lowStockThresholdKg);
          const cp = ing.crudeProteinPercent ?? getDefaultCrudeProteinPercent(ing.name, ing.category);
          return (
            <div
              key={ing.id}
              className={`p-4 rounded-xl bg-zinc-900 border transition ${
                isLow ? 'border-red-800/80 bg-red-950/15' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{ing.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-zinc-400">{ing.category}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                      {cp}% CP
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleZeroSingleIngredient(ing)}
                    className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 hover:text-amber-300 font-semibold transition cursor-pointer"
                    title="Set this ingredient's stock to 0 kg"
                  >
                    Zero
                  </button>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isLow
                      ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {isLow ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>
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
                <th className="p-3">Formula & Ingredients</th>
                <th className="p-3 text-center">Output</th>
                <th className="p-3 text-center">Crude Protein</th>
                <th className="p-3 text-center">Cost / kg (₱)</th>
                <th className="p-3 text-center">Batch Total (₱)</th>
                <th className="p-3">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200 bg-zinc-900/60">
              {pelletLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-zinc-500">
                    0 pelletizer batches logged. Click "Run Pelletizer Batch" above to formulate feed.
                  </td>
                </tr>
              ) : (
                pelletLogs.map((log) => {
                  const computedCp =
                    log.crudeProteinPercent ??
                    calculatePelletBatchCost(
                      log.ingredientsUsed.map((u) => ({
                        ingredientId: u.ingredientId,
                        name: u.ingredientName,
                        kgUsed: u.kgUsed,
                        unitCostPhp: u.kgUsed > 0 ? u.costPhp / u.kgUsed : 0,
                        crudeProteinPercent: u.crudeProteinPercent,
                      }))
                    ).crudeProteinPercent;

                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/50 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{log.batchNumber}</td>
                      <td className="p-3 font-mono text-zinc-300">{log.date}</td>
                      <td className="p-3">
                        <div className="font-medium text-white">{log.recipeName}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {log.ingredientsUsed.map((i) => `${i.ingredientName.split(' ')[0]}: ${i.kgUsed}kg`).join(' • ')}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-white text-sm">
                        {log.totalKgProduced} kg
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs">
                          {computedCp}% CP
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400 text-sm">
                        {formatPhp(log.costPerKgPhp)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-zinc-200">
                        {formatPhp(log.totalBatchCostPhp)}
                      </td>
                      <td className="p-3 text-zinc-300">{log.operator}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Ingredient */}
      {isNewIngOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Add Feed Raw Ingredient</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIngStockKg(0);
                  setIngUnitCost(0);
                  setIngReorder(0);
                  setIngCpPercent(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>

            <form onSubmit={handleCreateIngredient} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fish Meal (Peruvian) or Soybean Meal"
                  value={ingName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIngName(val);
                    if (val.trim().length > 2) {
                      setIngCpPercent(getDefaultCrudeProteinPercent(val, ingCategory));
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Category</label>
                  <select
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Grain">Grain</option>
                    <option value="By-Product">By-Product</option>
                    <option value="Forage/Protein">Forage/Protein</option>
                    <option value="Mineral/Vitamin">Mineral/Vitamin</option>
                    <option value="Binder">Binder</option>
                  </select>
                </div>
                <div>
                  <label className="text-amber-300 font-semibold block mb-1">Crude Protein (CP %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={ingCpPercent}
                    onChange={(e) => setIngCpPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-amber-500/40 rounded-lg text-amber-300 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Initial Stock (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={ingStockKg}
                    onChange={(e) => setIngStockKg(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Unit Cost (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={ingUnitCost}
                    onChange={(e) => setIngUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Reorder (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={ingReorder}
                    onChange={(e) => setIngReorder(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewIngOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restock Raw Ingredient */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>Restock Feed Ingredient</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddKg(0);
                  setNewCostPhp(0);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>

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
                    min="0"
                    required
                    value={addKg}
                    onChange={(e) => setAddKg(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Unit Cost (₱/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newCostPhp}
                    onChange={(e) => setNewCostPhp(Math.max(0, parseFloat(e.target.value) || 0))}
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
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow cursor-pointer"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Run Pelletizer Batch Tool (Custom Chosen Ingredients & Automatic Crude Protein Calculator) */}
      {isPelletRunnerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border-2 border-emerald-500/80 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[94vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2.5 border-b border-zinc-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  <span>Pelletizer Batch Formulation & Crude Protein Calculator</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Check only the ingredients you want to blend, enter their exact kg measurements, and automatically compute the formula's Crude Protein (CP %) and cost per kg.
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyPresetBatchWeight(0)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-amber-500/30 shrink-0 self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All to 0 kg</span>
              </button>
            </div>

            <form onSubmit={handleRunPelletizer} className="space-y-4 text-xs">
              {/* Row 1: Quick Scale Presets & Target Flock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">
                    Quick Preset Scale (or customize kg below)
                  </label>
                  <div className="flex gap-1.5">
                    {[0, 50, 100, 150].map((kg) => (
                      <button
                        key={kg}
                        type="button"
                        onClick={() => applyPresetBatchWeight(kg)}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer border ${
                          Math.round(calculatedBatch.totalKgProduced) === kg && kg > 0
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {kg === 0 ? 'Clear (0kg)' : `${kg}kg Mix`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Target Flock</label>
                  <select
                    value={targetBreed}
                    onChange={(e) => setTargetBreed(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="All Flocks">All Flocks (Layer & Breeder Ration)</option>
                    <option value="Rhode Island Red">Rhode Island Red Pens</option>
                    <option value="Black Australorp">Black Australorp Pens</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Custom Chosen Ingredients & Respective Measurements */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Choose Ingredients & Respective Measurements (kg)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Only checked ingredients with kg &gt; 0 will be deducted and included in the formula
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAllIngredients(true)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllIngredients(false)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] font-semibold cursor-pointer"
                    >
                      Unselect All
                    </button>
                  </div>
                </div>

                {ingredients.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500">
                    No raw ingredients in inventory. Add ingredients first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column Headers */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase text-zinc-400">
                      <div className="col-span-5">Ingredient (Stock & Cost)</div>
                      <div className="col-span-2 text-center">Ingredient CP %</div>
                      <div className="col-span-3 text-center">Measurement (kg)</div>
                      <div className="col-span-2 text-right">Share & Cost</div>
                    </div>

                    {allRowsDetailed.map((item) => {
                      const ing = ingredients.find((i) => i.id === item.ingredientId)!;
                      const isShort = item.selected && item.kgUsed > item.stockAvailable;
                      const weightSharePercent =
                        calculatedBatch.totalKgProduced > 0 && item.selected
                          ? Math.round((item.kgUsed / calculatedBatch.totalKgProduced) * 1000) / 10
                          : 0;

                      return (
                        <div
                          key={item.ingredientId}
                          className={`p-2.5 rounded-xl border transition grid grid-cols-1 sm:grid-cols-12 gap-2 items-center ${
                            item.selected
                              ? isShort
                                ? 'bg-red-950/25 border-red-700/80'
                                : 'bg-emerald-950/20 border-emerald-700/50'
                              : 'bg-zinc-900/40 border-zinc-800/70 opacity-60'
                          }`}
                        >
                          {/* Checkbox + Ingredient Name */}
                          <div className="sm:col-span-5 flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleIngredientSelection(ing)}
                              className="mt-0.5 text-emerald-400 hover:text-emerald-300 cursor-pointer shrink-0"
                              aria-label={`Toggle ${item.name}`}
                            >
                              {item.selected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-500" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div
                                onClick={() => handleToggleIngredientSelection(ing)}
                                className="font-bold text-white text-xs truncate cursor-pointer"
                              >
                                {item.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                Stock: <strong className={isShort ? 'text-red-400' : 'text-zinc-200'}>{item.stockAvailable}kg</strong> • {formatPhp(item.unitCostPhp)}/kg
                              </div>
                            </div>
                          </div>

                          {/* Editable CP % of this ingredient */}
                          <div className="sm:col-span-2 flex sm:block items-center justify-between gap-2">
                            <span className="sm:hidden text-[11px] text-zinc-400">CP %:</span>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.crudeProteinPercent}
                                onChange={(e) => handleChangeIngredientCp(ing, e.target.value)}
                                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-amber-300 font-mono font-bold text-xs"
                                title="Crude Protein % of this ingredient"
                              />
                              <span className="text-[10px] text-zinc-400 ml-1">%</span>
                            </div>
                          </div>

                          {/* Respective Measurement (kg) Input */}
                          <div className="sm:col-span-3 flex sm:block items-center justify-between gap-2">
                            <span className="sm:hidden text-[11px] text-zinc-400">Measurement (kg):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.selected ? item.kgUsed : 0}
                                onChange={(e) => handleChangeIngredientKg(ing, e.target.value)}
                                className={`w-full px-2.5 py-1 rounded-lg text-center font-mono font-extrabold text-xs border ${
                                  item.selected
                                    ? 'bg-zinc-900 border-emerald-500/60 text-white'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-[11px] text-zinc-400 font-semibold">kg</span>
                            </div>
                          </div>

                          {/* Share % & Subtotal Cost */}
                          <div className="sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between text-right">
                            <span className="text-[11px] font-mono text-emerald-300 font-semibold">
                              {weightSharePercent}% mix
                            </span>
                            <span className="text-[11px] font-mono text-amber-400">
                              {formatPhp(item.kgUsed * item.unitCostPhp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 3: Live Crude Protein (CP %) & Cost Result Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-amber-950/40 border border-emerald-600/60 rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase font-bold block">Chosen Output</span>
                    <strong className="text-base sm:text-lg text-white font-extrabold font-mono">
                      {calculatedBatch.totalKgProduced} kg
                    </strong>
                    <span className="text-[10px] text-zinc-400 block">
                      {chosenIngredients.length} ingredient(s) chosen
                    </span>
                  </div>

                  <div>
                    <span className="text-amber-300 text-[10px] uppercase font-bold flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" />
                      <span>Formula Crude Protein</span>
                    </span>
                    <strong className="text-lg sm:text-xl text-amber-400 font-extrabold font-mono">
                      {calculatedBatch.crudeProteinPercent}% CP
                    </strong>
                    <span className="text-[10px] text-zinc-300 block">
                      {calculatedBatch.totalCrudeProteinKg} kg pure protein
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 text-[10px] uppercase font-bold block">Total Batch Cost</span>
                    <strong className="text-base sm:text-lg text-white font-bold font-mono">
                      {formatPhp(calculatedBatch.totalBatchCostPhp)}
                    </strong>
                    <span className="text-[10px] text-zinc-400 block">Raw materials value</span>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold block">Cost Per Kilogram</span>
                    <strong className="text-base sm:text-lg text-emerald-400 font-extrabold font-mono">
                      {formatPhp(calculatedBatch.costPerKgPhp)} / kg
                    </strong>
                    <span className="text-[10px] text-emerald-300/80 block">Finished pellet cost</span>
                  </div>
                </div>

                {/* Nutritional Classification Bar */}
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 ${cpBadge.color}`}>
                    <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                    <span>{cpBadge.label}</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Formula: ∑(kg × CP%) ÷ {calculatedBatch.totalKgProduced || 0}kg
                  </span>
                </div>
              </div>

              {hasInsufficientStock && (
                <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cannot run batch: One or more chosen ingredients exceed available stock in kg.</span>
                </div>
              )}

              {/* Row 4: Recipe Name, Operator & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Formula / Recipe Name</label>
                  <input
                    type="text"
                    required
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
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

              {/* Row 5: Action Buttons (Focused Element area) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800 bg-zinc-950/70 p-3 rounded-xl">
                <div className="text-[11px] text-zinc-300">
                  Chosen: <strong className="text-white">{chosenIngredients.length} items</strong> •{' '}
                  <strong className="text-amber-400">{calculatedBatch.crudeProteinPercent}% CP</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPelletRunnerOpen(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl font-semibold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={hasInsufficientStock || calculatedBatch.totalKgProduced <= 0}
                    className={`px-5 py-2 font-extrabold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 ${
                      hasInsufficientStock || calculatedBatch.totalKgProduced <= 0
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 hover:from-amber-300 hover:to-emerald-400 text-zinc-950'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span>
                      Run Chosen Batch ({calculatedBatch.totalKgProduced} kg • {calculatedBatch.crudeProteinPercent}% CP)
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
