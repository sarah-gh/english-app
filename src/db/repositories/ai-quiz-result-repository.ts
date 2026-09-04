import { db } from '@/db';
import type { AiQuizResult, NewAiQuizResult } from '@/types/ai-quiz-result';

export const aiQuizResultRepository = {
  /** Newest-first, for the Dashboard's AI Quiz History list. */
  async getAll(): Promise<AiQuizResult[]> {
    return (await db.aiQuizResults.toArray()).sort((a, b) => b.createdAt - a.createdAt);
  },

  async create(result: NewAiQuizResult): Promise<AiQuizResult> {
    const timestamp = Date.now();
    const record: AiQuizResult = {
      ...result,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.aiQuizResults.add(record);
    return record;
  },

  async bulkPut(results: AiQuizResult[]): Promise<void> {
    await db.aiQuizResults.bulkPut(results);
  },

  async clear(): Promise<void> {
    await db.aiQuizResults.clear();
  },
};
