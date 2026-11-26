import "server-only";
import { geminiEnv } from "@/lib/env";
import {
  answerFeedbackSchema,
  parseModelJson,
  reportNarrativeSchema,
  sanitiseFeedback,
  type AnswerFeedback,
  type ReportNarrative,
} from "@/lib/gemini/parse";

const COACH_RULES = `You coach students who are rehearsing a UK university pre-CAS credibility interview.
You do not work for a university, for UK Visas and Immigration, or for Enroly.
Never say the student will pass, fail, receive a CAS, or be granted a visa.
Never judge honesty, personality, emotion, appearance, or accent.
Never invent fees, visa rules, or course facts. If a supplied fact is marked unverified, say it needs checking on the official page.
Give practical notes about whether the answer addresses the question and uses specific details.
Return JSON only.`;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export async function transcribeAndCoach(input: {
  question: string;
  profile: string;
  courseRecord: string;
  metrics: string;
  transcript: string | null;
  audioBase64?: string;
  audioMime?: string;
}): Promise<AnswerFeedback | null> {
  const parts: Part[] = [
    {
      text: `${COACH_RULES}

JSON keys: transcript (string), relevance (0-100), specificity (0-100), clarity (0-100), strengths (string[]), improvements (string[]), suggested_answer_outline (string[]), consistency_notes (string[]).
Each list has at most 4 items, each under 180 characters.
suggested_answer_outline is a list of prompts, not a script to memorise.
If audio is attached, write the words you can hear into transcript. If speech is unclear, leave transcript empty and say so in improvements.
If a transcript is already supplied, copy it into transcript unless audio clearly corrects a short gap.

Question: ${input.question}
Student profile (supplied by the student): ${input.profile}
Course record: ${input.courseRecord}
Delivery measurements: ${input.metrics}
Supplied transcript: ${input.transcript ?? "(none)"}`,
    },
  ];
  if (input.audioBase64 && input.audioBase64.length < 5_500_000) {
    parts.push({
      inline_data: {
        mime_type: input.audioMime || "audio/webm",
        data: input.audioBase64,
      },
    });
  }
  const raw = await generate(parts);
  if (!raw) return null;
  const parsed = parseModelJson(raw, answerFeedbackSchema);
  return parsed ? sanitiseFeedback(parsed) : null;
}

export async function coachReport(input: { scores: string; excerpts: string }): Promise<ReportNarrative | null> {
  const raw = await generate([
    {
      text: `${COACH_RULES}

JSON keys: summary (string, max 700 characters), next_steps (string[], max 3).
The summary must describe practice performance only. Name the weakest area and one concrete thing to do next.
Do not write a model answer.

Scores: ${input.scores}
Excerpts: ${input.excerpts}`,
    },
  ]);
  if (!raw) return null;
  const parsed = parseModelJson(raw, reportNarrativeSchema);
  if (!parsed) return null;
  const summary = parsed.summary.replace(/\s+/g, " ").trim();
  if (/you will (pass|get)|visa will be|cas will be issued/i.test(summary)) return null;
  return {
    summary,
    next_steps: parsed.next_steps.map((step) => step.trim()).filter(Boolean).slice(0, 3),
  };
}

async function generate(parts: Part[]): Promise<string | null> {
  const env = geminiEnv();
  if (!env) return null;
  const url = `${env.base}/v1beta/models/${encodeURIComponent(env.model)}:generateContent?key=${encodeURIComponent(env.apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      console.error("gemini request failed", response.status, env.tier);
      return null;
    }
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    return text || null;
  } catch (error) {
    console.error("gemini request error", error instanceof Error ? error.name : "unknown");
    return null;
  }
}
