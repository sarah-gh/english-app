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

const rightOverlayProgress = computed(() =>
  Math.min(Math.max(offsetX.value / SWIPE_THRESHOLD, 0), 1),
);
const leftOverlayProgress = computed(() =>
  Math.min(Math.max(-offsetX.value / SWIPE_THRESHOLD, 0), 1),
);

function overlayStyle(progress: number) {
  return {
    opacity: progress,
    transform: `scale(${0.7 + progress * 0.3})`,
  };
}

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
    class="relative flex h-full w-full touch-none flex-col overflow-hidden rounded-2xl border border-card-gold/30 bg-card-surface select-none"
    :style="cardStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @transitionend="onTransitionEnd"
  >
    <!-- Vintage double-line frame: an inset hairline plus four corner accents. Pinned directly to
         the non-scrolling root, above the scrollable body (z-20), so it never shifts, clips, or
         gets crossed by the body's own scrollbar as it scrolls. -->
    <div class="pointer-events-none absolute inset-2 z-20 rounded-xl border border-card-gold/20" />
    <span class="pointer-events-none absolute top-3 left-3 z-20 h-4 w-4 rounded-tl border-t border-l border-card-gold/60" />
    <span class="pointer-events-none absolute top-3 right-3 z-20 h-4 w-4 rounded-tr border-t border-r border-card-gold/60" />
    <span class="pointer-events-none absolute bottom-3 left-3 z-20 h-4 w-4 rounded-bl border-b border-l border-card-gold/60" />
    <span class="pointer-events-none absolute right-3 bottom-3 z-20 h-4 w-4 rounded-br border-r border-b border-card-gold/60" />

    <div
      class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      :style="overlayStyle(leftOverlayProgress)"
    >
      <div class="flex h-24 w-24 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
        <AppIcon
          icon-name="CloseCircle"
          :size="64"
          type="bold"
        />
      </div>
    </div>
    <div
      class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      :style="overlayStyle(rightOverlayProgress)"
    >
      <div class="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
        <AppIcon
          icon-name="TickCircle"
          :size="64"
          type="bold"
        />
      </div>
    </div>

    <!-- Scrollable body, decoupled from the frame/corner accents above so long content scrolls
         underneath them instead of dragging them along or clipping them. Inset by `mx-1 my-3`
         (on top of its own padding) so the body's own edge — and its scrollbar — never sits flush
         against the gold inset line, which is what let content/scrollbar visually cross it. -->
    <div class="card-scroll relative z-10 mx-3 my-3 min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div class="flex items-start justify-between gap-3">
        <h2 class="font-serif text-3xl font-semibold text-card-gold">{{ card.frontTitle }}</h2>
        <button
          type="button"
          aria-label="Play pronunciation"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-card-gold/40 bg-linear-to-b from-card-definition to-card-surface text-primary shadow-[0_2px_6px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] transition hover:brightness-110"
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
        class="text-sm text-card-muted"
      >
        {{ card.ipa }}
      </p>

      <div class="mt-3 border-t border-card-gold/20" />

      <BaseExpandableContent
        :max-height="280"
        fade-class="from-card-surface via-card-surface/80"
      >
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
            class="mt-4 rounded border-2 border-dashed border-card-gold/30 py-3 text-sm font-medium text-card-muted hover:border-primary hover:text-primary"
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
            <div class="mt-4 rounded-xl bg-card-definition p-4">
              <p class="text-base leading-relaxed text-text">{{ card.backAnswer }}</p>
            </div>

            <ul
              v-if="card.examples.length > 0"
              class="mt-4 space-y-2"
            >
              <li
                v-for="(example, index) in card.examples"
                :key="index"
                class="text-base text-text/90"
              >
                {{ example }}
              </li>
            </ul>

            <p
              v-if="card.synonyms.length > 0"
              class="mt-4 text-sm text-text/80"
            >
              <span class="font-semibold text-card-gold">Synonyms:</span> {{ card.synonyms.join(', ') }}
            </p>
            <p
              v-if="card.antonyms.length > 0"
              class="mt-1 text-sm text-text/80"
            >
              <span class="font-semibold text-card-gold">Antonyms:</span> {{ card.antonyms.join(', ') }}
            </p>
          </template>
          <button
            v-else
            type="button"
            class="mt-4 rounded border-2 border-dashed border-card-gold/30 py-3 text-sm font-medium text-card-muted hover:border-primary hover:text-primary"
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
        class="mt-4 rounded border border-card-gold/30 px-3 py-2 text-left text-sm text-card-muted hover:border-primary"
        @pointerdown.stop
        @click.stop="toggleHint"
      >
        <span class="font-medium text-card-gold">Hint:</span>
        {{ isHintRevealed ? card.hint : 'Tap to reveal' }}
      </button>

      <button
        v-if="imageUrl"
        type="button"
        class="mt-4 overflow-hidden rounded border border-card-gold/30 transition-[height]"
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
  </div>
</template>

<style scoped>
/* Keeps the scrollable body's own scrollbar slender and inset within the gold frame instead of
 * the app-wide 10px scrollbar (see main.css), which was wide/flush enough to visually cross the
 * frame's inset border line. */
.card-scroll {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-card-gold) 55%, transparent) transparent;
}

.card-scroll::-webkit-scrollbar {
  width: 6px;
}

.card-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.card-scroll::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--color-card-gold) 55%, transparent);
  border-radius: 999px;
}
</style>
