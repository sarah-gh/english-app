export class GeminiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

const MODEL = 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GeneratedQuestionType = 'multiple-choice' | 'fill-blank';

export interface GeneratedQuizQuestion {
  /** 1-based index into the flashcard list the prompt was built from, so the app can save the
   *  question back onto the exact card it was generated from. */
  sourceIndex: number;
  type: GeneratedQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
}

const QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceIndex: { type: 'INTEGER' },
          type: { type: 'STRING', enum: ['multiple-choice', 'fill-blank'] },
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctAnswer: { type: 'STRING' },
        },
        required: ['sourceIndex', 'type', 'question', 'correctAnswer'],
      },
    },
  },
  required: ['questions'],
};

function isGeneratedQuizQuestion(value: unknown): value is GeneratedQuizQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.sourceIndex === 'number' &&
    (q.type === 'multiple-choice' || q.type === 'fill-blank') &&
    typeof q.question === 'string' &&
    typeof q.correctAnswer === 'string' &&
    (q.options === undefined || Array.isArray(q.options))
  );
}

/** Calls Gemini Flash with Structured JSON Output mode enabled, using the user's own API key. */
export async function generateQuiz(
  apiKey: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: QUIZ_RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new GeminiApiError('Could not reach the Gemini API. Check your connection and try again.');
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new GeminiApiError('Gemini rejected the request — check that your API key is valid.');
    }
    if (response.status === 429) {
      throw new GeminiApiError('Gemini rate limit reached. Please wait a moment and try again.');
    }
    throw new GeminiApiError(`Gemini API error (${response.status}). Please try again.`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiApiError('Gemini returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiApiError('Gemini returned a response that was not valid JSON.');
  }

  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new GeminiApiError("Gemini's response did not include a questions list.");
  }

  const validQuestions = questions.filter(isGeneratedQuizQuestion);
  if (validQuestions.length === 0) {
    throw new GeminiApiError('Gemini did not return any usable questions. Please try again.');
  }

  return validQuestions;
}
