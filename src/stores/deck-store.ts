import { defineStore } from 'pinia';
import { ref } from 'vue';
import { deckRepository } from '@/db/repositories';
import { useCardStore } from '@/stores/card-store';
import type { Deck, DeckUpdate, NewDeck } from '@/types/deck';

export const useDeckStore = defineStore('decks', () => {
  const decks = ref<Deck[]>([]);
  const isLoaded = ref(false);

  async function fetchAll(): Promise<void> {
    decks.value = await deckRepository.getAll();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  function getById(id: string): Deck | undefined {
    return decks.value.find((deck) => deck.id === id);
  }

  async function add(deck: NewDeck): Promise<Deck> {
    const created = await deckRepository.create(deck);
    decks.value.push(created);
    decks.value.sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  async function edit(id: string, changes: DeckUpdate): Promise<void> {
    await deckRepository.update(id, changes);
    const deck = getById(id);
    if (deck) Object.assign(deck, changes);
  }

  /** Deletes the deck and cascades to remove its cards from the card store's cache too. */
  async function remove(id: string): Promise<void> {
    await deckRepository.delete(id);
    decks.value = decks.value.filter((deck) => deck.id !== id);

    const cardStore = useCardStore();
    cardStore.cards = cardStore.cards.filter((card) => card.deckId !== id);
  }

  return { decks, isLoaded, fetchAll, ensureLoaded, getById, add, edit, remove };
});
