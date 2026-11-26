import { describe, expect, it } from "vitest";
import { decideAccess } from "@/lib/entitlements";
import { renderPrompt, selectQuestions } from "@/lib/questions";
import { finaliseSpeech, stepSpeech, emptySpeech, lightingVerdict, averageLuminance } from "@/lib/speech";

const bank = [
  { id: "c1", category: "course" },
  { id: "c2", category: "course" },
  { id: "u1", category: "university" },
  { id: "k1", category: "uk_choice" },
  { id: "f1", category: "finance" },
  { id: "r1", category: "career" },
  { id: "a1", category: "accommodation" },
  { id: "b1", category: "academic" },
];

describe("question selection", () => {
  it("gives the free session a single course question", () => {
    const picked = selectQuestions(bank, { mode: "trial", count: 8, rng: () => 0 });
    expect(picked).toHaveLength(1);
    expect(picked[0].category).toBe("course");
  });

  it("includes every core topic in a mock before extra topics", () => {
    const picked = selectQuestions(bank, { mode: "mock", count: 8, rng: () => 0 });
    const categories = new Set(picked.map((question) => question.category));
    expect(picked).toHaveLength(8);
    for (const category of ["course", "university", "uk_choice", "finance", "career"]) {
      expect(categories.has(category)).toBe(true);
    }
  });

  it("fills a prompt from the student profile", () => {
    expect(renderPrompt("Why {course} at {university} in {city}?", {
      course: "MSc International Business",
      university: "University of Lincoln",
      city: "Lincoln",
      country: "Nigeria",
    })).toBe("Why MSc International Business at University of Lincoln in Lincoln?");
  });
});

describe("access", () => {
  const active = { status: "active", mockQuota: 4, mocksRemaining: 2, periodEnd: "2099-01-01T00:00:00.000Z" };

  it("allows one free question and then requires a subscription", () => {
    expect(decideAccess({ mode: "trial", trialConsumed: false, subscription: null }).ok).toBe(true);
    expect(decideAccess({ mode: "trial", trialConsumed: true, subscription: null })).toEqual({ ok: false, reason: "trial_used" });
    expect(decideAccess({ mode: "mock", trialConsumed: false, subscription: null })).toEqual({ ok: false, reason: "subscription_required" });
  });

  it("consumes a mock only when the subscription has interviews left", () => {
    expect(decideAccess({ mode: "mock", trialConsumed: true, subscription: active })).toEqual({ ok: true, consume: "mock" });
    expect(decideAccess({ mode: "practice", trialConsumed: true, subscription: active })).toEqual({ ok: true, consume: "practice" });
    expect(decideAccess({
      mode: "mock",
      trialConsumed: true,
      subscription: { ...active, mocksRemaining: 0 },
    })).toEqual({ ok: false, reason: "no_mocks_left" });
    expect(decideAccess({
      mode: "mock",
      trialConsumed: true,
      subscription: { ...active, mockQuota: null, mocksRemaining: null },
    })).toEqual({ ok: true, consume: "mock" });
    expect(decideAccess({
      mode: "mock",
      trialConsumed: true,
      subscription: { ...active, status: "past_due" },
    })).toEqual({ ok: false, reason: "subscription_required" });
  });
});

describe("speech measurements", () => {
  it("records the delay before speech and the longest silence", () => {
    let stats = emptySpeech();
    stats = stepSpeech(stats, 0.001, 2000);
    stats = stepSpeech(stats, 0.05, 1000);
    stats = stepSpeech(stats, 0.001, 3000);
    stats = stepSpeech(stats, 0.05, 1000);
    const finalStats = finaliseSpeech(stats, 7000);
    expect(finalStats.speechDelayMs).toBe(2000);
    expect(finalStats.longestSilenceMs).toBe(3000);
    expect(finalStats.speakingRatio).toBeCloseTo(2000 / 7000);
  });

  it("checks brightness without treating it as a face", () => {
    expect(lightingVerdict(20)).toBe("dark");
    expect(lightingVerdict(120)).toBe("ok");
    expect(lightingVerdict(240)).toBe("bright");
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    expect(averageLuminance(pixels)).toBeCloseTo(127.5, 0);
  });
});
