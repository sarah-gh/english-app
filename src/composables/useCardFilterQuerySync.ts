import { ref } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import type {
  DifficultyFilter,
  PosFilter,
  SortOption,
  StudyStatusFilter,
} from '@/types/card-filters';
import type { CardViewMode } from '@/types/view-mode';

const STUDY_STATUS_VALUES: readonly StudyStatusFilter[] = ['all', 'studied', 'unstudied'];
const DIFFICULTY_VALUES: readonly DifficultyFilter[] = ['all', 'new', 'easy', 'medium', 'hard'];
const POS_VALUES: readonly PosFilter[] = ['all', 'noun', 'verb', 'adjective', 'adverb', 'other'];
const SORT_VALUES: readonly SortOption[] = [
  'created-desc',
  'last-reviewed',
  'alphabetical',
  'study-count',
];
const VIEW_MODE_VALUES: readonly CardViewMode[] = ['study', 'practice'];

function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const raw = firstString(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * Mirrors the All Cards filter/search/sort/view state into the route's query string (via
 * `router.replace`, so typing or toggling filters never piles up browser-history entries) and
 * seeds that same state back from `route.query` at setup time. That round trip is what lets the
 * filtered view survive a trip to the card editor and back: the URL — not component state that
 * resets on unmount — is the source of truth, so "Cancel" or the browser Back button restores it.
 */
export function useCardFilterQuerySync() {
  const route = useRoute();
  const router = useRouter();
  const initialQuery = route.query;

  const searchQuery = ref(firstString(initialQuery.search));
  const deckId = ref(firstString(initialQuery.deck));
  const topicId = ref(firstString(initialQuery.topic));
  const tagIds = ref<string[]>(
    firstString(initialQuery.tags)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const studyStatus = ref<StudyStatusFilter>(
    readEnum(initialQuery.status, STUDY_STATUS_VALUES, 'all'),
  );
  const difficulty = ref<DifficultyFilter>(
    readEnum(initialQuery.difficulty, DIFFICULTY_VALUES, 'all'),
  );
  const pos = ref<PosFilter>(readEnum(initialQuery.pos, POS_VALUES, 'all'));
  const sort = ref<SortOption>(readEnum(initialQuery.sort, SORT_VALUES, 'created-desc'));
  const viewMode = ref<CardViewMode>(readEnum(initialQuery.view, VIEW_MODE_VALUES, 'study'));

  function syncQueryParams() {
    const query: LocationQueryRaw = {};
    const search = searchQuery.value.trim();
    if (search) query.search = search;
    if (deckId.value) query.deck = deckId.value;
    if (topicId.value) query.topic = topicId.value;
    if (tagIds.value.length > 0) query.tags = tagIds.value.join(',');
    if (studyStatus.value !== 'all') query.status = studyStatus.value;
    if (difficulty.value !== 'all') query.difficulty = difficulty.value;
    if (pos.value !== 'all') query.pos = pos.value;
    if (sort.value !== 'created-desc') query.sort = sort.value;
    if (viewMode.value !== 'study') query.view = viewMode.value;
    router.replace({ query });
  }

  return {
    searchQuery,
    deckId,
    topicId,
    tagIds,
    studyStatus,
    difficulty,
    pos,
    sort,
    viewMode,
    syncQueryParams,
  };
}
