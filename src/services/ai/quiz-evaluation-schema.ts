export interface GeneratedQuizEvaluation {
  /** 1-based index into the list of question/answer pairs the evaluation prompt was built from. */
  sourceIndex: number;
  /** 0-100. */
  score: number;
  feedback: string;
  sampleAnswer: string;
}

/** Gemini Structured Output schema (also understood by AIHubMix's Gemini-compatible proxy). */
export const QUIZ_EVALUATION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    evaluations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceIndex: { type: 'INTEGER' },
          score: { type: 'INTEGER' },
          feedback: { type: 'STRING' },
          sampleAnswer: { type: 'STRING' },
        },
        required: ['sourceIndex', 'score', 'feedback', 'sampleAnswer'],
      },
    },
  },
  required: ['evaluations'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement — their JSON mode only guarantees valid JSON, not a specific shape — so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const QUIZ_EVALUATION_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"evaluations": [{"sourceIndex": number, "score": number (0-100), "feedback": string, "sampleAnswer": string}]}`;

function isGeneratedQuizEvaluation(value: unknown): value is GeneratedQuizEvaluation {
  if (!value || typeof value !== 'object') return false;
  const evaluation = value as Record<string, unknown>;
  return (
    typeof evaluation.sourceIndex === 'number' &&
    typeof evaluation.score === 'number' &&
    typeof evaluation.feedback === 'string' &&
    typeof evaluation.sampleAnswer === 'string'
  );
}

/** Parses and validates a Gemini-shaped `{ evaluations: [...] }` JSON response body. Throws
 *  `makeError(message)` (so callers can raise a provider-specific error type) on any failure.
 *  Clamps `score` into 0-100 since nothing else in the pipeline guards against a model returning
 *  an out-of-range value despite the prompt/schema. */
export function parseQuizEvaluationResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedQuizEvaluation[] {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const evaluations = (parsed as { evaluations?: unknown }).evaluations;
  if (!Array.isArray(evaluations)) {
    throw makeError("The AI provider's response did not include an evaluations list.");
  }

  const validEvaluations = evaluations.filter(isGeneratedQuizEvaluation).map((evaluation) => ({
    ...evaluation,
    score: Math.max(0, Math.min(100, Math.round(evaluation.score))),
  }));
  if (validEvaluations.length === 0) {
    throw makeError('The AI provider did not return any usable evaluations. Please try again.');
  }

  return validEvaluations;
}
