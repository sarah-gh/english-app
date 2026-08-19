<script setup lang="ts">
import Swiper, { type Swiper as SwiperType } from 'swiper';
import type { SwiperOptions } from 'swiper/types';
import EffectTinder from './effect-tinder.esm.js';
import 'swiper/css';
import { onMounted, ref, watch, provide } from 'vue';
import { useGeneralStore } from '@/stores/general-store.js';
import { useElementSize } from '@vueuse/core';
import UButtonLink from '@/components/app/button/UButtonLink.vue';

const emit = defineEmits<{
  (e: 'swipe', direction: 'dislike' | 'like', target_id: string): void;
  (e: 'set-new-filters'): void;
}>();

const topCardIndex = ref(0);
provide('topCardIndex', topCardIndex);

onMounted(() => {
  new Swiper('.swiper', {
    modules: [EffectTinder],
    effect: 'tinder',
    grabCursor: true,
    speed: 600,
    on: {
      tinderSwipe(swiper: SwiperType, direction: string) {
        // Check if there are slides available
        if (swiper.slides.length <= 1) return;

        const currentSlide = swiper.slides[swiper.realIndex - 1];
        if (!currentSlide) return;

        const cardId = currentSlide.querySelector('[data-card-id]')?.getAttribute('data-card-id');
        if (!cardId) return;

        if (direction === 'left') {
          emit('swipe', 'dislike', cardId);
        } else {
          emit('swipe', 'like', cardId);
        }

        // Update top card index after swipe
        topCardIndex.value = swiper.realIndex;
      },
      slideChange(swiper: SwiperType) {
        // Update top card index on slide change
        topCardIndex.value = swiper.realIndex;
      },
      init(swiper: SwiperType) {
        // Initialize top card index
        topCardIndex.value = swiper.realIndex;
      },
    } as SwiperOptions['on'],
  });
});

const swiperWrapperRef = ref<HTMLDivElement | null>(null);

const { height: swiperWrapperHeight } = useElementSize(swiperWrapperRef);

const generalStore = useGeneralStore();

watch(swiperWrapperHeight, (height) => {
  generalStore.cardHeight = height;
});
</script>

<template>
  <div class="swiper z-10! mb-20! flex! h-full! w-full! grow! flex-col! px-4!">
    <div
      ref="swiperWrapperRef"
      class="swiper-wrapper z-10! h-px! grow!"
    >
      <slot />
      <div
        class="swiper-slide flex! flex-col items-center justify-center rounded-xl border border-slate-300 bg-gray-100"
      >
        <p class="txt-s-r mb-4 text-slate-500">There are no recommendations to display.</p>
        <UButtonLink
          size="14"
          variant="mono"
          @click="$emit('set-new-filters')"
        >
          Set New Filters
        </UButtonLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swiper {
  --swiper-tinder-no-color: #dc2626;
  --swiper-tinder-yes-color: #1bc073;
  --swiper-tinder-label-text-color: #fff;
  --swiper-tinder-label-font-size: 20px;
  --swiper-tinder-button-size: 56px;
  --swiper-tinder-button-icon-size: 32px;
}
.swiper-tinder .swiper-slide {
  overflow: hidden;
}
</style>
