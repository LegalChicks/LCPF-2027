import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLayingRate,
  calculateIncubationMilestones,
  getIncubationCurrentState,
  calculateFertilityAndHatchability,
  calculateBulkEggPrice,
  calculatePelletBatchCost,
  formatPhp,
  generateMessengerReceipt,
} from './poultryMath.ts';

test('calculateLayingRate computes correct percentage', () => {
  // 150 eggs collected from 200 hens = 75%
  assert.equal(calculateLayingRate(150, 200), 75);
  // Zero hens or zero eggs
  assert.equal(calculateLayingRate(0, 200), 0);
  assert.equal(calculateLayingRate(100, 0), 0);
  // Rounding check
  assert.equal(calculateLayingRate(185, 230), 80.4);
});

test('calculateIncubationMilestones generates accurate 7, 14, 18, and 21 day dates', () => {
  const milestones = calculateIncubationMilestones('2026-10-01');
  assert.equal(milestones.day7CandlingDate, '2026-10-08');
  assert.equal(milestones.day14CandlingDate, '2026-10-15');
  assert.equal(milestones.day18LockdownDate, '2026-10-19');
  assert.equal(milestones.day21HatchDate, '2026-10-22');
});

test('getIncubationCurrentState detects lockdown and hatching phases', () => {
  const day1 = getIncubationCurrentState('2026-10-01', '2026-10-01');
  assert.equal(day1.currentDay, 1);
  assert.equal(day1.isLockdown, false);

  const day18 = getIncubationCurrentState('2026-10-01', '2026-10-18');
  assert.equal(day18.currentDay, 18);
  assert.equal(day18.isLockdown, true);

  const day21 = getIncubationCurrentState('2026-10-01', '2026-10-21');
  assert.equal(day21.currentDay, 21);
  assert.equal(day21.isLockdown, true);
  assert.equal(day21.isHatched, true);
});

test('calculateFertilityAndHatchability computes rates correctly', () => {
  // 100 eggs set, 10 clears on Day 7, 5 dead in shell Day 14, 75 chicks hatched
  const stats = calculateFertilityAndHatchability(100, 10, 5, 75);
  assert.equal(stats.fertileEggs, 90);
  assert.equal(stats.fertilityPercent, 90);
  // Hatchability of fertile: (75 / 90) * 100 = 83.3%
  assert.equal(stats.hatchabilityPercent, 83.3);
  // Hatchability of total set: (75 / 100) * 100 = 75%
  assert.equal(stats.totalHatchabilityPercent, 75);
});

test('calculateBulkEggPrice applies tiered discounts', () => {
  // Rhode Island Red at ₱45
  // 10 eggs: 0% discount
  const retail = calculateBulkEggPrice('Rhode Island Red', 10, 45);
  assert.equal(retail.subtotalPhp, 450);
  assert.equal(retail.bulkDiscountPercent, 0);
  assert.equal(retail.discountAmountPhp, 0);
  assert.equal(retail.totalAmountPhp, 450);

  // 35 eggs: 5% discount (Starter Tier 30-59)
  const tier30 = calculateBulkEggPrice('Rhode Island Red', 35, 45);
  assert.equal(tier30.subtotalPhp, 1575);
  assert.equal(tier30.bulkDiscountPercent, 5);
  assert.equal(tier30.discountAmountPhp, 78.75);
  assert.equal(tier30.totalAmountPhp, 1496.25);

  // 70 eggs: 10% discount (Breeder Tier 60-99)
  const tier60 = calculateBulkEggPrice('Rhode Island Red', 70, 45);
  assert.equal(tier60.bulkDiscountPercent, 10);
  assert.equal(tier60.discountAmountPhp, 315);
  assert.equal(tier60.totalAmountPhp, 2835);

  // 120 eggs: 15% discount (Commercial Tier 100+)
  const tier100 = calculateBulkEggPrice('Black Australorp', 120, 65);
  assert.equal(tier100.subtotalPhp, 7800);
  assert.equal(tier100.bulkDiscountPercent, 15);
  assert.equal(tier100.discountAmountPhp, 1170);
  assert.equal(tier100.totalAmountPhp, 6630);
});

test('calculatePelletBatchCost handles chosen ingredients, custom measurements, cost per kg, and Crude Protein %', () => {
  const ingredients = [
    { ingredientId: '1', name: 'Yellow Corn', kgUsed: 45, unitCostPhp: 26, crudeProteinPercent: 8.8 }, // 1170 PHP, 3.96 kg CP
    { ingredientId: '2', name: 'Rice Bran D1', kgUsed: 30, unitCostPhp: 16, crudeProteinPercent: 12.5 }, // 480 PHP, 3.75 kg CP
    { ingredientId: '3', name: 'Azolla Dried', kgUsed: 10, unitCostPhp: 12, crudeProteinPercent: 25.0 }, // 120 PHP, 2.50 kg CP
    { ingredientId: '4', name: 'Molasses', kgUsed: 5, unitCostPhp: 35, crudeProteinPercent: 3.2 }, // 175 PHP, 0.16 kg CP
    { ingredientId: '5', name: 'Premix', kgUsed: 10, unitCostPhp: 140, crudeProteinPercent: 38.0 }, // 1400 PHP, 3.80 kg CP
    { ingredientId: '6', name: 'Unchosen Copra', kgUsed: 0, unitCostPhp: 22, crudeProteinPercent: 21.0 }, // Ignored (0 kg)
  ];
  // Total kg: 100 kg
  // Total cost: 1170 + 480 + 120 + 175 + 1400 = 3345
  // Cost per kg: ₱33.45
  // Total CP kg: 3.96 + 3.75 + 2.50 + 0.16 + 3.80 = 14.17 kg -> 14.17% CP
  const result = calculatePelletBatchCost(ingredients);
  assert.equal(result.totalKgProduced, 100);
  assert.equal(result.totalBatchCostPhp, 3345);
  assert.equal(result.costPerKgPhp, 33.45);
  assert.equal(result.crudeProteinPercent, 14.17);
  assert.equal(result.totalCrudeProteinKg, 14.17);
});

test('formatPhp formats Philippine Peso', () => {
  const formatted = formatPhp(1500);
  assert.ok(formatted.includes('1,500.00'));
});

test('generateMessengerReceipt includes farm name, address, and total', () => {
  const mockOrder = {
    id: 'ord-1',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
    syncStatus: 'synced' as const,
    orderNumber: 'ORD-2026-001',
    customerName: 'Juan Dela Cruz',
    contactNumber: '0917-888-9999',
    location: 'Centro Solana, Cagayan',
    breed: 'Rhode Island Red' as const,
    itemType: 'Fertile Hatching Eggs' as const,
    quantity: 60,
    unitBasePricePhp: 45,
    bulkDiscountPercent: 10,
    discountAmountPhp: 270,
    packagingFeePhp: 50,
    totalAmountPhp: 2480,
    paymentMethod: 'GCash' as const,
    status: 'Paid' as const,
    dateReserved: '2026-10-18',
    targetDispatchDate: '2026-10-20',
  };

  const receipt = generateMessengerReceipt(mockOrder, '0917-000-1111');
  assert.ok(receipt.includes('LEGAL CHICKS POULTRY FARM'));
  assert.ok(receipt.includes('Centro Solana, Cagayan'));
  assert.ok(receipt.includes('ORD-2026-001'));
  assert.ok(receipt.includes('Juan Dela Cruz'));
  assert.ok(receipt.includes('60 pcs'));
  assert.ok(receipt.includes('PAID'));
});
