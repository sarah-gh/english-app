<script setup lang="ts">
import { useGeneralStore } from '@/stores/general-store';
import { computed, inject, ref } from 'vue';

const generalStore = useGeneralStore();

// Get the index of the card in the carousel
const props = defineProps<{
  index?: number;
}>();

// Get the current top card index from the parent component
const topCardIndex = inject('topCardIndex', ref(0));

// Determine if this card is the top card
const isTopCard = computed(() => {
  return props.index !== undefined && props.index === topCardIndex.value;
});
</script>

<template>
  <div
    class="swiper-slide min-h-full overflow-y-auto rounded-xl border-2 border-slate-300 bg-white"
    :style="{ height: `${generalStore.cardHeight}px` }"
  >
    <slot :is-top-card="isTopCard" />
    <div>
      <div class="swiper-tinder-label swiper-tinder-label-yes">Like</div>
      <div class="swiper-tinder-label swiper-tinder-label-no">Dislike</div>
    </div>
  </div>
</template>

<style scoped>
.swiper-tinder-label {
  position: absolute;
  font-size: var(--swiper-tinder-label-font-size);
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  opacity: 0;
  color: var(--swiper-tinder-label-text-color);
}
.swiper-tinder-label-yes {
  left: 3%;
  top: 7%;
  transform: rotate(-20deg);
  background-color: var(--swiper-tinder-yes-color);
  transform-origin: right top;
}
.swiper-tinder-label-no {
  right: 3%;
  top: 7%;
  transform: rotate(20deg);
  background-color: var(--swiper-tinder-no-color);
  transform-origin: left top;
}
</style>
