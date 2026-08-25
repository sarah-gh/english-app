<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import PartsOfSpeechDisplay from '@/components/card/PartsOfSpeechDisplay.vue';
import WordFamilyDisplay from '@/components/card/WordFamilyDisplay.vue';
import BaseExpandableContent from '@/components/ui/BaseExpandableContent.vue';
import BaseTag from '@/components/ui/BaseTag.vue';
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
    /** Gates only the drag-to-assess gesture (and the Known/Not Known fly-away it triggers),
     *  independently of `interactive` — Study mode keeps audio/hint/image interactions live but
     *  has no Known/Not Known assessment, so its card must not respond to swipe drags. */
    swipeEnabled?: boolean;
    viewMode?: CardViewMode;
  }>(),
  {
    swipeEnabled: true,
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

type WordFamilyPos = 'noun' | 'verb' | 'adjective' | 'adverb';
const WORD_FAMILY_POS_LABELS: Record<WordFamilyPos, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
};

function pickWordFamilyChallengeForm(card: Card): WordFamilyPos | null {
  const wordFamily = card.wordFamily;
  if (!wordFamily) return null;
  const available = (['noun', 'verb', 'adjective', 'adverb'] as WordFamilyPos[]).filter(
    (pos) => wordFamily[pos]?.word,
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/** Picked once when this card instance is created (the wrapping `ReviewCard` remounts fresh per
 *  card via `:key`, so this stays stable across reveals but varies from card to card) — the
 *  Practice-mode "Form Challenge" asks about this one form before revealing the rest. */
const wordFamilyChallengeForm = pickWordFamilyChallengeForm(props.card);

/** Study mode always shows the answer; Practice mode conceals it until the Show Answer button
 *  is tapped explicitly — tapping elsewhere on the card, or starting a swipe drag, must not
 *  reveal it. */
const showAnswer = computed(() => props.viewMode === 'study' || isAnswerManuallyRevealed.value);

function revealAnswer() {
  isAnswerManuallyRevealed.value = true;
}

let activePointerId: number | null = null;
let startX = 0;

function onPointerDown(event: PointerEvent) {
  if (!props.interactive || !props.swipeEnabled || isFlying.value) return;
  activePointerId = event.pointerId;
  startX = event.clientX;
  isDragging.value = true;
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
  if (!props.swipeEnabled || isFlying.value) return;
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
    class="relative flex h-full w-full touch-none flex-col overflow-y-auto rounded-xl border-2 border-text/10 bg-background p-5 select-none"
    :style="cardStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @transitionend="onTransitionEnd"
  >
    <div
      class="pointer-events-none absolute top-4 left-4 rounded border-2 border-text/20 bg-danger px-3 py-1 text-sm font-bold text-white uppercase shadow-md"
      :style="{ opacity: leftLabelOpacity }"
    >
      Not Known
    </div>
    <div
      class="pointer-events-none absolute top-4 right-4 rounded border-2 border-text/20 bg-green-500 px-3 py-1 text-sm font-bold text-white uppercase shadow-md"
      :style="{ opacity: rightLabelOpacity }"
    >
      Known
    </div>

    <div class="flex items-start justify-between gap-2">
      <h2 class="text-xl font-semibold text-text">{{ card.frontTitle }}</h2>
      <button
        type="button"
        aria-label="Play pronunciation"
        class="shrink-0 rounded-full border border-primary p-2 text-primary hover:bg-primary hover:text-background"
        @pointerdown.stop
        @click.stop="playAudio"
      >
        <AppIcon
          icon-name="VolumeHigh"
          :size="18"
        />
      </button>
    </div>
    <p
      v-if="card.ipa"
      class="mt-1 text-sm text-text/50"
    >
      {{ card.ipa }}
    </p>

    <BaseExpandableContent :max-height="280">
      <template v-if="card.wordFamily">
        <WordFamilyDisplay
          v-if="showAnswer"
          :data="card.wordFamily"
          :highlight="wordFamilyChallengeForm ?? undefined"
          class="mt-4"
        />
        <button
          v-else
          type="button"
          class="mt-4 rounded border-2 border-dashed border-text/20 py-3 text-sm font-medium text-text/50 hover:border-primary hover:text-primary"
          @pointerdown.stop
          @click.stop="revealAnswer"
        >
          <template v-if="wordFamilyChallengeForm">
            What is the {{ WORD_FAMILY_POS_LABELS[wordFamilyChallengeForm] }} form of
            “{{ card.wordFamily.rootWord }}”?
          </template>
          <template v-else>Show Word Family</template>
        </button>
      </template>
      <template v-else>
        <template v-if="showAnswer">
          <p class="mt-4 text-base text-text">{{ card.backAnswer }}</p>

          <ul
            v-if="card.examples.length > 0"
            class="mt-4 space-y-1"
          >
            <li
              v-for="(example, index) in card.examples"
              :key="index"
              class="text-sm text-text/60"
            >
              “{{ example }}”
            </li>
          </ul>
        </template>
        <button
          v-else
          type="button"
          class="mt-4 rounded border-2 border-dashed border-text/20 py-3 text-sm font-medium text-text/50 hover:border-primary hover:text-primary"
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
      </template>
    </BaseExpandableContent>

    <div
      v-if="cardTags.length > 0"
      class="mt-4 flex flex-wrap gap-2"
    >
      <BaseTag
        v-for="tag in cardTags"
        :key="tag.id"
        :label="tag.name"
        :color="tag.color"
      />
    </div>

    <button
      v-if="card.hint"
      type="button"
      class="mt-4 rounded border border-text/20 px-3 py-2 text-left text-sm text-text/60 hover:border-primary"
      @pointerdown.stop
      @click.stop="toggleHint"
    >
      <span class="font-medium text-text">Hint:</span>
      {{ isHintRevealed ? card.hint : 'Tap to reveal' }}
    </button>

    <button
      v-if="imageUrl"
      type="button"
      class="mt-4 overflow-hidden rounded border border-text/20 transition-[height]"
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
