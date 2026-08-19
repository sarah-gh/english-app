import type { ReviewStatus } from '@/types/card';

export type SwipeDirection = 'left' | 'right';

/** §5.C state machine: Swipe Right = Known, Swipe Left = Not Known. */
const TRANSITIONS: Record<ReviewStatus, Record<SwipeDirection, ReviewStatus>> = {
  new: { right: 'easy', left: 'medium' },
  medium: { right: 'easy', left: 'hard' },
  hard: { right: 'medium', left: 'hard' },
  easy: { right: 'easy', left: 'medium' },
};

export function nextReviewStatus(current: ReviewStatus, direction: SwipeDirection): ReviewStatus {
  return TRANSITIONS[current][direction];
}
