import { CORE_CATEGORIES, type Category } from "@/lib/categories";

export type BankQuestion = {
  id: string;
  category: Category | string;
};

export type SelectOptions = {
  mode: "trial" | "practice" | "mock";
  count: number;
  categories?: string[];
  rng?: () => number;
};

export function selectQuestions<T extends BankQuestion>(bank: T[], options: SelectOptions): T[] {
  const rng = options.rng ?? Math.random;
  const active = bank.slice();
  if (options.mode === "trial") {
    const course = active.filter((question) => question.category === "course");
    const pool = course.length > 0 ? course : active;
    if (pool.length === 0) return [];
    return [pool[Math.floor(rng() * pool.length)]];
  }

  const filtered =
    options.mode === "practice" && options.categories && options.categories.length > 0
      ? active.filter((question) => options.categories?.includes(question.category))
      : active;

  if (options.mode === "practice") {
    return shuffle(filtered, rng).slice(0, Math.max(1, options.count));
  }

  const picked: T[] = [];
  const used = new Set<string>();
  for (const category of CORE_CATEGORIES) {
    if (picked.length >= options.count) break;
    const pool = filtered.filter((question) => question.category === category && !used.has(question.id));
    if (pool.length === 0) continue;
    const choice = pool[Math.floor(rng() * pool.length)];
    picked.push(choice);
    used.add(choice.id);
  }
  const rest = shuffle(
    filtered.filter((question) => !used.has(question.id)),
    rng,
  );
  for (const question of rest) {
    if (picked.length >= options.count) break;
    picked.push(question);
  }
  const coreCount = Math.min(picked.length, CORE_CATEGORIES.length, options.count);
  const core = shuffle(picked.slice(0, coreCount), rng);
  const extra = picked.slice(coreCount);
  return [...core, ...extra];
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

export type PromptContext = {
  course: string;
  university: string;
  city: string;
  country: string;
};

export function renderPrompt(template: string, context: PromptContext): string {
  return template
    .replaceAll("{course}", context.course.trim() || "your course")
    .replaceAll("{university}", context.university.trim() || "your university")
    .replaceAll("{city}", context.city.trim() || "the city")
    .replaceAll("{country}", context.country.trim() || "your home country");
}
