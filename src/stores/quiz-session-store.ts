import { defineStore } from 'pinia';
import { computed, ref, toRaw } from 'vue';
import { aiQuizResultRepository } from '@/db/repositories';
import type { GeneratedQuestionType } from '@/services/ai/quiz-schema';
import { useCardStore } from '@/stores/card-store';
import type { QuizQuestion } from '@/types/card';

export interface QuizSessionQuestion {
  id: string;
  cardId: string;
  cardTitle: string;
  type: GeneratedQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
}

export const useQuizSessionStore = defineStore('quiz-session', () => {
  const questions = ref<QuizSessionQuestion[]>([]);
  const answers = ref<Record<string, string>>({});
  const isSubmitted = ref(false);
  const savedQuestionIds = ref<Set<string>>(new Set());
  const isResultSaved = ref(false);

  function isCorrect(question: QuizSessionQuestion): boolean {
    const given = (answers.value[question.id] ?? '').trim().toLowerCase();
    const correct = question.correctAnswer.trim().toLowerCase();
    return given.length > 0 && given === correct;
  }

  const score = computed(() => {
    if (!isSubmitted.value) return 0;
    return questions.value.filter((question) => isCorrect(question)).length;
  });

  function setQuestions(newQuestions: QuizSessionQuestion[]): void {
    questions.value = newQuestions;
    answers.value = {};
    isSubmitted.value = false;
    savedQuestionIds.value = new Set();
    isResultSaved.value = false;
  }

  function setAnswer(questionId: string, value: string): void {
    answers.value[questionId] = value;
  }

  /** Marks the quiz submitted and persists an `AiQuizResult` so the score/date/deck survive
   *  navigation — shown later in the Dashboard's AI Quiz History, separate from mini matching
   *  quizzes run during study sessions. */
  async function submit(): Promise<void> {
    isSubmitted.value = true;
    if (isResultSaved.value || questions.value.length === 0) return;

    const cardStore = useCardStore();
    const deckIds = new Set<string>();
    const topicIds = new Set<string>();
    for (const question of questions.value) {
      const card = cardStore.getById(question.cardId);
      if (card) {
        deckIds.add(card.deckId);
        if (card.topicId) topicIds.add(card.topicId);
      }
    }

    await aiQuizResultRepository.create({
      deckIds: [...deckIds],
      topicIds: [...topicIds],
      cardCount: questions.value.length,
      score: score.value,
      total: questions.value.length,
    });
    isResultSaved.value = true;
  }

  /**
   * Appends the question onto its source card's `quizQuestions`. Both `card` (read from the card
   * store) and `question` (read from this store's reactive `questions` array via `.find()`) are
   * reactive Proxies — their nested arrays/objects must be unwrapped with `toRaw` before they're
   * handed to IndexedDB, the same DataCloneError pitfall hit earlier in the card editor.
   */
  async function saveQuestionToCard(question: QuizSessionQuestion): Promise<void> {
    const cardStore = useCardStore();
    const card = cardStore.getById(question.cardId);
    if (!card) return;

    const rawCard = toRaw(card);
    const rawQuestion = toRaw(question);
    const newQuizQuestion: QuizQuestion = {
      id: crypto.randomUUID(),
      question: rawQuestion.question,
      options: rawQuestion.options,
      correctAnswer: rawQuestion.correctAnswer,
    };

    await cardStore.edit(card.id, {
      quizQuestions: [...rawCard.quizQuestions, newQuizQuestion],
    });
    savedQuestionIds.value.add(question.id);
  }

  return {
    questions,
    answers,
    isSubmitted,
    savedQuestionIds,
    score,
    isCorrect,
    setQuestions,
    setAnswer,
    submit,
    saveQuestionToCard,
  };
});
