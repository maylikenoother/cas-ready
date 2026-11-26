export const CATEGORIES = [
  "course",
  "university",
  "uk_choice",
  "finance",
  "career",
  "academic",
  "research",
  "immigration",
  "accommodation",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CORE_CATEGORIES: Category[] = [
  "course",
  "university",
  "uk_choice",
  "finance",
  "career",
];

export const CATEGORY_LABELS: Record<Category | "communication", string> = {
  course: "Course",
  university: "University",
  uk_choice: "UK choice",
  finance: "Finance",
  career: "Career",
  academic: "Academic background",
  research: "Research",
  immigration: "Immigration history",
  accommodation: "Accommodation",
  communication: "Communication",
};

export const PRIMARY_REPORT_CATEGORIES: Array<Category | "communication"> = [
  "course",
  "university",
  "uk_choice",
  "finance",
  "career",
  "communication",
];
