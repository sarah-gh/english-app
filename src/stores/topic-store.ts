import { defineStore } from 'pinia';
import { ref } from 'vue';
import { topicRepository } from '@/db/repositories';
import { useCardStore } from '@/stores/card-store';
import { GENERAL_TOPIC_NAME, type NewTopic, type Topic, type TopicUpdate } from '@/types/topic';

export const useTopicStore = defineStore('topics', () => {
  const topics = ref<Topic[]>([]);
  const isLoaded = ref(false);

  async function fetchAll(): Promise<void> {
    topics.value = await topicRepository.getAll();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  function getById(id: string): Topic | undefined {
    return topics.value.find((topic) => topic.id === id);
  }

  function byDeck(deckId: string): Topic[] {
    return topics.value.filter((topic) => topic.deckId === deckId);
  }

  async function add(topic: NewTopic): Promise<Topic> {
    const created = await topicRepository.create(topic);
    topics.value.push(created);
    topics.value.sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  function isGeneral(topic: Topic): boolean {
    return topic.name.trim().toLowerCase() === GENERAL_TOPIC_NAME.toLowerCase();
  }

  /** Returns the deck's "General" topic — the fallback every card without an explicit topic is
   *  assigned to — creating one if the deck doesn't already have one, so a deck (and any card
   *  inside it) is never left without somewhere to land. */
  async function ensureGeneral(deckId: string): Promise<Topic> {
    await ensureLoaded();
    const existing = byDeck(deckId).find(isGeneral);
    return existing ?? add({ deckId, name: GENERAL_TOPIC_NAME });
  }

  async function edit(id: string, changes: TopicUpdate): Promise<void> {
    await topicRepository.update(id, changes);
    const topic = getById(id);
    if (topic) Object.assign(topic, changes, { updatedAt: Date.now() });
  }

  /** Deletes the topic and reassigns every card that referenced it to the deck's "General" topic
   *  (creating one if needed — even if the deleted topic was itself "General") instead of leaving
   *  them topic-less. */
  async function remove(id: string): Promise<void> {
    const topic = getById(id);

    await topicRepository.delete(id);
    topics.value = topics.value.filter((t) => t.id !== id);
    if (!topic) return;

    const cardStore = useCardStore();
    const orphanedCards = cardStore.cards.filter((card) => card.topicId === id);
    if (orphanedCards.length === 0) return;

    const general = await ensureGeneral(topic.deckId);
    await Promise.all(orphanedCards.map((card) => cardStore.edit(card.id, { topicId: general.id })));
  }

  return { topics, isLoaded, fetchAll, ensureLoaded, getById, byDeck, add, isGeneral, ensureGeneral, edit, remove };
});
