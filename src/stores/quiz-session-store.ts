import { defineStore } from 'pinia';
import { computed, ref, toRaw } from 'vue';
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
  }

  function setAnswer(questionId: string, value: string): void {
    answers.value[questionId] = value;
  }

  function submit(): void {
    isSubmitted.value = true;
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
