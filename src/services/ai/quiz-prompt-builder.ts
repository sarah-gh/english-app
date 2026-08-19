import type { Card } from '@/types/card';

/**
 * Builds a prompt asking Gemini for exactly one question per flashcard, numbered to match the
 * `sourceIndex` field in the response schema, so each generated question can be traced back to
 * the specific card it should be optionally saved onto.
 */
export function buildQuizPrompt(cards: Card[]): string {
  const cardSummaries = cards
    .map((card, index) => {
      const lines = [
        `${index + 1}. Term/Question: "${card.frontTitle}"`,
        `   Explanation/Answer: "${card.backAnswer}"`,
      ];
      if (card.examples.length > 0) {
        lines.push(`   Examples: ${card.examples.map((example) => `"${example}"`).join(' | ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  return `You are creating a short practice quiz for an English-language learner based on their personal flashcards below.

For EACH flashcard, generate exactly one quiz question that tests whether the learner understands and can recall that specific card's content. Set "sourceIndex" to the flashcard's number (1-based) shown below. Mix multiple-choice questions (type "multiple-choice", with exactly 4 plausible options in "options", one of which exactly matches "correctAnswer") and fill-in-the-blank questions (type "fill-blank", "question" contains a sentence with a blank such as "___", "correctAnswer" is the missing word or short phrase, no "options") roughly evenly. Keep questions concise and grounded only in the flashcard content provided — do not invent unrelated facts.

Flashcards:
${cardSummaries}`;
}
