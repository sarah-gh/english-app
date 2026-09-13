import { interpolatePrompt, resolveActivePromptTemplate } from './prompt-registry';
import type { AppSettings } from '@/types/settings';

/**
 * Builds a prompt asking the AI to fill in every remaining field of a flashcard from just its
 * front title (and, if picked, the deck it's going into as a topic hint). Uses the user's custom
 * "CARD_AUTOFILL" prompt template from Settings when they've saved one, otherwise the built-in
 * default (see `prompt-registry.ts`).
 */
export function buildCardAutofillPrompt(
  settings: AppSettings,
  title: string,
  deckName?: string,
): string {
  const deckNameHint = deckName
    ? ` The card is going into the "${deckName}" deck, use that as a hint for the topic.`
    : '';
  const userLevel = settings.proficiencyLevel ?? '';
  const userLevelHint = userLevel
    ? ` The learner's self-assessed English level is ${userLevel} (CEFR); keep vocabulary and explanations calibrated to that level.`
    : '';

  const template = resolveActivePromptTemplate(settings.customPrompts, 'CARD_AUTOFILL');
  return interpolatePrompt(template, {
    frontTitle: title,
    deckName: deckName ?? '',
    deckNameHint,
    userLevel,
    userLevelHint,
  });
}
