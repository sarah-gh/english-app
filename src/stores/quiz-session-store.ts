import { defineStore } from 'pinia';
import { computed, ref, toRaw } from 'vue';
import { aiQuizResultRepository } from '@/db/repositories';
import { evaluateDescriptiveQuiz } from '@/services/ai/ai-quiz-service';
import { AiServiceError } from '@/services/ai/errors';
import { useCardStore } from '@/stores/card-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { AiQuizResultQuestionDetail, QuizMode } from '@/types/ai-quiz-result';
import type { QuizQuestion } from '@/types/card';

export interface QuizSessionQuestion {
  id: string;
  cardId: string;
  cardTitle: string;
  question: string;
  /** Multiple-choice only. */
  options?: string[];
  /** Multiple-choice only — 0-based index into `options`. */
  correctOptionIndex?: number;
}

interface DescriptiveEvaluation {
  score: number;
  feedback: string;
  sampleAnswer: string;
}

export const useQuizSessionStore = defineStore('quiz-session', () => {
  const mode = ref<QuizMode>('multiple-choice');
  const questions = ref<QuizSessionQuestion[]>([]);
  const answers = ref<Record<string, string>>({});
  const isSubmitted = ref(false);
  const isGrading = ref(false);
  const gradingError = ref('');
  const evaluations = ref<Record<string, DescriptiveEvaluation>>({});
  const savedQuestionIds = ref<Set<string>>(new Set());
  const isResultSaved = ref(false);

  function isCorrect(question: QuizSessionQuestion): boolean {
    if (!question.options || question.correctOptionIndex === undefined) return false;
    const given = answers.value[question.id];
    return given !== undefined && given === question.options[question.correctOptionIndex];
  }

  /** For open-ended questions only, once graded. */
  function evaluationFor(question: QuizSessionQuestion): DescriptiveEvaluation | undefined {
    return evaluations.value[question.id];
  }

  /** Multiple-choice: count of correct answers. Open-ended: sum of 0-100 AI scores — paired with
   *  `total` below, which scales to match (question count vs. question count * 100). */
  const score = computed(() => {
    if (!isSubmitted.value) return 0;
    if (mode.value === 'multiple-choice') {
      return questions.value.filter((question) => isCorrect(question)).length;
    }
    return questions.value.reduce((sum, question) => sum + (evaluationFor(question)?.score ?? 0), 0);
  });

  const total = computed(() => (mode.value === 'multiple-choice' ? questions.value.length : questions.value.length * 100));

  function setQuestions(newMode: QuizMode, newQuestions: QuizSessionQuestion[]): void {
    mode.value = newMode;
    questions.value = newQuestions;
    answers.value = {};
    isSubmitted.value = false;
    isGrading.value = false;
    gradingError.value = '';
    evaluations.value = {};
    savedQuestionIds.value = new Set();
    isResultSaved.value = false;
  }

  function setAnswer(questionId: string, value: string): void {
    answers.value[questionId] = value;
  }

  /**
   * `question` and its `evaluationFor` result are reactive Proxies (read from this store's
   * `questions`/`evaluations` refs) — their nested arrays (`options`) must be unwrapped with
   * `toRaw` before the built detail is handed to IndexedDB, the same DataCloneError pitfall
   * documented on `saveQuestionToCard` below.
   */
  function buildQuestionDetail(question: QuizSessionQuestion): AiQuizResultQuestionDetail {
    const rawQuestion = toRaw(question);
    const userAnswer = answers.value[question.id] ?? '';
    if (mode.value === 'multiple-choice') {
      return {
        question: rawQuestion.question,
        cardTitle: rawQuestion.cardTitle,
        userAnswer,
        options: rawQuestion.options,
        correctAnswer:
          rawQuestion.options && rawQuestion.correctOptionIndex !== undefined
            ? rawQuestion.options[rawQuestion.correctOptionIndex]
            : undefined,
        isCorrect: isCorrect(question),
      };
    }
    const evaluation = evaluationFor(question);
    return {
      question: rawQuestion.question,
      cardTitle: rawQuestion.cardTitle,
      userAnswer,
      score: evaluation?.score,
      feedback: evaluation?.feedback,
      sampleAnswer: evaluation?.sampleAnswer,
    };
  }

  /** Persists an `AiQuizResult` so the score/date/deck survive navigation — shown later in the
   *  Dashboard's AI Quiz History, separate from mini matching quizzes run during study sessions. */
  async function persistResult(): Promise<void> {
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
      mode: mode.value,
      deckIds: [...deckIds],
      topicIds: [...topicIds],
      cardCount: questions.value.length,
      score: score.value,
      total: total.value,
      questions: questions.value.map((question) => buildQuestionDetail(question)),
    });
    isResultSaved.value = true;
  }

  /** Multiple-choice quizzes score instantly, client-side. */
  async function submitMultipleChoice(): Promise<void> {
    isSubmitted.value = true;
    await persistResult();
  }

  /** Open-ended quizzes send the learner's free-text answers back to the configured AI
   *  provider(s) for grading before the result can be shown/persisted. */
  async function submitDescriptive(): Promise<void> {
    const settingsStore = useSettingsStore();
    isGrading.value = true;
    gradingError.value = '';
    try {
      const items = questions.value.map((question) => ({
        question: question.question,
        userAnswer: answers.value[question.id] ?? '',
      }));
      const results = await evaluateDescriptiveQuiz(settingsStore.settings, items);

      const nextEvaluations: Record<string, DescriptiveEvaluation> = {};
      for (const result of results) {
        const question = questions.value[result.sourceIndex - 1];
        if (!question) continue;
        nextEvaluations[question.id] = {
          score: result.score,
          feedback: result.feedback,
          sampleAnswer: result.sampleAnswer,
        };
      }
      evaluations.value = nextEvaluations;
      isSubmitted.value = true;
      await persistResult();
    } catch (error) {
      gradingError.value =
        error instanceof AiServiceError ? error.message : 'AI grading failed. Please try again.';
    } finally {
      isGrading.value = false;
    }
  }

  /**
   * Appends the question onto its source card's `quizQuestions` — multiple-choice only, since
   * open-ended questions have no single fixed `correctAnswer` to save. Both `card` (read from the
   * card store) and `question` (read from this store's reactive `questions` array via `.find()`)
   * are reactive Proxies — their nested arrays/objects must be unwrapped with `toRaw` before
   * they're handed to IndexedDB, the same DataCloneError pitfall hit earlier in the card editor.
   */
  async function saveQuestionToCard(question: QuizSessionQuestion): Promise<void> {
    if (mode.value !== 'multiple-choice' || !question.options || question.correctOptionIndex === undefined) return;

    const cardStore = useCardStore();
    const card = cardStore.getById(question.cardId);
    if (!card) return;

    const rawCard = toRaw(card);
    const rawQuestion = toRaw(question);
    const newQuizQuestion: QuizQuestion = {
      id: crypto.randomUUID(),
      question: rawQuestion.question,
      options: rawQuestion.options,
      correctAnswer: rawQuestion.options![rawQuestion.correctOptionIndex!],
    };

    await cardStore.edit(card.id, {
      quizQuestions: [...rawCard.quizQuestions, newQuizQuestion],
    });
    savedQuestionIds.value.add(question.id);
  }

  return {
    mode,
    questions,
    answers,
    isSubmitted,
    isGrading,
    gradingError,
    savedQuestionIds,
    score,
    total,
    isCorrect,
    evaluationFor,
    setQuestions,
    setAnswer,
    submitMultipleChoice,
    submitDescriptive,
    saveQuestionToCard,
  };
});
