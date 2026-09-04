import type { PosType, ReviewStatus } from '@/types/card';

export type StudyStatusFilter = 'all' | 'studied' | 'unstudied';
export type DifficultyFilter = 'all' | ReviewStatus;
export type PosFilter = 'all' | PosType;
export type SortOption = 'created-desc' | 'last-reviewed' | 'alphabetical' | 'study-count';
