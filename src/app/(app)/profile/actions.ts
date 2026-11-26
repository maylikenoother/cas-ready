"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { moneyOrNull, profileSchema } from "@/lib/validation";

export async function saveProfile(formData: FormData): Promise<{ error: string } | { ok: true }> {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    homeCountry: formData.get("homeCountry"),
    universityId: formData.get("universityId"),
    courseId: formData.get("courseId"),
    previousQualification: formData.get("previousQualification"),
    englishTest: formData.get("englishTest"),
    accommodationPlan: formData.get("accommodationPlan"),
    accommodationCost: formData.get("accommodationCost"),
    accommodationDistance: formData.get("accommodationDistance"),
    careerGoal: formData.get("careerGoal"),
    tuitionFee: formData.get("tuitionFee"),
    depositPaid: formData.get("depositPaid"),
    sponsorName: formData.get("sponsorName"),
    sponsorOccupation: formData.get("sponsorOccupation"),
    sponsorIncome: formData.get("sponsorIncome"),
  });
  if (!parsed.success) return { error: "Check the profile fields and try again." };

  const { error: profileError } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName || null,
    home_country: parsed.data.homeCountry || null,
  }).eq("id", user.id);
  if (profileError) return { error: "The profile could not be saved." };

  const student = {
    user_id: user.id,
    university_id: parsed.data.universityId || null,
    course_id: parsed.data.courseId || null,
    previous_qualification: parsed.data.previousQualification || null,
    english_test: parsed.data.englishTest || null,
    accommodation_plan: parsed.data.accommodationPlan || null,
    accommodation_cost_gbp: moneyOrNull(parsed.data.accommodationCost),
    accommodation_distance: parsed.data.accommodationDistance || null,
    career_goal: parsed.data.careerGoal || null,
  };
  const { error: studentError } = await supabase.from("student_profiles").upsert(student);
  if (studentError) return { error: "The study details could not be saved." };

  const { error: financeError } = await supabase.from("student_finance_private").upsert({
    user_id: user.id,
    tuition_fee_gbp: moneyOrNull(parsed.data.tuitionFee),
    deposit_paid_gbp: moneyOrNull(parsed.data.depositPaid),
    sponsor_name: parsed.data.sponsorName || null,
    sponsor_occupation: parsed.data.sponsorOccupation || null,
    sponsor_income: parsed.data.sponsorIncome || null,
  });
  if (financeError) return { error: "The finance details could not be saved." };

  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: true };
}
