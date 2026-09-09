import { z } from 'zod';
import { stripHtmlToText } from '@/utils/html';

/**
 * Validates only the subset of CardFormState that has real save-blocking constraints, the rest
 * of the form (tags, examples, quiz questions, pronunciation, image) stays optional by design.
 */
export const cardEditorSchema = z
  .object({
    frontTitle: z.string().trim().min(2, 'Title must be at least 2 characters.'),
    deckId: z.string().min(1, 'Please select a deck.'),
    backAnswer: z.string(),
  })
  .superRefine((data, ctx) => {
    if (stripHtmlToText(data.backAnswer).length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['backAnswer'],
        message: 'Back answer / explanation is required.',
      });
    }
  });

export type CardEditorValidationValues = z.infer<typeof cardEditorSchema>;
