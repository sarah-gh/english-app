<script setup lang="ts">
import type { QuizQuestion } from '@/types/card';

const quizQuestions = defineModel<QuizQuestion[]>('quizQuestions', { required: true });

function addQuestion() {
  quizQuestions.value = [
    ...quizQuestions.value,
    { id: crypto.randomUUID(), question: '', correctAnswer: '' },
  ];
}

function removeQuestion(id: string) {
  quizQuestions.value = quizQuestions.value.filter((question) => question.id !== id);
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs font-medium text-text/60">Personal Quiz Questions</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
        @click="addQuestion"
      >
        <AppIcon
          icon-name="Add"
          :size="12"
        />
        Add question
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="question in quizQuestions"
        :key="question.id"
        class="space-y-2 rounded border bg-card-surface border-text/10 p-3"
      >
        <div class="flex gap-2">
          <input
            v-model="question.question"
            type="text"
            placeholder="Question"
            class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 rounded border border-text/20 px-2 text-xs text-text/50 hover:border-primary hover:text-primary"
            @click="removeQuestion(question.id)"
          >
            <AppIcon
              icon-name="Trash"
              :size="12"
            />
            Remove
          </button>
        </div>
        <input
          v-model="question.correctAnswer"
          type="text"
          placeholder="Correct answer"
          class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <p
        v-if="quizQuestions.length === 0"
        class="text-xs text-text/35"
      >
        No practice questions added.
      </p>
    </div>
  </div>
</template>
