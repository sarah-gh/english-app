import { defineStore } from 'pinia';
import { ref } from 'vue';
import { topicRepository } from '@/db/repositories';
import { useCardStore } from '@/stores/card-store';
import type { NewTopic, Topic, TopicUpdate } from '@/types/topic';

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

  async function edit(id: string, changes: TopicUpdate): Promise<void> {
    await topicRepository.update(id, changes);
    const topic = getById(id);
    if (topic) Object.assign(topic, changes);
  }

  /** Deletes the topic and unassigns it from every card in the card store's cache too. */
  async function remove(id: string): Promise<void> {
    await topicRepository.delete(id);
    topics.value = topics.value.filter((topic) => topic.id !== id);

    const cardStore = useCardStore();
    for (const card of cardStore.cards) {
      if (card.topicId === id) card.topicId = undefined;
    }
  }

  return { topics, isLoaded, fetchAll, ensureLoaded, getById, byDeck, add, edit, remove };
});
