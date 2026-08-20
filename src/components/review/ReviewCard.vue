<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import PartsOfSpeechDisplay from '@/components/card/PartsOfSpeechDisplay.vue';
import { useCardAudio } from '@/composables/useCardAudio';
import type { SwipeDirection } from '@/services/review/state-machine';
import { useTagStore } from '@/stores/tag-store';
import type { Card } from '@/types/card';
import type { Tag } from '@/types/tag';
import type { CardViewMode } from '@/types/view-mode';

const props = withDefaults(
  defineProps<{
    card: Card;
    interactive: boolean;
    viewMode?: CardViewMode;
  }>(),
  {
    viewMode: 'study',
  },
);

const emit = defineEmits<{
  swipe: [direction: SwipeDirection];
}>();

const tagStore = useTagStore();
const { playCardAudio } = useCardAudio();

const SWIPE_THRESHOLD = 100;
const FLY_DISTANCE = 640;

const rootEl = ref<HTMLDivElement>();
const offsetX = ref(0);
const isDragging = ref(false);
const isFlying = ref(false);
const flyDirection = ref<SwipeDirection | null>(null);

const isHintRevealed = ref(false);
const isImageExpanded = ref(false);
const isAnswerManuallyRevealed = ref(false);

/** Study mode always shows the answer; Practice mode conceals it until tapped or a swipe starts. */
const showAnswer = computed(() => props.viewMode === 'study' || isAnswerManuallyRevealed.value);

function revealAnswer() {
  isAnswerManuallyRevealed.value = true;
}

let activePointerId: number | null = null;
let startX = 0;

function onPointerDown(event: PointerEvent) {
  if (!props.interactive || isFlying.value) return;
  activePointerId = event.pointerId;
  startX = event.clientX;
  isDragging.value = true;
  revealAnswer();
  rootEl.value?.setPointerCapture(activePointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== activePointerId) return;
  offsetX.value = event.clientX - startX;
}

function endDrag(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== activePointerId) return;
  isDragging.value = false;
  if (activePointerId !== null) rootEl.value?.releasePointerCapture(activePointerId);

  if (Math.abs(offsetX.value) > SWIPE_THRESHOLD) {
    commitSwipe(offsetX.value > 0 ? 'right' : 'left');
  } else {
    offsetX.value = 0;
  }
}

function commitSwipe(direction: SwipeDirection) {
  if (isFlying.value) return;
  isFlying.value = true;
  flyDirection.value = direction;
  offsetX.value = direction === 'right' ? FLY_DISTANCE : -FLY_DISTANCE;
}

function onTransitionEnd(event: TransitionEvent) {
  if (event.target !== rootEl.value || event.propertyName !== 'transform') return;
  if (isFlying.value && flyDirection.value) {
    emit('swipe', flyDirection.value);
  }
}

defineExpose({
  triggerSwipe: commitSwipe,
});

const cardStyle = computed(() => ({
  transform: `translateX(${offsetX.value}px) rotate(${offsetX.value / 20}deg)`,
  transition: isDragging.value ? 'none' : 'transform 0.35s ease',
}));

const rightLabelOpacity = computed(() =>
  Math.min(Math.max(offsetX.value / SWIPE_THRESHOLD, 0), 1),
);
const leftLabelOpacity = computed(() =>
  Math.min(Math.max(-offsetX.value / SWIPE_THRESHOLD, 0), 1),
);

const cardTags = computed<Tag[]>(() =>
  props.card.tagIds
    .map((id) => tagStore.getById(id))
    .filter((tag): tag is Tag => Boolean(tag)),
);

function playAudio() {
  if (!props.interactive) return;
  playCardAudio(props.card);
}

function toggleHint() {
  if (!props.interactive) return;
  isHintRevealed.value = !isHintRevealed.value;
}

function toggleImage() {
  if (!props.interactive) return;
  isImageExpanded.value = !isImageExpanded.value;
}

