import { defineStore } from 'pinia';
import { ref } from 'vue';
import { cardRepository } from '@/db/repositories';
import type { Card, CardUpdate, NewCard, ReviewStatus } from '@/types/card';

export const useCardStore = defineStore('cards', () => {
  const cards = ref<Card[]>([]);
  const isLoaded = ref(false);

  async function fetchAll(): Promise<void> {
    cards.value = await cardRepository.getAll();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  function getById(id: string): Card | undefined {
    return cards.value.find((card) => card.id === id);
  }

  function byDeck(deckId: string): Card[] {
    return cards.value.filter((card) => card.deckId === deckId);
  }

  function byTag(tagId: string): Card[] {
    return cards.value.filter((card) => card.tagIds.includes(tagId));
  }

  function byReviewStatus(status: ReviewStatus): Card[] {
    return cards.value.filter((card) => card.reviewStatus === status);
  }

  async function add(card: NewCard): Promise<Card> {
    const created = await cardRepository.create(card);
    // Newest-first: a freshly created card is the newest by definition, so it belongs at the front.
    cards.value.unshift(created);
    return created;
  }

  async function edit(id: string, changes: CardUpdate): Promise<void> {
    await cardRepository.update(id, changes);
    const card = getById(id);
    if (card) Object.assign(card, changes, { updatedAt: Date.now() });
  }

  async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
    await cardRepository.setReviewStatus(id, status);
    const card = getById(id);
    if (card) card.reviewStatus = status;
  }

  async function remove(id: string): Promise<void> {
    await cardRepository.delete(id);
    cards.value = cards.value.filter((card) => card.id !== id);
  }

  return {
    cards,
    isLoaded,
    fetchAll,
    ensureLoaded,
    getById,
    byDeck,
    byTag,
    byReviewStatus,
    add,
    edit,
    setReviewStatus,
    remove,
  };
});
