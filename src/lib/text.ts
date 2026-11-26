import { CATEGORY_LABELS } from "@/lib/categories";

export function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRow).filter((row): row is Record<string, unknown> => row !== null);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function categoryLabel(key: string): string {
  return key in CATEGORY_LABELS ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : key;
}

export function templateSummary(overall: number | null, band: string | null, categories: Record<string, number>): string {
  if (overall == null) return "This practice session does not have a score yet.";
  const areas = Object.entries(categories)
    .filter(([key]) => key !== "communication")
    .sort((a, b) => a[1] - b[1]);
  const bandText = band
    ? ` The practice band is ${band}.`
    : " A readiness band is not shown because too few answers had words to score.";
  let text = `The practice score is ${overall}.${bandText}`;
  if (areas.length >= 2 && areas[0][0] !== areas[areas.length - 1][0]) {
    const weakest = areas[0];
    const strongest = areas[areas.length - 1];
    text += ` The stronger area in this session was ${categoryLabel(strongest[0])} (${strongest[1]}). Spend the most time on ${categoryLabel(weakest[0])} (${weakest[1]}).`;
  }
  text += " This is practice feedback. It does not predict a CAS or a visa.";
  return text;
}

export function safeVideoPath(userId: string, path: string | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith(`${userId}/`) || path.includes("..") || path.includes("\\")) return null;
  if (!/^[A-Za-z0-9_./-]+$/.test(path)) return null;
  return path;
}

export function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