const imageUrl = ref<string>();
watch(
  () => props.card.imageBlob,
  (blob) => {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = blob ? URL.createObjectURL(blob) : undefined;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});
</script>

<template>
  <div
    ref="rootEl"
    class="relative flex h-full w-full touch-none flex-col overflow-y-auto rounded-xl border-2 border-black bg-white p-5 select-none"
    :style="cardStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @transitionend="onTransitionEnd"
  >
    <div
      class="pointer-events-none absolute top-4 left-4 rounded border-2 border-black bg-red-500 px-3 py-1 text-sm font-bold text-white uppercase shadow-md"
      :style="{ opacity: leftLabelOpacity }"
    >
      Not Known
    </div>
    <div
      class="pointer-events-none absolute top-4 right-4 rounded border-2 border-black bg-green-500 px-3 py-1 text-sm font-bold text-white uppercase shadow-md"
      :style="{ opacity: rightLabelOpacity }"
    >
      Known
    </div>

    <div class="flex items-start justify-between gap-2">
      <h2 class="text-xl font-semibold text-black">{{ card.frontTitle }}</h2>
      <button
        type="button"
        aria-label="Play pronunciation"
        class="shrink-0 rounded-full border border-black p-2 text-black hover:bg-black hover:text-white"
        @pointerdown.stop
        @click.stop="playAudio"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M4 9v6h4l5 5V4L8 9H4zm11.5 3a3.5 3.5 0 0 0-2-3.16v6.32a3.5 3.5 0 0 0 2-3.16z"
          />
        </svg>
      </button>
    </div>
    <p
      v-if="card.ipa"
      class="mt-1 text-sm text-gray-500"
    >
      {{ card.ipa }}
    </p>

    <template v-if="showAnswer">
      <p class="mt-4 text-base text-black">{{ card.backAnswer }}</p>

      <ul
        v-if="card.examples.length > 0"
        class="mt-4 space-y-1"
      >
        <li
          v-for="(example, index) in card.examples"
          :key="index"
          class="text-sm text-gray-600"
        >
          “{{ example }}”
        </li>
      </ul>
    </template>
    <button
      v-else
      type="button"
      class="mt-4 rounded border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-black hover:text-black"
      @pointerdown.stop
      @click.stop="revealAnswer"
    >
      Show Answer
    </button>

    <PartsOfSpeechDisplay
      v-if="card.partsOfSpeech && card.partsOfSpeech.length > 0"
      :entries="card.partsOfSpeech"
      :view-mode="viewMode"
      :front-title="card.frontTitle"
      :interactive="interactive"
      class="mt-4"
    />

    <div
      v-if="cardTags.length > 0"
      class="mt-4 flex flex-wrap gap-2"
    >
      <span
        v-for="tag in cardTags"
        :key="tag.id"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-0.5 text-xs text-gray-700"
      >
        <span
          class="h-2 w-2 rounded-full"
          :style="{ backgroundColor: tag.color }"
        />
        {{ tag.name }}
      </span>
    </div>

    <button
      v-if="card.hint"
      type="button"
      class="mt-4 rounded border border-gray-300 px-3 py-2 text-left text-sm text-gray-600 hover:border-black"
      @pointerdown.stop
      @click.stop="toggleHint"
    >
      <span class="font-medium text-black">Hint:</span>
      {{ isHintRevealed ? card.hint : 'Tap to reveal' }}
    </button>

    <button
      v-if="imageUrl"
      type="button"
      class="mt-4 overflow-hidden rounded border border-gray-300 transition-[height]"
      :class="isImageExpanded ? 'h-56' : 'h-24'"
      @pointerdown.stop
      @click.stop="toggleImage"
    >
      <img
        :src="imageUrl"
        alt="Card image"
        draggable="false"
        class="h-full w-full object-cover"
      />
    </button>
  </div>
</template>
