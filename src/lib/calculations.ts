/**
 * Financial calculation utilities for True Cost app
 */

export type Frequency = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Get the daily cost multiplier based on frequency
 */
export function getFrequencyMultiplier(frequency: Frequency, customDays?: number): number {
  switch (frequency) {
    case 'one-time':
      return 0; // One-time purchases don't have recurring cost
    case 'daily':
      return 1;
    case 'weekly':
      return 1 / 7;
    case 'monthly':
      return 1 / 30;
    case 'custom':
      return customDays ? 1 / customDays : 0;
    default:
      return 0;
  }
}

/**
 * Calculate yearly cost from a purchase amount and frequency
 */
export function calculateYearlyCost(
  amount: number,
  frequency: Frequency,
  customDays?: number
): number {
  if (frequency === 'one-time') return amount;
  const dailyCost = amount * getFrequencyMultiplier(frequency, customDays);
  return dailyCost * 365;
}

/**
 * Calculate the future value of investing savings
 * Formula: FV = PV × ((1 + r)^n - 1) / r
 * @param yearlyAmount - Amount saved per year
 * @param years - Number of years
 * @param rate - Annual return rate (default 7%)
 */
export function calculateInvestmentGrowth(
  yearlyAmount: number,
  years: number,
  rate: number = 0.07
): number {
  if (rate === 0) return yearlyAmount * years;
  return yearlyAmount * ((Math.pow(1 + rate, years) - 1) / rate);
}

/**
 * Calculate how many days a purchase delays a goal
 * @param purchaseAmount - Cost of the purchase
 * @param monthlyIncome - User's monthly income
 * @param savingsRate - What percentage goes to savings (default 20%)
 */
export function calculateGoalDelay(
  purchaseAmount: number,
  monthlyIncome: number,
  savingsRate: number = 0.2
): number {
  const dailySavings = (monthlyIncome * savingsRate) / 30;
  if (dailySavings <= 0) return 0;
  return Math.ceil(purchaseAmount / dailySavings);
}

/**
 * Get relatable comparisons for an amount
 */
export function getRelatableComparisons(yearlyAmount: number): string[] {
  const comparisons: string[] = [];
  
  if (yearlyAmount >= 50 && yearlyAmount < 200) {
    comparisons.push(`${Math.round(yearlyAmount / 15)} nice dinners out`);
    comparisons.push(`${Math.round(yearlyAmount / 12)} movie tickets`);
  }
  
  if (yearlyAmount >= 200 && yearlyAmount < 500) {
    comparisons.push(`${Math.round(yearlyAmount / 50)} tank${Math.round(yearlyAmount / 50) > 1 ? 's' : ''} of gas`);
    comparisons.push(`${Math.round(yearlyAmount / 100)} nice gifts`);
  }
  
  if (yearlyAmount >= 500 && yearlyAmount < 2000) {
    comparisons.push(`a weekend getaway`);
    comparisons.push(`${Math.round(yearlyAmount / 150)} concert tickets`);
    comparisons.push(`${Math.round(yearlyAmount / 100)} nice dinners`);
  }
  
  if (yearlyAmount >= 2000 && yearlyAmount < 5000) {
    comparisons.push(`a vacation trip`);
    comparisons.push(`${Math.round(yearlyAmount / 500)} weekend trips`);
    comparisons.push(`new electronics worth $${yearlyAmount.toLocaleString()}`);
  }
  
  if (yearlyAmount >= 5000 && yearlyAmount < 15000) {
    comparisons.push(`a dream vacation`);
    comparisons.push(`${Math.round(yearlyAmount / 1500)} months rent`);
    comparisons.push(`a down payment contribution`);
  }
  
  if (yearlyAmount >= 15000) {
    comparisons.push(`${Math.round(yearlyAmount / 2000)} months rent`);
    comparisons.push(`a used car down payment`);
    comparisons.push(`a significant investment portfolio boost`);
  }
  
  return comparisons.slice(0, 3);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount, 0);
}

/**
 * Calculate the cost breakdown for display
 */
export function calculateCostBreakdown(
  amount: number,
  frequency: Frequency,
  customDays?: number
) {
  const yearlyCost = calculateYearlyCost(amount, frequency, customDays);
  const dailyCost = frequency === 'one-time' ? 0 : amount * getFrequencyMultiplier(frequency, customDays);
  
  return {
    daily: dailyCost,
    weekly: dailyCost * 7,
    monthly: dailyCost * 30,
    yearly: yearlyCost,
    fiveYear: calculateInvestmentGrowth(yearlyCost, 5),
    tenYear: calculateInvestmentGrowth(yearlyCost, 10),
    comparisons: getRelatableComparisons(yearlyCost),
  };
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/**
 * Determine goal status based on progress and deadline
 */
export function getGoalStatus(
  current: number,
  target: number,
  targetDate: Date | null,
  monthlySavings: number
): 'on-track' | 'at-risk' | 'off-track' {
  if (!targetDate) return 'on-track';
  
  const remaining = target - current;
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const monthsRemaining = daysRemaining / 30;
  
  const projectedSavings = monthlySavings * monthsRemaining;
  
  if (projectedSavings >= remaining * 1.1) return 'on-track';
  if (projectedSavings >= remaining * 0.8) return 'at-risk';
  return 'off-track';
}