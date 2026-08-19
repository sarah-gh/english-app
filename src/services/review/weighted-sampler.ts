import type { Card, ReviewStatus } from '@/types/card';

type WeightedTier = 'hard' | 'medium' | 'easy';

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
 * Builds a review queue from Hard/Medium/Easy cards — New cards are excluded, since this mode
 * reinforces previously-seen material rather than introducing new ones. At each draw, the next
 * card's tier is chosen with probability proportional to the spec's 50/30/20 weights, renormalized
 * across whichever tiers still have cards remaining, so every matching card ends up in the queue
 * exactly once while still being front-loaded toward Hard cards on average.
 */
export function buildWeightedQueue(cards: Card[]): Card[] {
  const pools: Record<WeightedTier, Card[]> = { hard: [], medium: [], easy: [] };
  for (const card of cards) {
    const tier = statusToTier(card.reviewStatus);
    if (tier) pools[tier].push(card);
  }

  const queue: Card[] = [];
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
    queue.push(pool.splice(randomIndex, 1)[0]);

    if (pool.length === 0) {
      availableTiers = availableTiers.filter((tier) => tier !== chosenTier);
    }
  }

  return queue;
}
