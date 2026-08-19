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
      <span class="text-xs font-medium text-gray-600">Personal Quiz Questions</span>
      <button
        type="button"
        class="text-xs font-medium text-black underline underline-offset-2 hover:no-underline"
        @click="addQuestion"
      >
        + Add question
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="question in quizQuestions"
        :key="question.id"
        class="space-y-2 rounded border border-gray-200 p-3"
      >
        <div class="flex gap-2">
          <input
            v-model="question.question"
            type="text"
            placeholder="Question"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <button
            type="button"
            class="shrink-0 rounded border border-gray-300 px-2 text-xs text-gray-500 hover:border-black hover:text-black"
            @click="removeQuestion(question.id)"
          >
            Remove
          </button>
        </div>
        <input
          v-model="question.correctAnswer"
          type="text"
          placeholder="Correct answer"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>
      <p
        v-if="quizQuestions.length === 0"
        class="text-xs text-gray-400"
      >
        No practice questions added.
      </p>
    </div>
  </div>
</template>
