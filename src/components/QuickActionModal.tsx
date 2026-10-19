import React, { useState, useEffect } from 'react';
import {
  X,
  Egg,
  ShoppingBag,
  Cpu,
  Zap,
  RotateCcw,
} from 'lucide-react';
import {
  pensTable,
  eggLogsTable,
  ordersTable,
  pelletLogsTable,
  feedIngredientsTable,
  getFarmSettings,
} from '../services/storage.ts';
import {
  calculateLayingRate,
  calculateBulkEggPrice,
  calculatePelletBatchCost,
  formatPhp,
} from '../utils/poultryMath.ts';
import type { PoultryBreed } from '../types/index.ts';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const settings = getFarmSettings();
  const [mode, setMode] = useState<'egg' | 'order' | 'feed'>('egg');
  const pens = pensTable.getAll();

  // Egg form state (starts from 0 when startInputsFromZero is enabled)
  const [selectedPenId, setSelectedPenId] = useState(pens[0]?.id || '');
  const [fertileCount, setFertileCount] = useState<number>(settings.startInputsFromZero ? 0 : 30);
  const [tableCount, setTableCount] = useState<number>(settings.startInputsFromZero ? 0 : 5);
  const [rejectsCount, setRejectsCount] = useState<number>(0);
  const [supplements, setSupplements] = useState('');

  // Mortality state
  const [mortalityHens, setMortalityHens] = useState<number>(0);
  const [mortalityRoosters, setMortalityRoosters] = useState<number>(0);

  // Order state
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState(settings.location.split(',')[0] || 'Centro Solana, Cagayan');
  const [orderBreed, setOrderBreed] = useState<PoultryBreed>('Rhode Island Red');
  const [orderQuantity, setOrderQuantity] = useState<number>(settings.startInputsFromZero ? 0 : 60);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Cash on Pickup'>('GCash');

  // Feed quick run state
  const [feedBatchKg, setFeedBatchKg] = useState<number>(settings.startInputsFromZero ? 0 : 50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const s = getFarmSettings();
      const currentPens = pensTable.getAll();
      setSelectedPenId(currentPens[0]?.id || '');
      if (s.startInputsFromZero) {
        setFertileCount(0);
        setTableCount(0);
        setRejectsCount(0);
        setMortalityHens(0);
        setMortalityRoosters(0);
        setOrderQuantity(0);
        setFeedBatchKg(0);
      }
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPen = pens.find((p) => p.id === selectedPenId) || pens[0];

  const handleResetInputsToZero = () => {
    setFertileCount(0);
    setTableCount(0);
    setRejectsCount(0);
    setMortalityHens(0);
    setMortalityRoosters(0);
    setSupplements('');
    setCustomerName('');
    setContactNumber('');
    setOrderQuantity(0);
    setFeedBatchKg(0);
    setErrorMsg(null);
  };

  const handleEggSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPen) {
      setErrorMsg('Please add a breeding pen first in Flock & Eggs.');
      return;
    }

    const totalEggs = Number(fertileCount) + Number(tableCount) + Number(rejectsCount);
    const layingRate = calculateLayingRate(totalEggs, currentPen.hensCount);
    const today = new Date().toISOString().split('T')[0];

    eggLogsTable.create({
      date: today,
      penId: currentPen.id,
      breed: currentPen.breed,
      fertileEggs: Number(fertileCount),
      tableEggs: Number(tableCount),
      rejects: Number(rejectsCount),
      totalEggs,
      mortalityHens: Number(mortalityHens),
      mortalityRoosters: Number(mortalityRoosters),
      activeHensOnDate: currentPen.hensCount,
      layingRatePercent: layingRate,
      vitaminsAndSupplements: supplements,
      notes: `Quick log recorded inside coop. ${totalEggs} eggs collected.`,
    });

    if (mortalityHens > 0 || mortalityRoosters > 0) {
      pensTable.update(currentPen.id, {
        hensCount: Math.max(0, currentPen.hensCount - mortalityHens),
        roostersCount: Math.max(0, currentPen.roostersCount - mortalityRoosters),
      });
    }

    onSuccess(`Harvest logged! ${totalEggs} eggs from ${currentPen.penCode} (${layingRate}% Laying Rate)`);
    onClose();
  };

  const customBasePrice =
    orderBreed === 'Black Australorp' ? settings.defaultAustralorpEggPrice : settings.defaultRirEggPrice;
  const pricingPreview = calculateBulkEggPrice(orderBreed, orderQuantity, customBasePrice, {
    tier30: settings.bulkDiscountTier30,
    tier60: settings.bulkDiscountTier60,
    tier100: settings.bulkDiscountTier100,
  });
  const boxFee =
    orderQuantity >= 60
      ? settings.packagingFeeLarge
      : orderQuantity >= 30
      ? settings.packagingFeeMedium
      : orderQuantity > 0
      ? settings.packagingFeeSmall
      : 0;

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactNumber.trim() || orderQuantity <= 0) {
      setErrorMsg('Please enter customer name, contact number, and a quantity greater than 0.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const orderNum = `LC-ORD-2026-${Math.floor(100 + Math.random() * 900)}`;

    ordersTable.create({
      orderNumber: orderNum,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      location: location.trim(),
      breed: orderBreed,
      itemType: 'Fertile Hatching Eggs',
      quantity: orderQuantity,
      unitBasePricePhp: pricingPreview.unitBasePricePhp,
      bulkDiscountPercent: pricingPreview.bulkDiscountPercent,
      discountAmountPhp: pricingPreview.discountAmountPhp,
      packagingFeePhp: boxFee,
      totalAmountPhp: pricingPreview.totalAmountPhp + boxFee,
      paymentMethod,
      status: 'Reserved',
      dateReserved: today,
      targetDispatchDate: today,
      notes: 'Quick order created from mobile action.',
    });

    onSuccess(`Order ${orderNum} created for ${customerName} (${formatPhp(pricingPreview.totalAmountPhp + boxFee)})`);
    onClose();
  };

  const handleFeedRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedBatchKg <= 0) {
      setErrorMsg('Please enter or select a batch size greater than 0 kg.');
      return;
    }
    const ingredients = feedIngredientsTable.getAll();
    const corn = ingredients.find((i) => i.name.toLowerCase().includes('corn'));
    const darak = ingredients.find((i) => i.name.toLowerCase().includes('bran') || i.name.toLowerCase().includes('darak'));
    const azolla = ingredients.find((i) => i.name.toLowerCase().includes('azolla'));
    const molasses = ingredients.find((i) => i.name.toLowerCase().includes('molasses'));
    const premix = ingredients.find((i) => i.name.toLowerCase().includes('premix'));

    if (!corn || !darak || !premix) {
      setErrorMsg('Missing core feed ingredients in inventory.');
      return;
    }

    const batchList = [
      { ingredientId: corn.id, name: corn.name, kgUsed: feedBatchKg * 0.45, unitCostPhp: corn.unitCostPhp },
      { ingredientId: darak.id, name: darak.name, kgUsed: feedBatchKg * 0.30, unitCostPhp: darak.unitCostPhp },
      { ingredientId: azolla?.id || 'none', name: azolla?.name || 'Azolla', kgUsed: feedBatchKg * 0.10, unitCostPhp: azolla?.unitCostPhp || 12 },
      { ingredientId: molasses?.id || 'none', name: molasses?.name || 'Molasses', kgUsed: feedBatchKg * 0.05, unitCostPhp: molasses?.unitCostPhp || 35 },
      { ingredientId: premix.id, name: premix.name, kgUsed: feedBatchKg * 0.10, unitCostPhp: premix.unitCostPhp },
    ];

    const costResult = calculatePelletBatchCost(batchList);

    for (const item of batchList) {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      if (ing) {
        feedIngredientsTable.update(ing.id, {
          stockKg: Math.max(0, ing.stockKg - item.kgUsed),
        });
      }
    }

    const batchCode = `PLT-2026-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    pelletLogsTable.create({
      batchNumber: batchCode,
      date: today,
      recipeName: 'Solana High-Yield Layer Pellets (17.5% CP)',
      targetBreed: 'Rhode Island Red',
      totalKgProduced: costResult.totalKgProduced,
      costPerKgPhp: costResult.costPerKgPhp,
      totalBatchCostPhp: costResult.totalBatchCostPhp,
      ingredientsUsed: batchList.map((b) => ({
        ingredientId: b.ingredientId,
        ingredientName: b.name,
        kgUsed: b.kgUsed,
        costPhp: b.kgUsed * b.unitCostPhp,
      })),
      operator: settings.defaultOperator || 'Farm Lead (Quick Run)',
      notes: `Batch processed via mobile quick-action. Production cost ${formatPhp(costResult.costPerKgPhp)}/kg.`,
    });

    onSuccess(`Pelletizer batch ${batchCode} complete: ${feedBatchKg}kg produced at ${formatPhp(costResult.costPerKgPhp)}/kg!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-emerald-700/60 rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-emerald-950 border-b border-emerald-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Quick Coop Action</h3>
              <p className="text-xs text-emerald-300">One-handed fast logging • Starts at 0</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetInputsToZero}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold flex items-center gap-1 border border-amber-500/40 transition cursor-pointer"
              title="Reset all inputs in this form to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to 0</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 bg-zinc-950 p-2 gap-1 border-b border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => { setMode('egg'); setErrorMsg(null); }}
            className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
              mode === 'egg'
                ? 'bg-emerald-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Egg className="w-4 h-4 text-amber-400" />
            <span>Egg Harvest</span>
          </button>

          <button
            onClick={() => { setMode('order'); setErrorMsg(null); }}
            className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
              mode === 'order'
                ? 'bg-emerald-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Quick Order</span>
          </button>

          <button
            onClick={() => { setMode('feed'); setErrorMsg(null); }}
            className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition cursor-pointer ${
              mode === 'feed'
                ? 'bg-emerald-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-300" />
            <span>Pellet Run</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/90 border border-red-700 text-red-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {mode === 'egg' && (
            <form onSubmit={handleEggSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Select Breeding Pen
                </label>
                <select
                  value={selectedPenId}
                  onChange={(e) => setSelectedPenId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {pens.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.penCode} ({p.breed} • {p.hensCount} hens)
                    </option>
                  ))}
                </select>
              </div>

              {/* Egg Counts Steppers */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-900/60">
                  <label className="text-[11px] font-bold text-amber-400 block mb-1">
                    🥚 FERTILE EGGS
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fertileCount}
                    onChange={(e) => setFertileCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-bold bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 text-white"
                  />
                  <div className="flex justify-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFertileCount(0)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] font-bold"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setFertileCount((c) => Math.max(0, c - 5))}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setFertileCount((c) => c + 5)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      +5
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-emerald-900/60">
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1">
                    🍳 TABLE EGGS
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tableCount}
                    onChange={(e) => setTableCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-bold bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 text-white"
                  />
                  <div className="flex justify-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTableCount(0)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] font-bold"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableCount((c) => Math.max(0, c - 1))}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableCount((c) => c + 1)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      +1
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950 border border-red-950">
                  <label className="text-[11px] font-bold text-red-400 block mb-1">
                    ⚠️ REJECTS/CRACK
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rejectsCount}
                    onChange={(e) => setRejectsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-bold bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 text-white"
                  />
                  <div className="flex justify-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setRejectsCount(0)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded text-[11px] font-bold"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectsCount((c) => Math.max(0, c - 1))}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectsCount((c) => c + 1)}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>

              {/* Mortality optional */}
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Hen Mortality (if any)</label>
                  <input
                    type="number"
                    min="0"
                    value={mortalityHens}
                    onChange={(e) => setMortalityHens(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-center bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Rooster Mortality</label>
                  <input
                    type="number"
                    min="0"
                    value={mortalityRoosters}
                    onChange={(e) => setMortalityRoosters(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-center bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
                  />
                </div>
              </div>

              {/* Supplements note */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Vitamins & Coop Notes
                </label>
                <input
                  type="text"
                  value={supplements}
                  onChange={(e) => setSupplements(e.target.value)}
                  placeholder="e.g. B-Complex, fresh water troughs cleaned"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                />
              </div>

              {/* Computed Laying Rate Preview */}
              {currentPen && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-300">
                    Total: <strong>{Number(fertileCount) + Number(tableCount) + Number(rejectsCount)} eggs</strong>
                  </span>
                  <span className="font-bold text-amber-400 text-sm">
                    {calculateLayingRate(
                      Number(fertileCount) + Number(tableCount) + Number(rejectsCount),
                      currentPen.hensCount
                    )}% Laying Rate
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-lg active:scale-98"
              >
                Save Daily Harvest Record
              </button>
            </form>
          )}

          {mode === 'order' && (
            <form onSubmit={handleOrderSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kapitan Juan"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Contact Number</label>
                  <input
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="0917-xxx-xxxx"
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Location / Barangay</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Centro Solana / Tuguegarao City"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Breed</label>
                  <select
                    value={orderBreed}
                    onChange={(e) => setOrderBreed(e.target.value as PoultryBreed)}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white"
                  >
                    <option value="Rhode Island Red">Rhode Island Red ({formatPhp(settings.defaultRirEggPrice)})</option>
                    <option value="Black Australorp">Black Australorp ({formatPhp(settings.defaultAustralorpEggPrice)})</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Quantity (pcs)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setOrderQuantity(0)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded-lg text-xs font-bold"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Tier Preview */}
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl space-y-1 text-xs text-amber-200">
                <div className="flex justify-between">
                  <span>Tier:</span>
                  <span className="font-semibold">{pricingPreview.tierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPhp(pricingPreview.subtotalPhp)}</span>
                </div>
                {pricingPreview.bulkDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Bulk Discount ({pricingPreview.bulkDiscountPercent}%):</span>
                    <span>-{formatPhp(pricingPreview.discountAmountPhp)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-amber-900/40 font-bold text-sm text-white">
                  <span>Estimated Total:</span>
                  <span className="text-amber-400">{formatPhp(pricingPreview.totalAmountPhp + boxFee)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition cursor-pointer shadow-lg active:scale-98"
              >
                Create Order & Generate Messenger Receipt
              </button>
            </form>
          )}

          {mode === 'feed' && (
            <form onSubmit={handleFeedRunSubmit} className="space-y-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-white text-sm">Preset: High-Yield Layer Pellets (17.5% CP)</h4>
                <p className="text-zinc-400">
                  Calculated recipe using Yellow Corn (45%), D1 Darak (30%), Sun-Dried Azolla (10%), Molasses (5%), and Breeder Premix (10%).
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Batch Target Output (kg)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    value={feedBatchKg}
                    onChange={(e) => setFeedBatchKg(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-32 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white font-bold"
                  />
                  {[0, 25, 50, 100, 200].map((kg) => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => setFeedBatchKg(kg)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                        feedBatchKg === kg
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {kg} kg
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1 text-xs text-emerald-200">
                <div className="flex justify-between">
                  <span>Corn required:</span>
                  <span>{Math.round(feedBatchKg * 0.45 * 100) / 100} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>D1 Darak required:</span>
                  <span>{Math.round(feedBatchKg * 0.30 * 100) / 100} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Azolla required:</span>
                  <span>{Math.round(feedBatchKg * 0.10 * 100) / 100} kg</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-lg active:scale-98"
              >
                Execute Pelletizer Run ({feedBatchKg} kg)
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
