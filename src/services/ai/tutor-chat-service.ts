import { cardRepository, deckRepository } from '@/db/repositories';
import type { ChatMessage } from '@/types/chat-message';
import type { AppSettings, ConcreteAiProvider } from '@/types/settings';
import { callAihubmixChat } from './aihubmix-client';
import { AiProviderError, AiServiceError } from './errors';
import { callGoogleChat, type GeminiChatTurn } from './google-client';
import { callOpenAiCompatibleChat } from './openai-compatible-client';
import {
  buildChatCompletionMessages,
  buildTutorSystemPrompt,
  buildVocabularySummary,
  selectHistoryWindow,
} from './tutor-chat-prompt-builder';
import { withProviderFallback } from './with-provider-fallback';

/** A little looser than the providers' defaults, so practice sentences don't repeat verbatim. */
const TUTOR_CHAT_TEMPERATURE = 0.7;

/** Arabic-script range, covering Persian letters. Used to enforce the English-only rule on the
 *  reply itself, since a prompt instruction alone is a request, not a guarantee. */
const NON_ENGLISH_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const ENGLISH_ONLY_REMINDER =
  'Your previous reply contained non-English text. Reply again strictly in English only, with no non-English words, glosses, or transliterations.';

/** Reads the user's cards/decks straight from IndexedDB (not the in-memory stores, which may not
 *  have been loaded on this route) and builds the personalized system prompt for one send. */
export async function buildTutorSystemPromptFromDb(settings: AppSettings): Promise<string> {
  const [cards, decks] = await Promise.all([cardRepository.getAll(), deckRepository.getAll()]);
  return buildTutorSystemPrompt(buildVocabularySummary(cards, decks), settings.proficiencyLevel);
}

function toGeminiTurns(history: ChatMessage[]): GeminiChatTurn[] {
  return history.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    text: message.content,
  }));
}

function requireText(provider: ConcreteAiProvider, text: string | undefined): string {
  const trimmed = text?.trim();
  if (!trimmed) throw new AiProviderError(provider, 'The AI returned an empty reply.', true);
  return trimmed;
}

async function requestReply(
  settings: AppSettings,
  systemPrompt: string,
  history: ChatMessage[],
): Promise<string> {
  const messages = buildChatCompletionMessages(systemPrompt, history);
  const turns = toGeminiTurns(history);

  return withProviderFallback(settings, {
    google: async (apiKey) =>
      requireText('google', await callGoogleChat(apiKey, systemPrompt, turns, TUTOR_CHAT_TEMPERATURE)),
    groq: async (apiKey, baseUrl, model) =>
      requireText(
        'groq',
        await callOpenAiCompatibleChat('groq', apiKey, baseUrl, model, messages, TUTOR_CHAT_TEMPERATURE),
      ),
    openrouter: async (apiKey, baseUrl, model) =>
      requireText(
        'openrouter',
        await callOpenAiCompatibleChat(
          'openrouter',
          apiKey,
          baseUrl,
          model,
          messages,
          TUTOR_CHAT_TEMPERATURE,
        ),
      ),
    aihubmix: async (apiKey, baseUrl) =>
      requireText(
        'aihubmix',
        await callAihubmixChat(apiKey, baseUrl, systemPrompt, turns, TUTOR_CHAT_TEMPERATURE),
      ),
  });
}

/**
 * Gets the tutor's next reply to `conversation` (oldest-first, ending with the user's new
 * message). The vocabulary context is re-read from IndexedDB on every call so a card added
 * mid-conversation is immediately known to the tutor, and only the last `MAX_HISTORY_MESSAGES`
 * turns are sent. A reply containing Persian/Arabic script is re-requested once with an explicit
 * English-only reminder; if it still isn't English, the send fails rather than showing it.
 */
export async function getTutorReply(
  settings: AppSettings,
  conversation: ChatMessage[],
): Promise<string> {
  const systemPrompt = await buildTutorSystemPromptFromDb(settings);
  const history = selectHistoryWindow(conversation);

  const reply = await requestReply(settings, systemPrompt, history);
  if (!NON_ENGLISH_SCRIPT.test(reply)) return reply;

  const retry = await requestReply(settings, `${systemPrompt}\n\n${ENGLISH_ONLY_REMINDER}`, history);
  if (!NON_ENGLISH_SCRIPT.test(retry)) return retry;

  throw new AiServiceError('The tutor replied in a language other than English. Please try again.');
}
