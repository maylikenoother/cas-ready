import { describe, expect, it } from "vitest";
import { convertWithRate, estimateFunds, extractMoneyAmounts, pickRate, withinSixPercent } from "@/lib/finance";

describe("maintenance estimate", () => {
  it("matches the worked example outside London before any later rate change", () => {
    const estimate = estimateFunds({
      monthly: 1171,
      months: 9,
      tuition: 16500,
      depositPaid: 5000,
      accommodationPaidToSponsor: 0,
      offsetCap: 1529,
    });
    expect(estimate.living).toBe(10539);
    expect(estimate.tuitionOutstanding).toBe(11500);
    expect(estimate.total).toBe(22039);
  });

  it("caps the accommodation offset and the number of months", () => {
    const estimate = estimateFunds({
      monthly: 1171,
      months: 12,
      tuition: 1000,
      depositPaid: 1000,
      accommodationPaidToSponsor: 4000,
      offsetCap: 1529,
    });
    expect(estimate.months).toBe(9);
    expect(estimate.accommodationOffset).toBe(1529);
    expect(estimate.tuitionOutstanding).toBe(0);
  });

  it("ignores unverified and inactive rates", () => {
    const facts = [
      { region: "outside_london", effectiveFrom: "2025-11-11", active: true, needsVerification: false, monthly: 1171 },
      { region: "outside_london", effectiveFrom: "2026-11-30", active: false, needsVerification: true, monthly: 1203 },
      { region: "london", effectiveFrom: "2025-11-11", active: true, needsVerification: false, monthly: 1529 },
    ];
    expect(pickRate(facts, "outside_london", "2026-12-01")?.monthly).toBe(1171);
    expect(pickRate(facts, "london", "2026-11-26")?.monthly).toBe(1529);
    expect(pickRate(facts, "outside_london", "2020-01-01")).toBeNull();
  });

  it("extracts money amounts and ignores likely years", () => {
    expect(extractMoneyAmounts("I paid £16,500 in 2024 and need 1171 each month.")).toEqual([16500, 1171]);
    expect(withinSixPercent(16000, 16500)).toBe(true);
    expect(withinSixPercent(20000, 16500)).toBe(false);
    expect(convertWithRate(100, 2000)).toBe(200000);
    expect(convertWithRate(100, 0)).toBeNull();
  });
});
