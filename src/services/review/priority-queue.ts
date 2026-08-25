import type { Card } from '@/types/card';
import { weightedShuffleByTier, type WeightedTier } from '@/services/review/weighted-sampler';
import { shuffle } from '@/utils/shuffle';

/** A card that's been swiped/matched before but never failed a match falls back to its swipe
 *  tier; a card that's never been swiped (still 'new') is treated as the lowest-urgency tier
 *  here, since §3's never-reviewed bucket above already gives it priority once. */
function tierOf(card: Card): WeightedTier {
  return card.reviewStatus === 'hard' || card.reviewStatus === 'medium' ? card.reviewStatus : 'easy';
}

/**
 * Builds a capped study-session queue using the priority order from the spec:
 * 1. Never-studied cards (`reviewStats.timesReviewed === 0`) first.
 * 2. Previously-failed cards (`reviewStats.failedMatches > 0`) next.
 * 3. Everything else, ordered by Hard -> Medium -> Easy tier weighting.
 * The result is capped at `size` — later tiers are simply left out once the cap is hit.
 */
export function buildPriorityQueue(cards: Card[], size: number): Card[] {
  const neverStudied: Card[] = [];
  const previouslyFailed: Card[] = [];
  const rest: Card[] = [];

  for (const card of cards) {
    if (card.reviewStats.timesReviewed === 0) {
      neverStudied.push(card);
    } else if (card.reviewStats.failedMatches > 0) {
      previouslyFailed.push(card);
    } else {
      rest.push(card);
    }
  }

  const queue = [...shuffle(neverStudied), ...shuffle(previouslyFailed), ...weightedShuffleByTier(rest, tierOf)];
  return queue.slice(0, size);
}
