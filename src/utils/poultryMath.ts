import type { FertileEggOrder, PoultryBreed } from '../types/index.ts';

/**
 * Calculates egg laying rate percentage.
 * Formula: (Total Eggs / Active Hens) * 100
 */
export function calculateLayingRate(totalEggs: number, activeHens: number): number {
  if (activeHens <= 0 || totalEggs <= 0) return 0;
  const rate = (totalEggs / activeHens) * 100;
  return Math.min(100, Math.round(rate * 10) / 10);
}

/**
 * Helper to add days to a YYYY-MM-DD string and return YYYY-MM-DD
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calculates the standard 21-day incubation calendar milestones
 * Day 7: 1st Candling (check for spider veins, clears removed)
 * Day 14: 2nd Candling (check embryo growth & blood rings)
 * Day 18: Lockdown (stop turning, elevate humidity to 65-75%)
 * Day 21: Expected Hatch Date
 */
export function calculateIncubationMilestones(dateSet: string) {
  return {
    day7CandlingDate: addDaysToDateString(dateSet, 7),
    day14CandlingDate: addDaysToDateString(dateSet, 14),
    day18LockdownDate: addDaysToDateString(dateSet, 18),
    day21HatchDate: addDaysToDateString(dateSet, 21),
  };
}

/**
 * Returns current incubation day (1 to 21+) and status string based on reference date
 */
export function getIncubationCurrentState(dateSet: string, referenceDateStr?: string): {
  currentDay: number;
  statusText: string;
  isLockdown: boolean;
  isHatched: boolean;
} {
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const [year, month, day] = dateSet.split('-').map(Number);
  const setDate = new Date(Date.UTC(year, month - 1, day));
  
  const diffTime = ref.getTime() - setDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, diffDays + 1);

  let statusText = 'Day 1-6 Incubation';
  let isLockdown = false;
  let isHatched = false;

  if (currentDay < 7) {
    statusText = `Day ${currentDay} - Initial Incubation`;
  } else if (currentDay === 7) {
    statusText = 'Day 7 Candling Due Today';
  } else if (currentDay < 14) {
    statusText = `Day ${currentDay} - Mid Incubation`;
  } else if (currentDay === 14) {
    statusText = 'Day 14 Candling Due Today';
  } else if (currentDay < 18) {
    statusText = `Day ${currentDay} - Pre-Lockdown`;
  } else if (currentDay >= 18 && currentDay <= 20) {
    statusText = `Day ${currentDay} - LOCKDOWN (High Humidity)`;
    isLockdown = true;
  } else if (currentDay === 21) {
    statusText = 'Day 21 - HATCH DAY!';
    isLockdown = true;
    isHatched = true;
  } else {
    statusText = `Day ${currentDay} - Hatch Completed`;
    isHatched = true;
  }

  return { currentDay, statusText, isLockdown, isHatched };
}

/**
 * Calculates fertility and hatchability statistics
 */
export function calculateFertilityAndHatchability(
  eggsSet: number,
  day7Clears: number = 0,
  day14Dead: number = 0,
  chicksHatched: number = 0
) {
  if (eggsSet <= 0) {
    return {
      fertileEggs: 0,
      fertilityPercent: 0,
      hatchabilityPercent: 0,
      totalHatchabilityPercent: 0,
    };
  }

  const fertileEggs = Math.max(0, eggsSet - day7Clears);
  const fertilityPercent = Math.round((fertileEggs / eggsSet) * 1000) / 10;
  
  // Hatchability of fertile eggs
  const hatchabilityPercent = fertileEggs > 0 
    ? Math.round((chicksHatched / fertileEggs) * 1000) / 10 
    : 0;

  // Hatchability of total eggs set
  const totalHatchabilityPercent = Math.round((chicksHatched / eggsSet) * 1000) / 10;

  return {
    fertileEggs,
    fertilityPercent: Math.min(100, Math.max(0, fertilityPercent)),
    hatchabilityPercent: Math.min(100, Math.max(0, hatchabilityPercent)),
    totalHatchabilityPercent: Math.min(100, Math.max(0, totalHatchabilityPercent)),
  };
}

/**
 * Bulk discount calculator for fertile hatching eggs
 * Pricing Tier:
 * 1-29 eggs: 0% discount
 * 30-59 eggs: 5% bulk discount
 * 60-99 eggs: 10% bulk discount
 * 100+ eggs: 15% bulk discount
 */
