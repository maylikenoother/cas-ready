export type MaintenanceRate = {
  monthly: number;
  region: "london" | "outside_london";
  sourceUrl: string;
  lastVerifiedOn: string | null;
  needsVerification: boolean;
  notes: string | null;
};

export type FundsEstimate = {
  months: number;
  living: number;
  tuitionOutstanding: number;
  accommodationOffset: number;
  total: number;
};

const MAX_MONTHS = 9;

export function clampMonths(months: number): number {
  if (!Number.isFinite(months)) return 1;
  return Math.min(MAX_MONTHS, Math.max(1, Math.round(months)));
}

/**
 * Living costs for up to 9 months, plus tuition still to pay, minus an
 * accommodation deposit already paid to the university, capped at the
 * London monthly figure (Appendix Student ST 12.4).
 */
export function estimateFunds(input: {
  monthly: number;
  months: number;
  tuition: number;
  depositPaid: number;
  accommodationPaidToSponsor: number;
  offsetCap: number;
}): FundsEstimate {
  const months = clampMonths(input.months);
  const living = roundMoney(input.monthly * months);
  const tuitionOutstanding = roundMoney(Math.max(0, input.tuition - input.depositPaid));
  const accommodationOffset = roundMoney(
    Math.min(Math.max(0, input.accommodationPaidToSponsor), Math.max(0, input.offsetCap)),
  );
  const total = roundMoney(Math.max(0, living + tuitionOutstanding - accommodationOffset));
  return { months, living, tuitionOutstanding, accommodationOffset, total };
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

export function pickRate<T extends { region: string; effectiveFrom: string | null; active: boolean; needsVerification: boolean }>(
  facts: T[],
  region: "london" | "outside_london",
  onDate: string,
): T | null {
  const eligible = facts
    .filter((fact) => fact.active && !fact.needsVerification && fact.region === region)
    .filter((fact) => !fact.effectiveFrom || fact.effectiveFrom <= onDate)
    .sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""));
  return eligible[0] ?? null;
}

const MONEY_PATTERN = /£\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|£\s?\d+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?|\b\d{3,7}(?:\.\d+)?\b/g;

export function extractMoneyAmounts(text: string): number[] {
  const found: number[] = [];
  for (const match of text.matchAll(MONEY_PATTERN)) {
    const numeric = Number(match[0].replace(/£/g, "").replace(/,/g, "").trim());
    if (!Number.isFinite(numeric)) continue;
    if (numeric < 100) continue;
    if (numeric >= 1900 && numeric <= 2035 && !match[0].includes("£") && !match[0].includes(",")) continue;
    found.push(numeric);
  }
  return found;
}

export function withinSixPercent(amount: number, target: number): boolean {
  if (target === 0) return amount === 0;
  return Math.abs(amount - target) / Math.abs(target) <= 0.06;
}

export function financeMismatchFlags(
  text: string,
  saved: { tuition: number | null; deposit: number | null; rent: number | null },
): string[] {
  const comparators = [saved.tuition, saved.deposit, saved.rent].filter(
    (value): value is number => value != null && value > 0,
  );
  if (comparators.length === 0) return [];
  const flags: string[] = [];
  for (const amount of extractMoneyAmounts(text)) {
    const matched = comparators.some((target) => withinSixPercent(amount, target));
    if (!matched) {
      flags.push(
        `£${formatAmount(amount)} does not match the tuition, deposit or accommodation cost saved on the profile. It may still be a living-cost figure — confirm it is the number you meant.`,
      );
    }
  }
  return flags;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? amount.toLocaleString("en-GB") : amount.toFixed(2);
}

export function convertWithRate(gbp: number, rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(gbp * rate);
}
