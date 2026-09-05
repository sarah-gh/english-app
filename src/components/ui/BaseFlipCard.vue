<script setup lang="ts">
withDefaults(
  defineProps<{
    flipped: boolean;
    /** false only for the non-interactive "peek" card behind the active one in the review stack —
     *  disables tapping the revealed back face to flip it closed again. */
    interactive?: boolean;
  }>(),
  { interactive: true },
);

const emit = defineEmits<{
  'update:flipped': [value: boolean];
}>();
</script>

<template>
  <div class="flip-perspective">
    <div
      class="flip-inner"
      :class="{ 'is-flipped': flipped }"
    >
      <div class="flip-face">
        <slot name="front" />
      </div>
      <div
        class="flip-face flip-face-back"
        @pointerdown.stop
        @click.stop="interactive && emit('update:flipped', false)"
      >
        <slot name="back" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-perspective {
  perspective: 1000px;
}

/* Both faces are stacked in the same grid cell instead of absolutely positioned, so the grid row
 * sizes itself to the taller of the two — the front trigger and the back content rarely match in
 * height, and absolute positioning would clip whichever face is taller to the shorter one's box. */
.flip-inner {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 0.5s ease-in-out;
}

.flip-inner.is-flipped {
  transform: rotateY(180deg);
}

.flip-face {
  grid-area: 1 / 1;
  min-width: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-face-back {
  transform: rotateY(180deg);
}

/* Only pointer-events is toggled here — never `visibility` or `display`. Both would apply the
 * instant the `is-flipped` class changes (neither is part of the animated `transform` transition),
 * hiding the front face at the very start of the click instead of letting `backface-visibility`
 * fade it out naturally as the rotation crosses 90deg mid-animation. */
.flip-inner:not(.is-flipped) .flip-face-back {
  pointer-events: none;
}

.flip-inner.is-flipped .flip-face:not(.flip-face-back) {
  pointer-events: none;
}
</style>
