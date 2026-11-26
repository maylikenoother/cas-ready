import { bandForScore, shouldShowBand, type Band } from "@/lib/bands";
import { financeMismatchFlags } from "@/lib/finance";

const GENERIC_PHRASES = [
  "good university",
  "world class",
  "world-class",
  "gain knowledge",
  "better opportunities",
  "my agent told me",
];

const FILLER_PATTERN = /\b(um+|uh+|erm+|hmm+|ah+)\b/gi;

export type DeliveryInput = {
  durationMs: number;
  answerSeconds: number;
  speechDelayMs: number;
  longestSilenceMs: number;
  speakingRatio: number;
  transcript: string | null;
};

export type ContentInput = {
  transcript: string;
  answerSeconds: number;
  concepts: string[];
  savedFacts: string[];
};

export type AiContentSignal = {
  relevance: number;
  specificity: number;
};

export type ScoredAnswer = {
  deliveryScore: number;
  contentScore: number | null;
  answerScore: number;
  conceptsHit: string[];
  conceptsMissed: string[];
  genericPhrases: string[];
  flags: string[];
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function deliveryScore(input: DeliveryInput): number {
  const limitMs = Math.max(1, input.answerSeconds * 1000);
  const used = Math.max(0, Math.min(1, input.durationMs / limitMs));
  let score = used >= 0.6 ? 100 : Math.round((used / 0.6) * 100);

  const startSec = Math.max(0, input.speechDelayMs) / 1000;
  if (startSec > 5) score -= 15;
  else if (startSec > 3) score -= 5;

  const silenceSec = Math.max(0, input.longestSilenceMs) / 1000;
  if (silenceSec > 6) score -= 15;
  else if (silenceSec > 4) score -= 8;

  if (input.speakingRatio < 0.5) score -= 12;

  const transcript = input.transcript?.trim() ?? "";
  if (transcript) {
    const words = wordCount(transcript);
    const minutes = Math.max(input.durationMs, 1) / 60000;
    const wpm = words / minutes;
    if (wpm < 90) score -= 8;
    else if (wpm > 190) score -= 10;

    const fillers = transcript.match(FILLER_PATTERN)?.length ?? 0;
    const fillerRatio = words > 0 ? fillers / words : 0;
    if (fillerRatio > 0.08) score -= 18;
    else if (fillerRatio > 0.05) score -= 8;
  }

  return clampScore(score);
}

export function normaliseText(value: string): string {
  return value.toLowerCase().replace(/£/g, "").replace(/,/g, "").replace(/\s+/g, " ").trim();
}

export function conceptHit(concept: string, text: string): boolean {
  const haystack = normaliseText(text);
  return concept
    .split("|")
    .map((part) => normaliseText(part))
    .filter(Boolean)
    .some((part) => haystack.includes(part));
}

export function conceptCoverage(concepts: string[], text: string): { hit: string[]; missed: string[]; score: number } {
  if (concepts.length === 0) return { hit: [], missed: [], score: 100 };
  const hit: string[] = [];
  const missed: string[] = [];
  for (const concept of concepts) {
    if (conceptHit(concept, text)) hit.push(concept);
    else missed.push(concept);
  }
  return { hit, missed, score: (hit.length / concepts.length) * 100 };
}

export function specificityScore(text: string, savedFacts: string[]): number {
  const normalised = normaliseText(text);
  let score = 0;
  if (/\d/.test(normalised)) score += 40;
  const factHit = savedFacts.some((fact) => {
    const needle = normaliseText(fact);
    return needle.length >= 3 && normalised.includes(needle);
  });
  if (factHit) score += 30;
  const proper = text
    .split(/\s+/)
    .slice(1)
    .some((word) => /^[A-Z][a-zA-Z.'-]{2,}/.test(word.replace(/[^A-Za-z.'-]/g, "")));
  if (proper || factHit) score += 30;
  return Math.min(100, score);
}

export function lengthScore(text: string, answerSeconds: number): number {
  const target = Math.max(20, Math.round((answerSeconds / 60) * 70));
  const words = wordCount(text);
  return Math.min(100, Math.round((words / target) * 100));
}

export function genericPenalty(text: string): { phrases: string[]; penalty: number } {
  const normalised = normaliseText(text);
  const phrases = GENERIC_PHRASES.filter((phrase) => normalised.includes(phrase));
  return { phrases, penalty: Math.min(18, phrases.length * 6) };
}

