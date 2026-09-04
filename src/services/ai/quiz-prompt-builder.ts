import type { Card } from '@/types/card';
import type { ProficiencyLevel } from '@/types/settings';

/** Appended to a quiz prompt so generated content matches the learner's self-assessed CEFR level
 *  instead of defaulting to whatever difficulty the model picks on its own. Omitted entirely (via
 *  an empty string) when the user hasn't set a level, preserving prior behavior. */
function proficiencyInstruction(proficiencyLevel: ProficiencyLevel | null): string {
  if (!proficiencyLevel) return '';
  return ` The learner's self-assessed CEFR English level is ${proficiencyLevel} — use vocabulary, sentence complexity, and question difficulty appropriate for that level.`;
}

function summarizeCards(cards: Card[]): string {
  return cards
    .map((card, index) => {
      const lines = [
        `${index + 1}. Term/Question: "${card.frontTitle}"`,
        `   Explanation/Answer: "${card.backAnswer}"`,
      ];
      if (card.examples.length > 0) {
        lines.push(`   Examples: ${card.examples.map((example) => `"${example}"`).join(' | ')}`);
      }
      if (card.partsOfSpeech && card.partsOfSpeech.length > 0) {
        const posSummary = card.partsOfSpeech
          .map((entry) => {
            const wordForm = entry.wordForm ? `${entry.wordForm} — ` : '';
            return `${entry.pos} (${wordForm}${entry.definition})`;
          })
          .join('; ');
        lines.push(`   Parts of speech: ${posSummary}`);
      }
      if (card.wordFamily) {
        const { rootWord, noun, verb, adjective, adverb } = card.wordFamily;
        const forms = [
          noun && `noun: ${noun.word}`,
          verb && `verb: ${verb.word}`,
          adjective && `adjective: ${adjective.word}`,
          adverb && `adverb: ${adverb.word}`,
        ]
          .filter((form): form is string => Boolean(form))
          .join(', ');
        if (forms) lines.push(`   Word family (root "${rootWord}"): ${forms}`);
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

Generate exactly ${questionCount} multiple-choice questions that test whether the learner can correctly APPLY each flashcard's term — not just recognize its definition. For every question, invent a brand-new sentence, scenario, or fill-in-the-blank context that does not appear on the card (do not reuse or lightly reword the card's own Explanation/Answer text or its Examples as the question stem). Distribute the questions across the flashcards provided, favoring cards not yet covered before repeating one. Set "sourceIndex" to the flashcard's number (1-based) shown below that a question was drawn from.

Vary the question type across the batch instead of always asking "what does X mean?" — mix in formats such as: a fill-in-the-blank sentence where the learner picks the word/form that correctly completes it, a question about which grammatical form is correct in context (using the Parts of speech / Word family info when available), and a short scenario where the learner picks which option best fits the situation. Each question must have exactly 4 options in "options", with "correctOptionIndex" as the 0-based index of the correct one. Make the 3 incorrect options plausible distractors — confusable or related terms, common learner mistakes, or near-miss grammatical forms — rather than obviously wrong choices. Ground every question only in the flashcard content provided (do not invent unrelated facts or meanings), but express that content through new wording of your own.${proficiencyInstruction(proficiencyLevel)}

Flashcards:
${summarizeCards(cards)}`;
}

/**
 * Builds a prompt asking for `questionCount` open-ended, conceptual/situational questions
 * grounded in the given flashcards — deeper than simple recall, since these are graded by a
 * follow-up AI call rather than exact-matched against a fixed answer.
 */
export function buildDescriptiveQuizPrompt(
  cards: Card[],
  questionCount: number,
  proficiencyLevel: ProficiencyLevel | null = null,
): string {
  return `You are creating an open-ended practice quiz for an English-language learner based on their personal flashcards below.

Generate exactly ${questionCount} open-ended questions that go beyond simple recall — ask the learner to construct an original sentence using the term correctly, explain a subtle nuance or common mistake, analyze how the term applies in a new short scenario, or compare it with a closely related term. Each question must pose a new sentence, situation, or prompt of your own invention — do not quote or lightly reword the card's own Examples. Distribute the questions across the flashcards provided, favoring cards not yet covered before repeating one. Set "sourceIndex" to the flashcard's number (1-based) shown below that a question was drawn from. Ground every question only in the flashcard content provided — do not invent unrelated facts. Do not include a correct answer; these will be graded separately.${proficiencyInstruction(proficiencyLevel)}

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

  return `You are grading an English-language learner's answers to an open-ended practice quiz. For EACH item below, evaluate how well the learner's answer demonstrates correct understanding and usage — score generously for genuine understanding even with minor grammar slips, but score low for answers that are off-topic, incorrect, or blank. Set "sourceIndex" to the item's number (1-based) shown below. Give a "score" from 0 to 100, "feedback" that is a short (1-3 sentence) explanation directed at the learner, and a "sampleAnswer" showing what a strong answer would look like.${proficiencyInstruction(proficiencyLevel)}

Items to grade:
${itemSummaries}`;
}
