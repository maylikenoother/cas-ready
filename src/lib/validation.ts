import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const startSessionSchema = z.object({
  mode: z.enum(["trial", "practice", "mock"]),
  answerSeconds: z.union([z.literal(45), z.literal(60), z.literal(90)]),
  questionCount: z.union([z.literal(1), z.literal(4), z.literal(6), z.literal(8), z.literal(10)]),
  categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).optional(),
});

export const answerPayloadSchema = z.object({
  sessionQuestionId: uuid,
  transcript: z.string().max(8000).optional(),
  typedNotes: z.string().max(8000).optional(),
  durationMs: z.number().int().min(0).max(180_000),
  speechDelayMs: z.number().int().min(0).max(180_000),
  longestSilenceMs: z.number().int().min(0).max(180_000),
  speakingRatio: z.number().min(0).max(1),
  videoPath: z.string().max(500).optional(),
  audioBase64: z.string().max(6_000_000).optional(),
  audioMime: z.string().max(100).optional(),
  leftScreenCount: z.number().int().min(0).max(50).optional(),
  replace: z.boolean().optional(),
});

const optionalUuid = z.union([z.literal(""), uuid]);

export const profileSchema = z.object({
  fullName: z.string().trim().max(120).optional().default(""),
  homeCountry: z.string().trim().max(80).optional().default(""),
  universityId: optionalUuid.optional().default(""),
  courseId: optionalUuid.optional().default(""),
  previousQualification: z.string().trim().max(300).optional().default(""),
  englishTest: z.string().trim().max(120).optional().default(""),
  accommodationPlan: z.string().trim().max(300).optional().default(""),
  accommodationCost: z.string().trim().max(20).optional().default(""),
  accommodationDistance: z.string().trim().max(160).optional().default(""),
  careerGoal: z.string().trim().max(400).optional().default(""),
  tuitionFee: z.string().trim().max(20).optional().default(""),
  depositPaid: z.string().trim().max(20).optional().default(""),
  sponsorName: z.string().trim().max(160).optional().default(""),
  sponsorOccupation: z.string().trim().max(160).optional().default(""),
  sponsorIncome: z.string().trim().max(160).optional().default(""),
});

export const factUpdateSchema = z.object({
  id: uuid,
  valueNumeric: z.string().trim().max(20).optional().default(""),
  valueText: z.string().trim().max(800).optional().default(""),
  sourceUrl: z.string().trim().max(400).optional().default(""),
  lastVerifiedOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(""),
  needsVerification: z.boolean(),
  active: z.boolean(),
  notes: z.string().trim().max(800).optional().default(""),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE"),
});

export const consentSchema = z.object({
  kind: z.enum(["recording", "text_feedback", "terms"]),
  accepted: z.literal(true),
});

export function moneyOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed.replace(/£/g, "").replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1_000_000) return null;
  return Math.round(numeric * 100) / 100;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