export function contentScore(input: ContentInput): {
  score: number;
  conceptsHit: string[];
  conceptsMissed: string[];
  genericPhrases: string[];
} {
  const coverage = conceptCoverage(input.concepts, input.transcript);
  const specific = specificityScore(input.transcript, input.savedFacts);
  const length = lengthScore(input.transcript, input.answerSeconds);
  const generic = genericPenalty(input.transcript);
  const raw = coverage.score * 0.55 + specific * 0.25 + length * 0.2 - generic.penalty;
  return {
    score: clampScore(raw),
    conceptsHit: coverage.hit,
    conceptsMissed: coverage.missed,
    genericPhrases: generic.phrases,
  };
}

export function blendContent(deterministic: number, ai: AiContentSignal | null): number {
  if (!ai) return clampScore(deterministic);
  const relevance = clampScore(ai.relevance);
  const specificity = clampScore(ai.specificity);
  const aiScore = (relevance + specificity) / 2;
  return clampScore(deterministic * 0.5 + aiScore * 0.5);
}

export function answerScore(content: number | null, delivery: number): number {
  if (content == null) return clampScore(delivery);
  return clampScore(content * 0.7 + delivery * 0.3);
}

export function scoreAnswer(input: {
  transcript: string | null;
  durationMs: number;
  answerSeconds: number;
  speechDelayMs: number;
  longestSilenceMs: number;
  speakingRatio: number;
  concepts: string[];
  savedFacts: string[];
  finance: { tuition: number | null; deposit: number | null; rent: number | null } | null;
  isFinance: boolean;
  ai: AiContentSignal | null;
}): ScoredAnswer {
  const transcript = input.transcript?.trim() ? input.transcript.trim() : null;
  const delivery = deliveryScore({
    durationMs: input.durationMs,
    answerSeconds: input.answerSeconds,
    speechDelayMs: input.speechDelayMs,
    longestSilenceMs: input.longestSilenceMs,
    speakingRatio: input.speakingRatio,
    transcript,
  });

  if (!transcript) {
    return {
      deliveryScore: delivery,
      contentScore: null,
      answerScore: answerScore(null, delivery),
      conceptsHit: [],
      conceptsMissed: input.concepts,
      genericPhrases: [],
      flags: [],
    };
  }

  const content = contentScore({
    transcript,
    answerSeconds: input.answerSeconds,
    concepts: input.concepts,
    savedFacts: input.savedFacts,
  });
  const blended = blendContent(content.score, input.ai);
  const flags = input.isFinance && input.finance ? financeMismatchFlags(transcript, input.finance) : [];
  if (content.genericPhrases.length > 0) {
    flags.push("This answer uses a very general phrase. Replace it with one detail that only you would say.");
  }

  return {
    deliveryScore: delivery,
    contentScore: blended,
    answerScore: answerScore(blended, delivery),
    conceptsHit: content.conceptsHit,
    conceptsMissed: content.conceptsMissed,
    genericPhrases: content.genericPhrases,
    flags,
  };
}

export type AggregateAnswer = {
  category: string;
  answerScore: number;
  deliveryScore: number;
  contentScore: number | null;
};

export type AggregateResult = {
  overall: number | null;
  band: Band | null;
  bandWithheld: boolean;
  categories: Record<string, number>;
  contentScoredCount: number;
};

export function aggregateAnswers(answers: AggregateAnswer[]): AggregateResult {
  if (answers.length === 0) {
    return { overall: null, band: null, bandWithheld: true, categories: {}, contentScoredCount: 0 };
  }
  const overall = clampScore(answers.reduce((sum, answer) => sum + answer.answerScore, 0) / answers.length);
  const contentScoredCount = answers.filter((answer) => answer.contentScore != null).length;
  const show = shouldShowBand(contentScoredCount, answers.length);
  const categories: Record<string, number> = {};
  const groups = new Map<string, number[]>();
  for (const answer of answers) {
    const list = groups.get(answer.category) ?? [];
    list.push(answer.answerScore);
    groups.set(answer.category, list);
  }
  for (const [category, scores] of groups) {
    categories[category] = clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
  const deliveryAverage = answers.reduce((sum, answer) => sum + answer.deliveryScore, 0) / answers.length;
  categories.communication = clampScore(deliveryAverage);
  return {
    overall,
    band: show ? bandForScore(overall) : null,
    bandWithheld: !show,
    categories,
    contentScoredCount,
  };
}

export function weakestCategory(categories: Record<string, number>, keys: string[]): string | null {
  let weakest: string | null = null;
  let lowest = Infinity;
  for (const key of keys) {
    const score = categories[key];
    if (score == null) continue;
    if (score < lowest) {
      lowest = score;
      weakest = key;
    }
  }
  return weakest;
}
