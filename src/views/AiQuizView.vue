<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useQuizSessionStore } from '@/stores/quiz-session-store';

const router = useRouter();
const quizSessionStore = useQuizSessionStore();

const hasQuestions = computed(() => quizSessionStore.questions.length > 0);
const isMultipleChoice = computed(() => quizSessionStore.mode === 'multiple-choice');
const allAnswered = computed(() =>
  quizSessionStore.questions.every((question) => (quizSessionStore.answers[question.id] ?? '').trim().length > 0),
);
const averagePercent = computed(() =>
  quizSessionStore.total > 0 ? Math.round((quizSessionStore.score / quizSessionStore.total) * 100) : 0,
);

function gradeLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function setAnswer(questionId: string, value: string) {
  quizSessionStore.setAnswer(questionId, value);
}

function handleSubmit() {
  if (isMultipleChoice.value) quizSessionStore.submitMultipleChoice();
  else quizSessionStore.submitDescriptive();
}

function handleSave(questionId: string) {
  const question = quizSessionStore.questions.find((q) => q.id === questionId);
  if (question) quizSessionStore.saveQuestionToCard(question);
}

function startNewQuiz() {
  router.push('/ai-quiz');
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <RouterLink to="/ai-quiz" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Card Selection
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-text">AI Quiz</h1>

    <div v-if="!hasQuestions" class="flex flex-col items-center gap-4 py-16 text-center">
      <p class="text-sm text-text/50">No quiz is loaded yet.</p>
      <BaseButton variant="primary" @click="startNewQuiz">
        Select Cards
      </BaseButton>
    </div>

    <div v-else-if="quizSessionStore.isGrading" class="flex flex-col items-center gap-4 py-24 text-center">
      <svg class="h-8 w-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="text-sm font-medium text-text">AI is grading your answers…</p>
      <p class="text-xs text-text/50">This can take a few seconds.</p>
    </div>

    <template v-else>
      <div v-if="quizSessionStore.isSubmitted" class="mb-6 rounded-lg border-2 border-primary/30 p-4 text-center">
        <template v-if="isMultipleChoice">
          <span class="text-2xl font-semibold text-primary">{{ quizSessionStore.score }} / {{ quizSessionStore.total }}</span>
          <span class="ml-2 text-sm text-text/60">correct</span>
        </template>
        <template v-else>
          <span class="text-2xl font-semibold text-primary">{{ averagePercent }}%</span>
          <span class="ml-2 text-sm text-text/60">average score</span>
        </template>
      </div>

      <p v-if="quizSessionStore.gradingError" class="mb-4 flex items-center gap-1.5 text-xs font-medium text-danger">
        <WarningIcon />
        {{ quizSessionStore.gradingError }}
      </p>

      <div class="space-y-5">
        <BaseCard v-for="(question, index) in quizSessionStore.questions" :key="question.id">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-medium text-text/50">
              Question {{ index + 1 }} · from “{{ question.cardTitle }}”
            </p>
            <span
v-if="quizSessionStore.isSubmitted && isMultipleChoice" class="inline-flex items-center gap-1 text-xs font-semibold"
              :class="quizSessionStore.isCorrect(question) ? 'text-primary' : 'text-danger'">
              <AppIcon :icon-name="quizSessionStore.isCorrect(question) ? 'TickCircle' : 'CloseCircle'" :size="14" />
              {{ quizSessionStore.isCorrect(question) ? 'Correct' : 'Incorrect' }}
            </span>
            <span
v-else-if="quizSessionStore.isSubmitted && quizSessionStore.evaluationFor(question)"
              class="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {{ quizSessionStore.evaluationFor(question)!.score }}/100 · {{ gradeLabel(quizSessionStore.evaluationFor(question)!.score) }}
            </span>
          </div>

          <p class="mb-3 text-sm font-medium text-text">{{ question.question }}</p>

          <div v-if="isMultipleChoice && question.options" class="space-y-2">
            <label
v-for="(option, optionIndex) in question.options" :key="option"
              class="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm" :class="[
                quizSessionStore.answers[question.id] === option
                  ? 'border-primary bg-primary/5'
                  : 'border-text/20',
                quizSessionStore.isSubmitted && optionIndex === question.correctOptionIndex
                  ? 'font-semibold'
                  : '',
              ]">
              <input
type="radio" class="accent-primary" :name="question.id" :value="option"
                :checked="quizSessionStore.answers[question.id] === option" :disabled="quizSessionStore.isSubmitted"
                @change="setAnswer(question.id, option)" />
              {{ option }}
            </label>
          </div>

          <BaseInput
v-else :model-value="quizSessionStore.answers[question.id] ?? ''"
            :disabled="quizSessionStore.isSubmitted" :rows="4" placeholder="Type your answer…"
            @update:model-value="setAnswer(question.id, $event)" />

          <p
v-if="quizSessionStore.isSubmitted && isMultipleChoice && !quizSessionStore.isCorrect(question)"
            class="mt-2 text-xs text-text/60">
            Correct answer:
            <span class="font-medium text-text">{{
              question.options && question.correctOptionIndex !== undefined
                ? question.options[question.correctOptionIndex]
                : ''
            }}</span>
          </p>

          <div v-if="quizSessionStore.isSubmitted && !isMultipleChoice && quizSessionStore.evaluationFor(question)" class="mt-3 space-y-2 border-t border-text/10 pt-3">
            <p class="text-xs text-text/70">
              <span class="font-semibold text-text">Feedback:</span> {{ quizSessionStore.evaluationFor(question)!.feedback }}
            </p>
            <p class="text-xs text-text/70">
              <span class="font-semibold text-text">Sample answer:</span> {{ quizSessionStore.evaluationFor(question)!.sampleAnswer }}
            </p>
          </div>

          <BaseButton
v-if="quizSessionStore.isSubmitted && isMultipleChoice" variant="ghost" size="sm"
            :disabled="quizSessionStore.savedQuestionIds.has(question.id)" class="mt-3"
            @click="handleSave(question.id)">
            {{ quizSessionStore.savedQuestionIds.has(question.id) ? 'Saved to card ✓' : 'Save to Card' }}
          </BaseButton>
        </BaseCard>
      </div>

      <div class="mt-6 flex gap-3">
        <BaseButton
v-if="!quizSessionStore.isSubmitted" variant="primary" block :disabled="!allAnswered"
          @click="handleSubmit">
          {{ isMultipleChoice ? 'Submit Quiz' : 'Submit for AI Grading' }}
        </BaseButton>
        <BaseButton v-else variant="primary" block @click="startNewQuiz">
          Generate Another Quiz
        </BaseButton>
      </div>
    </template>
  </div>
</template>
