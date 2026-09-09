import type { Card } from '@/types/card';
import type { ProficiencyLevel } from '@/types/settings';
import { stripHtmlToText } from '@/utils/html';

/** Per-CEFR-band calibration rules, shared by every quiz prompt so difficulty is enforced
 *  consistently across generation and grading rather than left to the model's own judgment. */
function cefrBandGuidance(proficiencyLevel: ProficiencyLevel): string {
  if (proficiencyLevel === 'A1' || proficiencyLevel === 'A2') {
    return 'use simple sentence structures, high-frequency everyday vocabulary, and straightforward context sentences; wrong options should be clearly distinguishable rather than subtle near-misses';
  }
  if (proficiencyLevel === 'B1' || proficiencyLevel === 'B2') {
    return 'use moderately complex sentences, contextual nuance, and common idioms/phrasal verbs where natural; wrong options should be plausible distractors that test accurate usage, not obviously wrong choices';
  }
  return 'use sophisticated, native-like language with complex syntax and subtle distinctions in register and collocation; wrong options should be advanced distractors that test precise semantic differences, not surface-level errors';
}

/** Appended to a quiz prompt so generated content strictly matches the learner's configured
 *  target CEFR level instead of defaulting to whatever difficulty the model picks on its own.
 *  Omitted entirely (via an empty string) when the user hasn't set a level, preserving prior
 *  behavior. */
function proficiencyInstruction(proficiencyLevel: ProficiencyLevel | null): string {
  if (!proficiencyLevel) return '';
  return ` STRICT DIFFICULTY REQUIREMENT: the learner's target CEFR English level is ${proficiencyLevel}. Calibrate question complexity, distractors, and context sentences precisely to this level: ${cefrBandGuidance(proficiencyLevel)}. Do not generate content that is easier or harder than ${proficiencyLevel} warrants.`;
}

function summarizeCards(cards: Card[]): string {
  return cards
    .map((card, index) => {
      const lines = [
        `${index + 1}. Term/Question: "${card.frontTitle}"`,
        `   Explanation/Answer: "${stripHtmlToText(card.backAnswer)}"`,
      ];
      if (card.examples.length > 0) {
        lines.push(`   Examples: ${card.examples.map((example) => `"${example}"`).join(' | ')}`);
      }
      if (card.partsOfSpeech && card.partsOfSpeech.length > 0) {
        const posSummary = card.partsOfSpeech
          .map((entry) => {
            const wordForm = entry.wordForm ? `${entry.wordForm}, ` : '';
            return `${entry.pos} (${wordForm}${entry.definition})`;
          })
          .join('; ');
        lines.push(`   Parts of speech: ${posSummary}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Builds a prompt asking for `questionCount` multiple-choice questions grounded in the given
 * flashcards. "sourceIndex" ties each question back to the flashcard (1-based) that inspired it,
 * so it can optionally be saved onto that card afterward.
 */
export function buildMultipleChoiceQuizPrompt(
  cards: Card[],
  questionCount: number,
  proficiencyLevel: ProficiencyLevel | null = null,
): string {
  return `You are creating a multiple-choice practice quiz for an English-language learner based on their personal flashcards below.

Generate exactly ${questionCount} multiple-choice questions that test whether the learner can correctly APPLY each flashcard's term, not just recognize its definition. For every question, invent a brand-new sentence, scenario, or fill-in-the-blank context that does not appear on the card (do not reuse or lightly reword the card's own Explanation/Answer text or its Examples as the question stem). Distribute the questions across the flashcards provided, favoring cards not yet covered before repeating one. Set "sourceIndex" to the flashcard's number (1-based) shown below that a question was drawn from.

Vary the question type across the batch instead of always asking "what does X mean?", mix in formats such as: a fill-in-the-blank sentence where the learner picks the word/form that correctly completes it, a question about which grammatical form is correct in context (using the Parts of speech info when available), and a short scenario where the learner picks which option best fits the situation. Each question must have EXACTLY 4 options in "options", with "correctOptionIndex" as the 0-based index of the correct one. Make the 3 incorrect options plausible distractors, confusable or related terms, common learner mistakes, or near-miss grammatical forms, rather than obviously wrong choices. Ground every question only in the flashcard content provided (do not invent unrelated facts or meanings), but express that content through new wording of your own.

STRICT OPTIONS REQUIREMENT: every question's "options" array must contain exactly 4 entries, and all 4 must be completely distinct strings from one another, character-for-character. Never repeat an option, never output two options that are identical or near-identical restatements of the same word/phrase, and never return fewer than 4 options. Each of the 4 options must represent a genuinely different answer choice.

The correct option MUST be randomly placed among the 4 choices (A, B, C, D / indices 0-3) for every question, independently each time, do not default to placing it first. Across the ${questionCount} questions, spread "correctOptionIndex" roughly evenly over 0, 1, 2, and 3 rather than clustering it on one value.${proficiencyInstruction(proficiencyLevel)}

Flashcards:
${summarizeCards(cards)}`;
}

/**
 * Builds a prompt asking for `questionCount` open-ended, conceptual/situational questions
 * grounded in the given flashcards, deeper than simple recall, since these are graded by a
 * follow-up AI call rather than exact-matched against a fixed answer.
 */
export function buildDescriptiveQuizPrompt(
  cards: Card[],
  questionCount: number,
  proficiencyLevel: ProficiencyLevel | null = null,
): string {
  return `You are creating an open-ended practice quiz for an English-language learner based on their personal flashcards below.

Generate exactly ${questionCount} open-ended questions that go beyond simple recall, ask the learner to construct an original sentence using the term correctly, explain a subtle nuance or common mistake, analyze how the term applies in a new short scenario, or compare it with a closely related term. Each question must pose a new sentence, situation, or prompt of your own invention, do not quote or lightly reword the card's own Examples. Distribute the questions across the flashcards provided, favoring cards not yet covered before repeating one. Set "sourceIndex" to the flashcard's number (1-based) shown below that a question was drawn from. Ground every question only in the flashcard content provided, do not invent unrelated facts. Do not include a correct answer; these will be graded separately.${proficiencyInstruction(proficiencyLevel)}

Flashcards:
${summarizeCards(cards)}`;
}

/**
 * Builds a prompt asking the AI to grade a batch of free-text answers to open-ended quiz
 * questions. "sourceIndex" ties each evaluation back to the item (1-based) it graded.
 */
export function buildDescriptiveEvaluationPrompt(
  items: { question: string; userAnswer: string }[],
  proficiencyLevel: ProficiencyLevel | null = null,
): string {
  const itemSummaries = items
    .map((item, index) => {
      const answer = item.userAnswer.trim() || '(no answer given)';
      return `${index + 1}. Question: "${item.question}"\n   Learner's answer: "${answer}"`;
    })
    .join('\n\n');

  return `You are grading an English-language learner's answers to an open-ended practice quiz. For EACH item below, evaluate how well the learner's answer demonstrates correct understanding and usage, score generously for genuine understanding even with minor grammar slips, but score low for answers that are off-topic, incorrect, or blank. Set "sourceIndex" to the item's number (1-based) shown below. Give a "score" from 0 to 100, "feedback" that is a short (1-3 sentence) explanation directed at the learner, and a "sampleAnswer" showing what a strong answer would look like.${proficiencyInstruction(proficiencyLevel)}

Items to grade:
${itemSummaries}`;
}
