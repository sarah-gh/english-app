import { defineStore } from 'pinia';
import { ref } from 'vue';
import { tagRepository } from '@/db/repositories';
import { useCardStore } from '@/stores/card-store';
import type { NewTag, Tag, TagUpdate } from '@/types/tag';

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([]);
  const isLoaded = ref(false);

  async function fetchAll(): Promise<void> {
    tags.value = await tagRepository.getAll();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  function getById(id: string): Tag | undefined {
    return tags.value.find((tag) => tag.id === id);
  }

  async function add(tag: NewTag): Promise<Tag> {
    const created = await tagRepository.create(tag);
    tags.value.push(created);
    tags.value.sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  async function edit(id: string, changes: TagUpdate): Promise<void> {
    await tagRepository.update(id, changes);
    const tag = getById(id);
    if (tag) Object.assign(tag, changes);
  }

  /** Deletes the tag and strips its id from every card in the card store's cache too. */
  async function remove(id: string): Promise<void> {
    await tagRepository.delete(id);
    tags.value = tags.value.filter((tag) => tag.id !== id);

    const cardStore = useCardStore();
    for (const card of cardStore.cards) {
      card.tagIds = card.tagIds.filter((tagId) => tagId !== id);
    }
  }

  return { tags, isLoaded, fetchAll, ensureLoaded, getById, add, edit, remove };
});
