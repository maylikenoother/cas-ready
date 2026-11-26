import { redirect } from "next/navigation";
import { InterviewRoom } from "@/components/interview/room";
import { loadProfile, requireUser } from "@/lib/auth";
import { asNumber, asRow, asRows, asString, asStringList } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function InterviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(user.id);
  const { data: sessionData } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  const session = asRow(sessionData);
  if (!session) redirect("/interview/new");
  if (asString(session.status) === "completed") redirect(`/interview/${sessionId}/report`);

  const { data: questionData } = await supabase
    .from("session_questions")
    .select("id, position, prompt, question_id")
    .eq("session_id", sessionId)
    .order("position");
  const sessionQuestions = asRows(questionData);
  const ids = sessionQuestions.map((question) => asString(question.question_id)).filter((id): id is string => Boolean(id));
  const { data: bankData } = ids.length
    ? await supabase.from("questions").select("id, category, hints").in("id", ids)
    : { data: [] };
  const bank = new Map(asRows(bankData).map((question) => [asString(question.id), question]));
  const { data: answerData } = await supabase.from("answers").select("session_question_id, transcript").eq("session_id", sessionId);
  const answered = new Set(
    asRows(answerData)
      .filter((answer) => asString(answer.transcript))
      .map((answer) => asString(answer.session_question_id)),
  );
  const mode = (asString(session.mode) ?? "practice") as "trial" | "practice" | "mock";
  const questions = sessionQuestions.map((question) => {
    const source = bank.get(asString(question.question_id));
    return {
      sessionQuestionId: asString(question.id) ?? "",
      position: asNumber(question.position) ?? 0,
      prompt: asString(question.prompt) ?? "",
      hints: mode === "practice" ? asStringList(source?.hints) : [],
      category: asString(source?.category) ?? "course",
    };
  });
  const startIndex = questions.findIndex((question) => !answered.has(question.sessionQuestionId));

  return (
    <InterviewRoom
      sessionId={sessionId}
      userId={user.id}
      mode={mode}
      answerSeconds={asNumber(session.answer_seconds) ?? 60}
      prepSeconds={asNumber(session.prep_seconds) ?? 15}
      questions={questions}
      startIndex={startIndex === -1 ? questions.length : startIndex}
      consented={Boolean(profile.recordingConsentAt)}
    />
  );
}
