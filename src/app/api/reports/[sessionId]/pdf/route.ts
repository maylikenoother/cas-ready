import { createClient } from "@/lib/supabase/server";
import { buildReportPdf } from "@/lib/report-pdf";
import { bandLabel, type Band } from "@/lib/bands";
import { asNumber, asRow, asRows, asString, asStringList, categoryLabel, formatWhen } from "@/lib/text";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in to continue.", { status: 401 });

  const { data: sessionData } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", auth.user.id).maybeSingle();
  const session = asRow(sessionData);
  if (!session || asString(session.status) !== "completed") {
    return new Response("The report is not ready.", { status: 404 });
  }
  const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle();
  const { data: studentData } = await supabase.from("student_profiles").select("university_id, course_id").eq("user_id", auth.user.id).maybeSingle();
  const student = asRow(studentData);
  const { data: courseData } = asString(student?.course_id)
    ? await supabase.from("courses").select("name").eq("id", asString(student?.course_id) ?? "").maybeSingle()
    : { data: null };
  const { data: universityData } = asString(student?.university_id)
    ? await supabase.from("universities").select("name").eq("id", asString(student?.university_id) ?? "").maybeSingle()
    : { data: null };
  const { data: questionData } = await supabase
    .from("session_questions")
    .select("id, position, prompt")
    .eq("session_id", sessionId)
    .order("position");
  const { data: answerData } = await supabase.from("answers").select("session_question_id, answer_score, transcript, ai_feedback").eq("session_id", sessionId);
  const answers = new Map(asRows(answerData).map((answer) => [asString(answer.session_question_id), answer]));
  const categories = asRow(session.category_scores) ?? {};
  const band = asString(session.band);
  const bytes = await buildReportPdf({
    studentName: asString(asRow(profileData)?.full_name) ?? "Student",
    course: asString(asRow(courseData)?.name) ?? "",
    university: asString(asRow(universityData)?.name) ?? "",
    completedAt: formatWhen(asString(session.completed_at)),
    mode: asString(session.mode) ?? "practice",
    partial: session.partial === true,
    overall: asNumber(session.overall_score),
    band: band === "green" || band === "amber" || band === "red" ? bandLabel(band as Band) : null,
    bandWithheld: session.band_withheld === true,
    categories: Object.entries(categories)
      .map(([key, value]) => ({ label: categoryLabel(key), score: asNumber(value) ?? 0 }))
      .filter((item) => item.label),
    summary: asString(session.summary) ?? "",
    answers: asRows(questionData).map((question) => {
      const answer = answers.get(asString(question.id));
      const feedback = asRow(answer?.ai_feedback);
      return {
        position: asNumber(question.position) ?? 0,
        prompt: asString(question.prompt) ?? "",
        score: asNumber(answer?.answer_score),
        transcript: (asString(answer?.transcript) ?? "").slice(0, 700),
        improvements: asStringList(feedback?.improvements).slice(0, 3),
      };
    }),
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cas-ready-practice-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
