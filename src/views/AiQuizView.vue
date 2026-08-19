<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useQuizSessionStore } from '@/stores/quiz-session-store';

const router = useRouter();
const quizSessionStore = useQuizSessionStore();

const hasQuestions = computed(() => quizSessionStore.questions.length > 0);
const allAnswered = computed(() =>
  quizSessionStore.questions.every((question) => (quizSessionStore.answers[question.id] ?? '').trim().length > 0),
);

function setAnswer(questionId: string, value: string) {
  quizSessionStore.setAnswer(questionId, value);
}

function handleSubmit() {
  quizSessionStore.submit();
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
  <div class="min-h-screen bg-white px-4 py-6">
    <RouterLink
      to="/ai-quiz"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Card Selection
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-black">AI Quiz</h1>

    <div
      v-if="!hasQuestions"
      class="flex flex-col items-center gap-4 py-16 text-center"
    >
      <p class="text-sm text-gray-500">No quiz is loaded yet.</p>
      <BaseButton
        variant="primary"
        @click="startNewQuiz"
      >
        Select Cards
      </BaseButton>
    </div>

    <template v-else>
      <p
        v-if="quizSessionStore.isSubmitted"
        class="mb-6 rounded-lg border-2 border-black p-4 text-center"
      >
        <span class="text-2xl font-semibold text-black"
          >{{ quizSessionStore.score }} / {{ quizSessionStore.questions.length }}</span
        >
        <span class="ml-2 text-sm text-gray-600">correct</span>
      </p>

      <div class="space-y-5">
        <BaseCard
          v-for="(question, index) in quizSessionStore.questions"
          :key="question.id"
        >
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-medium text-gray-500">
              Question {{ index + 1 }} · from “{{ question.cardTitle }}”
            </p>
            <span
              v-if="quizSessionStore.isSubmitted"
              class="text-xs font-semibold"
              :class="quizSessionStore.isCorrect(question) ? 'text-black' : 'text-gray-400'"
            >
              {{ quizSessionStore.isCorrect(question) ? '✓ Correct' : '✕ Incorrect' }}
            </span>
          </div>

          <p class="mb-3 text-sm font-medium text-black">{{ question.question }}</p>

          <div
            v-if="question.type === 'multiple-choice' && question.options"
            class="space-y-2"
          >
            <label
              v-for="option in question.options"
              :key="option"
              class="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm"
              :class="[
                quizSessionStore.answers[question.id] === option
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300',
                quizSessionStore.isSubmitted &&
                option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                  ? 'font-semibold'
                  : '',
              ]"
            >
              <input
                type="radio"
                class="accent-black"
                :name="question.id"
                :value="option"
                :checked="quizSessionStore.answers[question.id] === option"
                :disabled="quizSessionStore.isSubmitted"
                @change="setAnswer(question.id, option)"
              />
              {{ option }}
            </label>
          </div>

          <BaseInput
            v-else
            :model-value="quizSessionStore.answers[question.id] ?? ''"
            :disabled="quizSessionStore.isSubmitted"
            placeholder="Type your answer…"
            @update:model-value="setAnswer(question.id, $event)"
          />

          <p
            v-if="quizSessionStore.isSubmitted && !quizSessionStore.isCorrect(question)"
            class="mt-2 text-xs text-gray-600"
          >
            Correct answer: <span class="font-medium text-black">{{ question.correctAnswer }}</span>
          </p>

          <BaseButton
            v-if="quizSessionStore.isSubmitted"
            variant="ghost"
            size="sm"
            :disabled="quizSessionStore.savedQuestionIds.has(question.id)"
            class="mt-3"
            @click="handleSave(question.id)"
          >
            {{ quizSessionStore.savedQuestionIds.has(question.id) ? 'Saved to card ✓' : 'Save to Card' }}
          </BaseButton>
        </BaseCard>
      </div>

      <div class="mt-6 flex gap-3">
        <BaseButton
          v-if="!quizSessionStore.isSubmitted"
          variant="primary"
          block
          :disabled="!allAnswered"
          @click="handleSubmit"
        >
          Submit Quiz
        </BaseButton>
        <BaseButton
          v-else
          variant="primary"
          block
          @click="startNewQuiz"
        >
          Generate Another Quiz
        </BaseButton>
      </div>
    </template>
  </div>
</template>
