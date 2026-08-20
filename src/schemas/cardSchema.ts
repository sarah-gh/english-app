import { z } from 'zod';

const posDetailSchema = z.object({
  word: z.string(),
  meaning: z.string(),
  example: z.string(),
});

const wordFamilyDataSchema = z.object({
  noun: posDetailSchema,
  verb: posDetailSchema,
  adjective: posDetailSchema,
  adverb: posDetailSchema,
  usageNotes: z.string(),
});

/**
 * Validates only the subset of CardFormState that has real save-blocking constraints — the rest
 * of the form (tags, examples, quiz questions, pronunciation, image) stays optional by design.
 */
export const cardEditorSchema = z
  .object({
    cardMode: z.enum(['standard', 'word-family']),
    frontTitle: z.string().trim().min(2, 'Title must be at least 2 characters.'),
    deckId: z.string().min(1, 'Please select a deck.'),
    backAnswer: z.string(),
    wordFamily: wordFamilyDataSchema,
  })
  .superRefine((data, ctx) => {
    if (data.cardMode === 'standard') {
      if (data.backAnswer.trim().length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['backAnswer'],
          message: 'Back answer / explanation is required.',
        });
      }
      return;
    }

    const hasWordForm = [
      data.wordFamily.noun,
      data.wordFamily.verb,
      data.wordFamily.adjective,
      data.wordFamily.adverb,
    ].some((detail) => detail.word.trim().length > 0);
    if (!hasWordForm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wordFamily'],
        message: 'Add at least one word form (Noun, Verb, Adjective, or Adverb).',
      });
    }
  });

export type CardEditorValidationValues = z.infer<typeof cardEditorSchema>;
