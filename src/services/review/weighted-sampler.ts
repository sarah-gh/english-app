import type { Card, ReviewStatus } from '@/types/card';

export type WeightedTier = 'hard' | 'medium' | 'easy';

/** §5.E weighted priority distribution. */
const TIER_WEIGHTS: Record<WeightedTier, number> = {
  hard: 0.5,
  medium: 0.3,
  easy: 0.2,
};

const TIERS: WeightedTier[] = ['hard', 'medium', 'easy'];

function statusToTier(status: ReviewStatus): WeightedTier | null {
  return status === 'new' ? null : status;
}

/**
 * Shuffles `items` into an order front-loaded toward Hard, then Medium, then Easy: at each draw,
 * the next item's tier is chosen with probability proportional to the spec's 50/30/20 weights,
 * renormalized across whichever tiers still have items remaining, so every item ends up in the
 * result exactly once. Shared by the Weighted Random Review mode and the chunked study session's
 * priority queue so both use the same tier-ordering behavior.
 */
export function weightedShuffleByTier<T>(items: T[], tierOf: (item: T) => WeightedTier): T[] {
  const pools: Record<WeightedTier, T[]> = { hard: [], medium: [], easy: [] };
  for (const item of items) pools[tierOf(item)].push(item);

  const result: T[] = [];
  let availableTiers = TIERS.filter((tier) => pools[tier].length > 0);

  while (availableTiers.length > 0) {
    const totalWeight = availableTiers.reduce((sum, tier) => sum + TIER_WEIGHTS[tier], 0);
    let roll = Math.random() * totalWeight;
    let chosenTier = availableTiers[availableTiers.length - 1];
    for (const tier of availableTiers) {
      if (roll < TIER_WEIGHTS[tier]) {
        chosenTier = tier;
        break;
      }
      roll -= TIER_WEIGHTS[tier];
    }

    const pool = pools[chosenTier];
    const randomIndex = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(randomIndex, 1)[0]);

    if (pool.length === 0) {
      availableTiers = availableTiers.filter((tier) => tier !== chosenTier);
    }
  }

  return result;
}

/**
 * Builds a review queue from Hard/Medium/Easy cards — New cards are excluded, since this mode
 * reinforces previously-seen material rather than introducing new ones.
 */
export function buildWeightedQueue(cards: Card[]): Card[] {
  const weighable = cards.filter((card) => statusToTier(card.reviewStatus) !== null);
  return weightedShuffleByTier(weighable, (card) => statusToTier(card.reviewStatus)!);
}
