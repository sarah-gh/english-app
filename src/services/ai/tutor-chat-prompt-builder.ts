import type { Card } from '@/types/card';
import type { ChatMessage } from '@/types/chat-message';
import type { Deck } from '@/types/deck';
import type { ProficiencyLevel } from '@/types/settings';
import type { ChatCompletionMessage } from './openai-compatible-client';

/** How many stored messages (user + assistant, so ~6 exchanges) are replayed to the AI on each
 *  send. Older turns stay visible in the chat UI but stop costing tokens. */
export const MAX_HISTORY_MESSAGES = 12;

/** Caps the vocabulary context so a 1,000+ card library can't blow past a provider's per-request
 *  token limit. The newest cards win, they're the ones a learner is most likely working on. */
const MAX_VOCABULARY_ITEMS = 300;

/** Long grammar-pattern titles are trimmed, the tutor only needs enough to recognize the item. */
const MAX_TITLE_LENGTH = 60;

function truncateTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  return trimmed.length > MAX_TITLE_LENGTH ? `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…` : trimmed;
}

/**
 * The lightweight vocabulary payload injected into the tutor's system prompt: only each card's
 * `frontTitle` and its deck name, never definitions/examples. Grouped by deck, so a deck name is
 * written once rather than once per card, e.g.
 *
 *   - Vocabulary: Company | Frown
 *   - Grammar: So vs. Such
 *
 * Expects `cards` newest-first (as `cardRepository.getAll()` returns them). Duplicate titles within
 * a deck are collapsed case-insensitively. Returns `''` when the user has no cards.
 */
export function buildVocabularySummary(cards: Card[], decks: Deck[]): string {
  const deckNameById = new Map(decks.map((deck) => [deck.id, deck.name]));
  const titlesByDeck = new Map<string, string[]>();
  const seen = new Set<string>();
  let count = 0;

  for (const card of cards) {
    if (count >= MAX_VOCABULARY_ITEMS) break;
    const title = truncateTitle(card.frontTitle);
    if (!title) continue;
    const deckName = deckNameById.get(card.deckId) ?? 'Uncategorized';
    const key = `${deckName}::${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const titles = titlesByDeck.get(deckName);
    if (titles) titles.push(title);
    else titlesByDeck.set(deckName, [title]);
    count++;
  }

  return [...titlesByDeck]
    .map(([deckName, titles]) => `- ${deckName}: ${titles.join(' | ')}`)
    .join('\n');
}

export function buildTutorSystemPrompt(
  vocabularySummary: string,
  proficiencyLevel: ProficiencyLevel | null,
): string {
  const vocabularySection = vocabularySummary
    ? `You are provided with a reference list of the user's saved vocabulary & grammar items (titles only, grouped as "Deck: item | item"):\n${vocabularySummary}\nUse these words naturally when relevant to personalize explanations, practice sentences, and checks of their understanding. However, you are NOT strictly restricted to this list. If these words are insufficient to explain a concept, express a specific meaning, or maintain a natural conversation, feel free to introduce additional relevant English vocabulary.`
    : 'The user has not saved any vocabulary or grammar items in the app yet. If they ask to practice their saved words, explain that their list is empty and offer general practice instead. Use whatever English vocabulary best fits the conversation.';

  const levelSection = proficiencyLevel
    ? `\nThe user's self-assessed CEFR level is ${proficiencyLevel}. Pitch your vocabulary, sentence length, and explanations at that level.`
    : '';

  return `You are an AI English Tutor. ${vocabularySection}${levelSection}

STRICT LANGUAGE REQUIREMENT: Every reply must be written entirely in English. Never write Persian/Farsi or any other non-English text (no non-English words, glosses, or transliterations), even if the user writes to you in another language or explicitly asks you to. You may translate INTO English, but never out of it.

NATURAL, IDIOMATIC TRANSLATION: When the user asks how to say something in English, writes in another language, or wants a comparison between languages, do NOT force word-for-word or literal translations. Different languages express thoughts through distinct grammatical structures, idioms, and sentence patterns. Always prioritize natural, idiomatic English phrasing, and restructure the sentence so it reflects how native English speakers actually express that idea. When helpful, briefly explain in English why the natural phrasing differs from a literal one (e.g. different word order, a fixed idiom, or a different tense/preposition choice).

Guidelines:
- Be friendly, encouraging, and concise; this is a chat on a phone screen, so prefer short paragraphs and short bullet lists.
- When the user makes a grammar, spelling, or word-choice mistake, point it out briefly and show the corrected version.
- When giving practice exercises, ask one or a few questions at a time and wait for the user's answer before revealing the solution.
- Do not list the user's saved items back to them wholesale; pick a few relevant ones.
- Formatting: plain text with optional **bold**, *italics*, and "- " bullet lists only. No headings, tables, or code blocks.`;
}

/** The most recent `MAX_HISTORY_MESSAGES` user/assistant turns, trimmed so the window starts on a
 *  user message (Gemini rejects a conversation that opens with a model turn, and a reply with no
 *  question in front of it is useless context anyway). */
export function selectHistoryWindow(messages: ChatMessage[]): ChatMessage[] {
  const window = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES);
  const firstUserIndex = window.findIndex((message) => message.role === 'user');
  return firstUserIndex === -1 ? [] : window.slice(firstUserIndex);
}

/** The OpenAI-compatible (Groq/OpenRouter) `messages` array: system prompt first, then history. */
export function buildChatCompletionMessages(
  systemPrompt: string,
  history: ChatMessage[],
): ChatCompletionMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    })),
  ];
}
