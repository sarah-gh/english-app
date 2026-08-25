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

  function byTopic(topicId: string): Card[] {
    return cards.value.filter((card) => card.topicId === topicId);
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

  /** Used by bulk import (e.g. Excel) — adds many cards in one go, newest-first. */
  async function addMany(newCards: NewCard[]): Promise<Card[]> {
    const created = await cardRepository.createMany(newCards);
    cards.value = [...created, ...cards.value];
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

  /** Records a mini matching-quiz outcome for one card and syncs the cache's `reviewStats`. */
  async function recordMatchResult(id: string, success: boolean): Promise<void> {
    await cardRepository.recordMatchResult(id, success);
    const card = getById(id);
    if (!card) return;

    card.reviewStats = {
      timesReviewed: card.reviewStats.timesReviewed + 1,
      lastReviewedAt: Date.now(),
      successfulMatches: card.reviewStats.successfulMatches + (success ? 1 : 0),
      failedMatches: card.reviewStats.failedMatches + (success ? 0 : 1),
    };
  }

  return {
    cards,
    isLoaded,
    fetchAll,
    ensureLoaded,
    getById,
    byDeck,
    byTopic,
    byTag,
    byReviewStatus,
    add,
    addMany,
    edit,
    setReviewStatus,
    recordMatchResult,
    remove,
  };
});
