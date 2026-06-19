// Proration Engine Helper Functions for Tonex CBT

export interface PlanConfig {
  id: 'monthly' | 'quarterly' | 'yearly';
  name: string;
  price: number;
  durationDays: number;
}

export const PRORATION_PLANS: Record<string, PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: 2500,
    durationDays: 30,
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly',
    price: 6500,
    durationDays: 90,
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    price: 25000,
    durationDays: 365,
  },
};

interface ProrationResult {
  currentPlanId: string;
  newPlanId: string;
  unusedDays: number;
  unusedValue: number;
  basePrice: number;
  amountToPay: number;
  newExpiresAt: Date;
}

/**
 * Calculates the prorated price and new expiry date when upgrading a subscription.
 * 
 * @param currentPlanId The ID of the current active plan ('monthly', 'quarterly', 'yearly')
 * @param newPlanId The ID of the plan to upgrade to ('monthly', 'quarterly', 'yearly')
 * @param currentStartsAt The start date of the current active subscription
 * @param currentExpiresAt The expiry date of the current active subscription
 * @param now The current date (defaults to new Date())
 */
export function calculateUpgradeProration(
  currentPlanId: string,
  newPlanId: string,
  currentStartsAt: string | Date | null,
  currentExpiresAt: string | Date | null,
  now: Date = new Date()
): ProrationResult {
  const newPlan = PRORATION_PLANS[newPlanId];
  if (!newPlan) {
    throw new Error(`Invalid plan ID: ${newPlanId}`);
  }

  const basePrice = newPlan.price;
  const newExpiresAt = new Date(now.getTime());
  newExpiresAt.setDate(newExpiresAt.getDate() + newPlan.durationDays);

  const defaultResult: ProrationResult = {
    currentPlanId: currentPlanId || 'free',
    newPlanId,
    unusedDays: 0,
    unusedValue: 0,
    basePrice,
    amountToPay: basePrice,
    newExpiresAt,
  };

  // If no current plan or not upgrading (e.g. same plan or downgrade), no proration discount
  if (!currentPlanId || currentPlanId === 'free' || !currentStartsAt || !currentExpiresAt) {
    return defaultResult;
  }

  const currentPlan = PRORATION_PLANS[currentPlanId];
  if (!currentPlan) {
    return defaultResult;
  }

  const starts = new Date(currentStartsAt);
  const expires = new Date(currentExpiresAt);

  // If the current subscription has already expired or hasn't started yet, no proration discount
  if (expires.getTime() <= now.getTime() || starts.getTime() > now.getTime()) {
    return defaultResult;
  }

  // Calculate total duration of the current subscription in milliseconds
  const totalDurationMs = expires.getTime() - starts.getTime();
  if (totalDurationMs <= 0) {
    return defaultResult;
  }

  // Calculate unused duration in milliseconds
  const unusedMs = expires.getTime() - now.getTime();
  const unusedDays = Math.max(0, Math.ceil(unusedMs / (1000 * 60 * 60 * 24)));

  // Calculate unused value based on the original price paid for the plan
  const fractionUnused = unusedMs / totalDurationMs;
  const unusedValue = Math.max(0, Math.floor(currentPlan.price * fractionUnused));

  // Determine amount to pay (cannot be negative)
  const amountToPay = Math.max(0, basePrice - unusedValue);

  return {
    currentPlanId,
    newPlanId,
    unusedDays,
    unusedValue,
    basePrice,
    amountToPay,
    newExpiresAt,
  };
}
