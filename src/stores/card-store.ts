import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { cardRepository } from '@/db/repositories';
import { useTopicStore } from '@/stores/topic-store';
import type { Card, CardUpdate, NewCard, ReviewStatus } from '@/types/card';

export const useCardStore = defineStore('cards', () => {
  // `shallowRef` instead of a deep `ref`: with 1,000+ cards, deep reactivity means every field of
  // every card gets proxy-wrapped as soon as something reads it (e.g. filtering the All Cards
  // list), which is the main cost behind that page's jank. A shallow ref only reacts to `cards`
  // being reassigned wholesale, so in-place mutators below (`edit`, `setReviewStatus`, etc.) mutate
  // the found card object directly, exactly as before, then reassign `cards.value` to a new array
  // (same element references) purely to fire that top-level notification.
  const cards = shallowRef<Card[]>([]);
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

  /** A card left without an explicit topic falls back to its deck's "General" topic (created on
   *  demand) instead of staying topic-less, so it's never orphaned in deck/topic browsing. */
  async function resolveTopicId(deckId: string, topicId: string | undefined): Promise<string> {
    if (topicId) return topicId;
    const general = await useTopicStore().ensureGeneral(deckId);
    return general.id;
  }

  async function add(card: NewCard): Promise<Card> {
    const topicId = await resolveTopicId(card.deckId, card.topicId);
    const created = await cardRepository.create({ ...card, topicId });
    // Newest-first: a freshly created card is the newest by definition, so it belongs at the front.
    cards.value.unshift(created);
    return created;
  }

  /** Used by bulk import (e.g. Excel), adds many cards in one go, newest-first. */
  async function addMany(newCards: NewCard[]): Promise<Card[]> {
    const resolved: NewCard[] = [];
    for (const card of newCards) {
      resolved.push({ ...card, topicId: await resolveTopicId(card.deckId, card.topicId) });
    }
    const created = await cardRepository.createMany(resolved);
    cards.value = [...created, ...cards.value];
    return created;
  }

  async function edit(id: string, changes: CardUpdate): Promise<void> {
    await cardRepository.update(id, changes);
    const card = getById(id);
    if (card) {
      Object.assign(card, changes, { updatedAt: Date.now() });
      cards.value = [...cards.value];
    }
  }

  async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
    await cardRepository.setReviewStatus(id, status);
    const card = getById(id);
    if (card) {
      card.reviewStatus = status;
      cards.value = [...cards.value];
    }
  }

  async function incrementStudyCount(id: string): Promise<void> {
    await cardRepository.incrementStudyCount(id);
    const card = getById(id);
    if (card) {
      card.studyCount += 1;
      cards.value = [...cards.value];
    }
  }

  /** Rolls back one `incrementStudyCount`, see the repository method's doc comment. */
  async function decrementStudyCount(id: string): Promise<void> {
    await cardRepository.decrementStudyCount(id);
    const card = getById(id);
    if (card) {
      card.studyCount = Math.max(0, card.studyCount - 1);
      cards.value = [...cards.value];
    }
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
    cards.value = [...cards.value];
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
    incrementStudyCount,
    decrementStudyCount,
    recordMatchResult,
    remove,
  };
});
