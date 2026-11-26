export type Band = "green" | "amber" | "red";

export function bandForScore(score: number): Band {
  if (score >= 80) return "green";
  if (score >= 55) return "amber";
  return "red";
}

export function bandLabel(band: Band): string {
  if (band === "green") return "Strong practice performance";
  if (band === "amber") return "Further preparation";
  return "Significant improvement needed";
}

export function bandMeaning(band: Band): string {
  if (band === "green") {
    return "On this practice set, the answers were specific and covered the question. Keep rehearsing out loud.";
  }
  if (band === "amber") {
    return "The shape of the answers is there. Fill the gaps this report names before a full mock.";
  }
  return "Important parts of the question were missing or very general. Use the notes, then try again in your own words.";
}

/**
 * A band is shown when content was scored for every answer in a short session
 * (fewer than 3), or for at least 3 answers in a longer session.
 */
export function shouldShowBand(contentScoredCount: number, answerCount: number): boolean {
  if (answerCount <= 0) return false;
  if (answerCount < 3) return contentScoredCount === answerCount;
  return contentScoredCount >= 3;
}
