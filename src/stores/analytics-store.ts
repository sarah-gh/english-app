import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { aiQuizResultRepository, dailyStatRepository, settingsRepository } from '@/db/repositories';
import type { AiQuizResult } from '@/types/ai-quiz-result';
import type { DailyStat } from '@/types/daily-stat';
import { lastNDateKeys, todayDateKey } from '@/utils/date';

export interface WeekStreakDay {
  date: string;
  cardsStudied: number;
  isToday: boolean;
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const dailyGoal = ref(15);
  const weekStats = ref<DailyStat[]>([]);
  const aiQuizHistory = ref<AiQuizResult[]>([]);
  const isLoaded = ref(false);

  const todayCount = computed(() => weekStats.value.find((stat) => stat.date === todayDateKey())?.cardsStudied ?? 0);

  const weekStreak = computed<WeekStreakDay[]>(() => {
    const today = todayDateKey();
    return lastNDateKeys(7).map((date) => ({
      date,
      cardsStudied: weekStats.value.find((stat) => stat.date === date)?.cardsStudied ?? 0,
      isToday: date === today,
    }));
  });

  const activeDaysThisWeek = computed(() => weekStreak.value.filter((day) => day.cardsStudied > 0).length);

  async function fetchAll(): Promise<void> {
    const [settings, stats, history] = await Promise.all([
      settingsRepository.get(),
      dailyStatRepository.getByDates(lastNDateKeys(7)),
      aiQuizResultRepository.getAll(),
    ]);
    dailyGoal.value = settings.dailyGoalCards;
    weekStats.value = stats;
    aiQuizHistory.value = history;
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  async function setDailyGoal(goal: number): Promise<void> {
    await settingsRepository.update({ dailyGoalCards: goal });
    dailyGoal.value = goal;
  }

  return {
    dailyGoal,
    weekStats,
    aiQuizHistory,
    isLoaded,
    todayCount,
    weekStreak,
    activeDaysThisWeek,
    fetchAll,
    ensureLoaded,
    setDailyGoal,
  };
});