export function calculateBulkEggPrice(
  breed: PoultryBreed,
  quantity: number,
  customBasePrice?: number
): {
  unitBasePricePhp: number;
  subtotalPhp: number;
  bulkDiscountPercent: number;
  discountAmountPhp: number;
  totalAmountPhp: number;
  tierName: string;
} {
  // Standard Default Farm Base Prices
  const unitBasePricePhp = customBasePrice !== undefined 
    ? customBasePrice 
    : (breed === 'Black Australorp' ? 65 : 45); // RIR ₱45, Australorp ₱65

  const qty = Math.max(0, quantity);
  const subtotalPhp = qty * unitBasePricePhp;

  let bulkDiscountPercent = 0;
  let tierName = 'Retail (1-29 eggs)';

  if (qty >= 100) {
    bulkDiscountPercent = 15;
    tierName = 'Commercial Tier (100+ eggs, 15% off)';
  } else if (qty >= 60) {
    bulkDiscountPercent = 10;
    tierName = 'Breeder Tier (60-99 eggs, 10% off)';
  } else if (qty >= 30) {
    bulkDiscountPercent = 5;
    tierName = 'Farmer Starter (30-59 eggs, 5% off)';
  }

  const discountAmountPhp = Math.round((subtotalPhp * (bulkDiscountPercent / 100)) * 100) / 100;
  const totalAmountPhp = Math.round((subtotalPhp - discountAmountPhp) * 100) / 100;

  return {
    unitBasePricePhp,
    subtotalPhp,
    bulkDiscountPercent,
    discountAmountPhp,
    totalAmountPhp,
    tierName,
  };
}

/**
 * Calculates raw ingredient deductions and cost per kg for a custom pellet batch
 */
export interface PelletIngredientInput {
  ingredientId: string;
  name: string;
  kgUsed: number;
  unitCostPhp: number;
}

export function calculatePelletBatchCost(ingredients: PelletIngredientInput[]) {
  let totalKg = 0;
  let totalCostPhp = 0;

  for (const item of ingredients) {
    const cost = item.kgUsed * item.unitCostPhp;
    totalKg += item.kgUsed;
    totalCostPhp += cost;
  }

  const costPerKgPhp = totalKg > 0 ? Math.round((totalCostPhp / totalKg) * 100) / 100 : 0;

  return {
    totalKgProduced: Math.round(totalKg * 100) / 100,
    totalBatchCostPhp: Math.round(totalCostPhp * 100) / 100,
    costPerKgPhp,
  };
}

/**
 * Currency formatter for Philippine Peso (₱)
 */
export function formatPhp(amount: number): string {
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = amount < 0 ? '-Php ' : 'Php ';
  return `${prefix}${formattedNumber}`;
}

/**
 * Generates ready-to-paste Facebook Messenger receipt
 */
export function generateMessengerReceipt(order: FertileEggOrder, gcashNumber: string = '0917-123-4567'): string {
  return `🐔 LEGAL CHICKS POULTRY FARM
📍 Centro Solana, Cagayan Valley, Philippines
━━━━━━━━━━━━━━━━━━━━━
📋 ORDER CONFIRMATION
Order ID: ${order.orderNumber}
Date: ${order.dateReserved}

👤 Customer: ${order.customerName}
📞 Contact: ${order.contactNumber}
📍 Location: ${order.location}

📦 ITEM DETAILS:
• Item: ${order.itemType}
• Breed: ${order.breed}
• Quantity: ${order.quantity} pcs
• Unit Price: ${formatPhp(order.unitBasePricePhp)}
${order.bulkDiscountPercent > 0 ? `• Bulk Discount: ${order.bulkDiscountPercent}% (-${formatPhp(order.discountAmountPhp)})\n` : ''}${order.packagingFeePhp > 0 ? `• Packaging/Carton: ${formatPhp(order.packagingFeePhp)}\n` : ''}💰 TOTAL AMOUNT: ${formatPhp(order.totalAmountPhp)}
Status: ${order.status.toUpperCase()}
Target Dispatch: ${order.targetDispatchDate}

💳 PAYMENT OPTIONS:
• GCash: ${gcashNumber} (Legal Chicks Farm)
• Pickup / COD available at Farm Gate, Centro Solana

✨ Salamat po sa pagtangkilik sa purong lahi! Note: All fertile eggs are sanitized, candled before dispatch, and collected from active breeding pens with 1:5 rooster-to-hen ratio.`;
}
