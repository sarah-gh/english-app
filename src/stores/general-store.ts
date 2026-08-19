import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGeneralStore = defineStore('general', () => {
  const cardHeight = ref(0);

  return { cardHeight };
});
