import { requireUser } from "@/lib/auth";
import { asNumber, asRow, asRows, asString } from "@/lib/text";
import { ProfileForm } from "@/app/(app)/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const [{ data: profileData }, { data: studentData }, { data: financeData }, { data: universityData }, { data: courseData }] = await Promise.all([
    supabase.from("profiles").select("full_name, home_country").eq("id", user.id).maybeSingle(),
    supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("student_finance_private").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("universities").select("id, name, needs_verification, last_verified_on").order("name"),
    supabase.from("courses").select("id, name, university_id, needs_verification, tuition_note").order("name"),
  ]);
  const profile = asRow(profileData);
  const student = asRow(studentData);
  const finance = asRow(financeData);
  const courseNote = asRows(courseData).find((course) => asString(course.id) === asString(student?.course_id));

  return (
    <div className="stack-lg">
      <div>
        <h1>Your profile</h1>
        <p className="muted">The practice score compares what you say with what you save here, and with the course record. If that record is flagged, check the official page before you treat it as fact.</p>
        {courseNote?.needs_verification === true ? <p className="banner banner-warn">{asString(courseNote.tuition_note) || "This course record still needs verification."}</p> : null}
      </div>
      <ProfileForm
        universities={asRows(universityData).map((university) => ({ id: asString(university.id) ?? "", label: asString(university.name) ?? "University" }))}
        courses={asRows(courseData).map((course) => ({
          id: asString(course.id) ?? "",
          label: asString(course.name) ?? "Course",
          universityId: asString(course.university_id) ?? undefined,
        }))}
        values={{
          fullName: asString(profile?.full_name) ?? "",
          homeCountry: asString(profile?.home_country) ?? "",
          universityId: asString(student?.university_id) ?? "",
          courseId: asString(student?.course_id) ?? "",
          previousQualification: asString(student?.previous_qualification) ?? "",
          englishTest: asString(student?.english_test) ?? "",
          accommodationPlan: asString(student?.accommodation_plan) ?? "",
          accommodationCost: asNumber(student?.accommodation_cost_gbp)?.toString() ?? "",
          accommodationDistance: asString(student?.accommodation_distance) ?? "",
          careerGoal: asString(student?.career_goal) ?? "",
          tuitionFee: asNumber(finance?.tuition_fee_gbp)?.toString() ?? "",
          depositPaid: asNumber(finance?.deposit_paid_gbp)?.toString() ?? "",
          sponsorName: asString(finance?.sponsor_name) ?? "",
          sponsorOccupation: asString(finance?.sponsor_occupation) ?? "",
          sponsorIncome: asString(finance?.sponsor_income) ?? "",
        }}
      />
    </div>
  );
}
