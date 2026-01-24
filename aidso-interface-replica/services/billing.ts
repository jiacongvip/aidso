export type BillingPricing = {
  dailyUnitsByPlan: Record<string, number>;
  searchMultiplier: { quick: number; deep: number };
  modelUnitPrice: Record<string, number>;
};

let cachedPricing: BillingPricing | null = null;
let inflight: Promise<BillingPricing | null> | null = null;

export function invalidateBillingPricing() {
  cachedPricing = null;
  inflight = null;
}

export async function getBillingPricing(): Promise<BillingPricing | null> {
  if (cachedPricing) return cachedPricing;
  if (!inflight) {
    inflight = fetch('/api/billing/pricing')
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as BillingPricing | null;
        if (!data) return null;
        cachedPricing = data;
        return cachedPricing;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function estimateCostUnits(params: {
  models: string[];
  searchType: 'quick' | 'deep';
  pricing: BillingPricing | null;
}) {
  const pricing = params.pricing;
  if (!pricing) return null;

  const base = (params.models || []).reduce((sum, modelKey) => {
    const unitPrice = pricing.modelUnitPrice?.[modelKey];
    return sum + (typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : 1);
  }, 0);
  const multiplier = pricing.searchMultiplier?.[params.searchType] || 1;
  return base * multiplier;
}
