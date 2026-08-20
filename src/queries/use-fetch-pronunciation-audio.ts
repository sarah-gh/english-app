import { useMutation } from '@tanstack/vue-query';
import { dictionaryAudioService } from '@/services/audio/dictionary-audio.service';
import { queryKeys } from './query-keys';

/** Fetching pronunciation audio is triggered on demand by a button click and writes straight
 *  into the card draft — a mutation, not a cached/subscribed query. */
export function useFetchPronunciationAudio() {
  return useMutation({
    mutationKey: queryKeys.pronunciation.all,
    mutationFn: (word: string) => dictionaryAudioService.fetchPronunciation(word),
  });
}
