import { z } from "zod";

export const answerFeedbackSchema = z.object({
  transcript: z.string().optional().default(""),
  relevance: z.number().min(0).max(100),
  specificity: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(6).default([]),
  improvements: z.array(z.string()).max(6).default([]),
  suggested_answer_outline: z.array(z.string()).max(6).default([]),
  consistency_notes: z.array(z.string()).max(6).default([]),
});

export type AnswerFeedback = z.infer<typeof answerFeedbackSchema>;

export const reportNarrativeSchema = z.object({
  summary: z.string().min(1).max(1200),
  next_steps: z.array(z.string()).max(5).default([]),
});

export type ReportNarrative = z.infer<typeof reportNarrativeSchema>;

const PREDICTION = /you will (pass|get (your |a )?cas|be granted)|cas will be issued|visa will be (granted|approved)|guaranteed to pass|this predicts/i;

export function sanitiseCoachText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || PREDICTION.test(cleaned)) return "";
  return cleaned;
}

export function parseModelJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function sanitiseFeedback(feedback: AnswerFeedback): AnswerFeedback {
  return {
    ...feedback,
    transcript: feedback.transcript.trim(),
    strengths: feedback.strengths.map(sanitiseCoachText).filter(Boolean),
    improvements: feedback.improvements.map(sanitiseCoachText).filter(Boolean),
    suggested_answer_outline: feedback.suggested_answer_outline.map(sanitiseCoachText).filter(Boolean),
    consistency_notes: feedback.consistency_notes.map(sanitiseCoachText).filter(Boolean),
  };
}
