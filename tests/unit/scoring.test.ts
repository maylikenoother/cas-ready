import { describe, expect, it } from "vitest";
import { bandForScore, shouldShowBand } from "@/lib/bands";
import { aggregateAnswers, contentScore, deliveryScore, scoreAnswer } from "@/lib/scoring";

const calmDelivery = {
  durationMs: 60_000,
  answerSeconds: 60,
  speechDelayMs: 1000,
  longestSilenceMs: 1000,
  speakingRatio: 0.8,
  transcript: null,
};

describe("delivery score", () => {
  it("gives full marks when most of the time is used cleanly", () => {
    expect(deliveryScore(calmDelivery)).toBe(100);
  });

  it("scales time used below 60 percent of the limit", () => {
    expect(deliveryScore({ ...calmDelivery, durationMs: 30_000 })).toBe(83);
  });

  it("deducts for a slow start, a long silence, and little speaking", () => {
    expect(deliveryScore({ ...calmDelivery, speechDelayMs: 6000 })).toBe(85);
    expect(deliveryScore({ ...calmDelivery, speechDelayMs: 4000 })).toBe(95);
    expect(deliveryScore({ ...calmDelivery, longestSilenceMs: 7000 })).toBe(85);
    expect(deliveryScore({ ...calmDelivery, longestSilenceMs: 5000 })).toBe(92);
    expect(deliveryScore({ ...calmDelivery, speakingRatio: 0.4 })).toBe(88);
  });

  it("deducts for pace and fillers when there is a transcript", () => {
    const slow = `${"word ".repeat(80)}`;
    expect(deliveryScore({ ...calmDelivery, transcript: slow })).toBe(92);
    const fast = `${"word ".repeat(200)}`;
    expect(deliveryScore({ ...calmDelivery, transcript: fast })).toBe(90);
    const fillers = "um um um um um hello there friend today";
    expect(deliveryScore({ ...calmDelivery, transcript: fillers })).toBe(74);
  });
});

describe("content score", () => {
  it("scores a specific answer highly and a generic one at the floor", () => {
    const strong = contentScore({
      transcript: "I chose this course because the module on supply chains matches my career plan and I will pay 19300.",
      answerSeconds: 60,
      concepts: ["because", "module", "career"],
      savedFacts: ["19300"],
    });
    expect(strong.conceptsMissed).toEqual([]);
    expect(strong.score).toBe(85);

    const generic = contentScore({
      transcript: "It is a good university with world class teaching so I can gain knowledge and better opportunities. My agent told me.",
      answerSeconds: 60,
      concepts: ["because", "module", "career"],
      savedFacts: ["19300"],
    });
    expect(generic.genericPhrases.length).toBe(5);
    expect(generic.score).toBe(0);
  });
});

describe("answer and session scores", () => {
  it("weights content above delivery and falls back to delivery without text", () => {
    const scored = scoreAnswer({
      transcript: "I chose this course because the module on supply chains matches my career plan and I will pay 19300.",
      durationMs: 60_000,
      answerSeconds: 60,
      speechDelayMs: 1000,
      longestSilenceMs: 1000,
      speakingRatio: 0.8,
      concepts: ["because", "module", "career"],
      savedFacts: ["19300"],
      finance: null,
      isFinance: false,
      ai: null,
    });
    expect(scored.contentScore).toBe(85);
    expect(scored.deliveryScore).toBe(92);
    expect(scored.answerScore).toBe(87);

    const silent = scoreAnswer({
      transcript: "   ",
      durationMs: 60_000,
      answerSeconds: 60,
      speechDelayMs: 1000,
      longestSilenceMs: 1000,
      speakingRatio: 0.8,
      concepts: ["because"],
      savedFacts: [],
      finance: null,
      isFinance: false,
      ai: null,
    });
    expect(silent.contentScore).toBeNull();
    expect(silent.answerScore).toBe(100);
  });

  it("blends a valid model signal with the rubric", () => {
    const scored = scoreAnswer({
      transcript: "I chose this course because the module on supply chains matches my career plan and I will pay 19300.",
      durationMs: 60_000,
      answerSeconds: 60,
      speechDelayMs: 1000,
      longestSilenceMs: 1000,
      speakingRatio: 0.8,
      concepts: ["because", "module", "career"],
      savedFacts: ["19300"],
      finance: null,
      isFinance: false,
      ai: { relevance: 40, specificity: 60 },
    });
    expect(scored.contentScore).toBe(68);
  });

  it("flags a finance amount that matches none of the saved figures", () => {
    const scored = scoreAnswer({
      transcript: "My tuition fee is £20,000 and I have paid the deposit.",
      durationMs: 50_000,
      answerSeconds: 60,
      speechDelayMs: 1000,
      longestSilenceMs: 500,
      speakingRatio: 0.7,
      concepts: ["tuition|fee", "deposit|paid"],
      savedFacts: [],
      finance: { tuition: 16500, deposit: 5000, rent: 600 },
      isFinance: true,
      ai: null,
    });
    expect(scored.flags.some((flag) => flag.includes("20,000"))).toBe(true);
  });

  it("withholds the band until enough answers have content", () => {
    expect(shouldShowBand(1, 8)).toBe(false);
    expect(shouldShowBand(3, 8)).toBe(true);
    expect(shouldShowBand(1, 1)).toBe(true);
    const aggregate = aggregateAnswers([
      { category: "course", answerScore: 80, deliveryScore: 70, contentScore: 84 },
      { category: "finance", answerScore: 40, deliveryScore: 70, contentScore: null },
    ]);
    expect(aggregate.band).toBeNull();
    expect(aggregate.bandWithheld).toBe(true);
    expect(aggregate.categories.communication).toBe(70);
    expect(bandForScore(80)).toBe("green");
    expect(bandForScore(55)).toBe("amber");
    expect(bandForScore(54)).toBe("red");
  });
});
