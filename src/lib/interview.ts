import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideAccess, accessMessage, type SessionMode } from "@/lib/entitlements";
import { selectQuestions, renderPrompt } from "@/lib/questions";
import { aggregateAnswers, scoreAnswer } from "@/lib/scoring";
import { bandLabel } from "@/lib/bands";
import { startSessionSchema, answerPayloadSchema } from "@/lib/validation";
import { retentionDays } from "@/lib/env";
import { transcribeAndCoach, coachReport } from "@/lib/gemini/client";
import {
  asNumber,
  asRow,
  asRows,
  asString,
  asStringList,
  categoryLabel,
  safeVideoPath,
  templateSummary,
} from "@/lib/text";

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function startInterview(userId: string, body: unknown): Promise<Result<{ sessionId: string; resumed: boolean }>> {
  const parsed = startSessionSchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: "Check the interview settings and try again." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 500, error: "The server database key is not configured." };

  const mode = parsed.data.mode;
  const { data: profileData } = await admin.from("profiles").select("trial_consumed, home_country").eq("id", userId).maybeSingle();
  const profile = asRow(profileData);
  const { data: studentData } = await admin
    .from("student_profiles")
    .select("university_id, course_id")
    .eq("user_id", userId)
    .maybeSingle();
  const student = asRow(studentData);
  const { data: subscriptionData } = await admin
    .from("subscriptions")
    .select("status, mock_quota, mocks_remaining, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  const subscription = asRow(subscriptionData);

  const { data: openData } = await admin
    .from("sessions")
    .select("id, mode, status")
    .eq("user_id", userId)
    .in("status", ["ready", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const open = asRow(openData);
  if (open && asString(open.mode) === mode && asString(open.id)) {
    return { ok: true, data: { sessionId: asString(open.id) as string, resumed: true } };
  }

  const decision = decideAccess({
    mode,
    trialConsumed: profile?.trial_consumed === true,
    subscription: subscription
      ? {
          status: asString(subscription.status) ?? "",
          mockQuota: asNumber(subscription.mock_quota),
          mocksRemaining: asNumber(subscription.mocks_remaining),
          periodEnd: asString(subscription.current_period_end),
        }
      : null,
  });
  if (!decision.ok) return { ok: false, status: 402, error: accessMessage(decision.reason) };

  let creditConsumed = false;
  if (decision.consume === "mock") {
    const { data: creditData, error: creditError } = await admin.rpc("consume_mock_credit", { p_user_id: userId });
    if (creditError || asRows(creditData).length === 0) {
      return { ok: false, status: 402, error: accessMessage("no_mocks_left") };
    }
    creditConsumed = true;
  }

  const { data: questionData } = await admin
    .from("questions")
    .select("id, category, prompt_template")
    .eq("active", true);
  const bank = asRows(questionData)
    .map((question) => ({
      id: asString(question.id) ?? "",
      category: asString(question.category) ?? "",
      prompt_template: asString(question.prompt_template) ?? "",
    }))
    .filter((question) => question.id && question.prompt_template);

  const count = mode === "trial" ? 1 : parsed.data.questionCount;
  const selected = selectQuestions(bank, {
    mode,
    count,
    categories: mode === "practice" ? parsed.data.categories : undefined,
  });
  if (selected.length === 0) {
    if (creditConsumed) await admin.rpc("refund_mock_credit", { p_user_id: userId });
    return { ok: false, status: 500, error: "The question bank is empty. Run the seed migration." };
  }

  const context = await promptContext(admin, userId, student, asString(profile?.home_country));
  const partial = mode === "trial" || selected.length < 6;
  const { data: sessionData, error: sessionError } = await admin
    .from("sessions")
    .insert({
      user_id: userId,
      mode,
      status: "ready",
      university_id: context.universityId,
      course_id: context.courseId,
      answer_seconds: parsed.data.answerSeconds,
      prep_seconds: 15,
      question_count: selected.length,
      partial,
      credit_consumed: creditConsumed,
    })
    .select("id")
    .single();
  const session = asRow(sessionData);
  const sessionId = asString(session?.id);
  if (sessionError || !sessionId) {
    if (creditConsumed) await admin.rpc("refund_mock_credit", { p_user_id: userId });
    return { ok: false, status: 500, error: "The interview could not be started." };
  }

  const rows = selected.map((question, index) => ({
    session_id: sessionId,
    question_id: question.id,
    position: index + 1,
    prompt: renderPrompt(question.prompt_template, context.prompt),
  }));
  const { error: questionError } = await admin.from("session_questions").insert(rows);
  if (questionError) {
    await admin.from("sessions").delete().eq("id", sessionId);
    if (creditConsumed) await admin.rpc("refund_mock_credit", { p_user_id: userId });
    return { ok: false, status: 500, error: "The questions could not be saved." };
  }

  return { ok: true, data: { sessionId, resumed: false } };
}

export async function saveAnswer(userId: string, sessionId: string, body: unknown): Promise<Result<Record<string, unknown>>> {
  const parsed = answerPayloadSchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: "That answer could not be read. Try again." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 500, error: "The server database key is not configured." };

  const { data: sessionData } = await admin.from("sessions").select("*").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  const session = asRow(sessionData);
  if (!session) return { ok: false, status: 404, error: "That interview was not found." };
  if (asString(session.status) === "completed") return { ok: false, status: 409, error: "This interview is already finished." };

  const { data: questionData } = await admin
    .from("session_questions")
    .select("id, question_id, prompt, position")
    .eq("id", parsed.data.sessionQuestionId)
    .eq("session_id", sessionId)
    .maybeSingle();
  const sessionQuestion = asRow(questionData);
  if (!sessionQuestion) return { ok: false, status: 404, error: "That question is not part of this interview." };

  const { data: bankData } = await admin
    .from("questions")
    .select("category, concepts, fact_keys")
    .eq("id", asString(sessionQuestion.question_id) ?? "")
    .maybeSingle();
  const bankQuestion = asRow(bankData);
  const mode = (asString(session.mode) ?? "practice") as SessionMode;
  const { data: existingData } = await admin
    .from("answers")
    .select("id, transcript")
    .eq("session_question_id", parsed.data.sessionQuestionId)
    .maybeSingle();
  const existing = asRow(existingData);
  if (existing && mode !== "practice" && !parsed.data.typedNotes && asString(existing.transcript)) {
    return { ok: false, status: 409, error: "This mock does not allow a second recording of the same question." };
  }

  const context = await loadScoringContext(admin, userId);
  const supplied = (parsed.data.transcript || parsed.data.typedNotes || "").trim();
  let ai: Awaited<ReturnType<typeof transcribeAndCoach>> = null;
  if (supplied || parsed.data.audioBase64) {
    ai = await transcribeAndCoach({
      question: asString(sessionQuestion.prompt) ?? "",
      profile: context.profileText,
      courseRecord: context.courseText,
      metrics: `delay ${parsed.data.speechDelayMs}ms, longest silence ${parsed.data.longestSilenceMs}ms, speaking ratio ${parsed.data.speakingRatio}`,
      transcript: supplied || null,
      audioBase64: parsed.data.audioBase64,
      audioMime: parsed.data.audioMime,
    });
  }
  const transcript = (supplied || ai?.transcript || "").trim().slice(0, 8000);
  const scored = scoreAnswer({
    transcript,
    durationMs: parsed.data.durationMs,
    answerSeconds: asNumber(session.answer_seconds) ?? 60,
    speechDelayMs: parsed.data.speechDelayMs,
    longestSilenceMs: parsed.data.longestSilenceMs,
    speakingRatio: parsed.data.speakingRatio,
    concepts: asStringList(bankQuestion?.concepts),
    savedFacts: context.facts,
    finance: context.finance,
    isFinance: asString(bankQuestion?.category) === "finance",
    ai: ai ? { relevance: ai.relevance, specificity: ai.specificity } : null,
  });

  const videoPath = safeVideoPath(userId, parsed.data.videoPath);
  const payload = {
    session_id: sessionId,
    session_question_id: parsed.data.sessionQuestionId,
    user_id: userId,
    transcript: transcript || null,
    typed_notes: parsed.data.typedNotes?.trim() || null,
    duration_ms: parsed.data.durationMs,
    speech_delay_ms: parsed.data.speechDelayMs,
    longest_silence_ms: parsed.data.longestSilenceMs,
    speaking_ratio: parsed.data.speakingRatio,
    delivery_score: scored.deliveryScore,
    content_score: scored.contentScore,
    answer_score: scored.answerScore,
    concepts_hit: scored.conceptsHit,
    concepts_missed: scored.conceptsMissed,
    flags: scored.flags,
    ai_feedback: ai,
    video_path: videoPath,
    audio_sent_to_ai: Boolean(parsed.data.audioBase64),
    left_screen_count: parsed.data.leftScreenCount ?? 0,
    retain_until: new Date(Date.now() + retentionDays() * 86_400_000).toISOString(),
  };

  const write = existing
    ? await admin.from("answers").update(payload).eq("id", asString(existing.id) ?? "").select("id").single()
    : await admin.from("answers").insert(payload).select("id").single();
  if (write.error) return { ok: false, status: 500, error: "The answer could not be saved." };

  if (asString(session.status) === "ready") {
    await admin.from("sessions").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", sessionId);
  }
  if (mode === "trial") await admin.rpc("mark_trial_used", { p_user_id: userId });

  return {
    ok: true,
    data: {
      answerId: asString(asRow(write.data)?.id),
      transcript: transcript || null,
      deliveryScore: scored.deliveryScore,
      contentScore: scored.contentScore,
      answerScore: scored.answerScore,
      conceptsHit: scored.conceptsHit,
      conceptsMissed: scored.conceptsMissed,
      flags: scored.flags,
      feedback: ai
        ? {
            strengths: ai.strengths,
            improvements: ai.improvements,
            outline: ai.suggested_answer_outline,
            consistencyNotes: ai.consistency_notes,
            clarity: ai.clarity,
          }
        : null,
    },
  };
}

export async function completeInterview(userId: string, sessionId: string): Promise<Result<Record<string, unknown>>> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 500, error: "The server database key is not configured." };
  const { data: sessionData } = await admin.from("sessions").select("*").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  const session = asRow(sessionData);
  if (!session) return { ok: false, status: 404, error: "That interview was not found." };

  const { data: questionsData } = await admin
    .from("session_questions")
    .select("id, position, prompt, question_id")
    .eq("session_id", sessionId)
    .order("position");
  const questions = asRows(questionsData);
  const { data: answersData } = await admin.from("answers").select("*").eq("session_id", sessionId);
  const answers = asRows(answersData);
  if (answers.length === 0) return { ok: false, status: 400, error: "Record at least one answer before finishing." };

  const questionIds = questions.map((question) => asString(question.question_id)).filter((id): id is string => Boolean(id));
  const { data: bankData } = await admin.from("questions").select("id, category").in("id", questionIds);
  const categories = new Map(asRows(bankData).map((question) => [asString(question.id), asString(question.category) ?? "course"]));
  const byQuestion = new Map(answers.map((answer) => [asString(answer.session_question_id), answer]));

  const aggregate = aggregateAnswers(
    questions.flatMap((question) => {
      const answer = byQuestion.get(asString(question.id));
      if (!answer) return [];
      return [{
        category: categories.get(asString(question.question_id)) ?? "course",
        answerScore: asNumber(answer.answer_score) ?? 0,
        deliveryScore: asNumber(answer.delivery_score) ?? 0,
        contentScore: asNumber(answer.content_score),
      }];
    }),
  );

  const excerpts = questions
    .map((question) => {
      const answer = byQuestion.get(asString(question.id));
      const text = asString(answer?.transcript) ?? "";
      return `${asNumber(question.position)}. ${asString(question.prompt)} — ${text.slice(0, 240)}`;
    })
    .join("\n");
  const narrative = await coachReport({
    scores: JSON.stringify(aggregate.categories),
    excerpts: excerpts.slice(0, 4000),
  });
  const summary = narrative?.summary
    ? `${narrative.summary} This is practice feedback. It does not predict a CAS or a visa.`
    : templateSummary(aggregate.overall, aggregate.band ? bandLabel(aggregate.band) : null, aggregate.categories);

  await admin
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      overall_score: aggregate.overall,
      band: aggregate.band,
      band_withheld: aggregate.bandWithheld,
      category_scores: aggregate.categories,
      summary,
    })
    .eq("id", sessionId);

  return {
    ok: true,
    data: {
      overall: aggregate.overall,
      band: aggregate.band,
      bandWithheld: aggregate.bandWithheld,
      categories: aggregate.categories,
      summary,
      nextSteps: narrative?.next_steps ?? [],
    },
  };
}

export async function abandonInterview(userId: string, sessionId: string): Promise<Result<{ refunded: boolean }>> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, status: 500, error: "The server database key is not configured." };
  const { data: sessionData } = await admin
    .from("sessions")
    .select("id, status, credit_consumed, mode")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const session = asRow(sessionData);
  if (!session) return { ok: false, status: 404, error: "That interview was not found." };
  if (asString(session.status) === "completed") return { ok: false, status: 409, error: "A finished interview stays in your history." };

  const { count } = await admin.from("answers").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  let refunded = false;
  if ((count ?? 0) === 0 && session.credit_consumed === true) {
    await admin.rpc("refund_mock_credit", { p_user_id: userId });
    refunded = true;
  }
  await admin.from("sessions").update({ status: "abandoned", credit_consumed: refunded ? false : session.credit_consumed }).eq("id", sessionId);
  return { ok: true, data: { refunded } };
}

async function promptContext(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  student: Record<string, unknown> | null,
  homeCountry: string | null,
) {
  const universityId = asString(student?.university_id);
  const courseId = asString(student?.course_id);
  const { data: universityData } = universityId
    ? await admin.from("universities").select("name, city").eq("id", universityId).maybeSingle()
    : { data: null };
  const { data: courseData } = courseId
    ? await admin.from("courses").select("name").eq("id", courseId).maybeSingle()
    : { data: null };
  const university = asRow(universityData);
  const course = asRow(courseData);
  return {
    universityId,
    courseId,
    prompt: {
      course: asString(course?.name) ?? "",
      university: asString(university?.name) ?? "",
      city: asString(university?.city) ?? "",
      country: homeCountry ?? "",
    },
  };
}

async function loadScoringContext(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data: profileData } = await admin.from("profiles").select("full_name, home_country").eq("id", userId).maybeSingle();
  const { data: studentData } = await admin.from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
  const { data: financeData } = await admin.from("student_finance_private").select("*").eq("user_id", userId).maybeSingle();
  const profile = asRow(profileData);
  const student = asRow(studentData);
  const finance = asRow(financeData);
  const courseId = asString(student?.course_id);
  const universityId = asString(student?.university_id);
  const { data: courseData } = courseId ? await admin.from("courses").select("*").eq("id", courseId).maybeSingle() : { data: null };
  const { data: universityData } = universityId
    ? await admin.from("universities").select("*").eq("id", universityId).maybeSingle()
    : { data: null };
  const course = asRow(courseData);
  const university = asRow(universityData);
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  const moduleNames = modules
    .map((item) => asString(asRow(item)?.name))
    .filter((name): name is string => Boolean(name));
  const facts = [
    asString(course?.name),
    asString(university?.name),
    asString(university?.city),
    asString(profile?.home_country),
    asString(student?.career_goal),
    asString(finance?.sponsor_name),
    asNumber(finance?.tuition_fee_gbp)?.toString() ?? null,
    asNumber(finance?.deposit_paid_gbp)?.toString() ?? null,
    asNumber(student?.accommodation_cost_gbp)?.toString() ?? null,
    ...moduleNames,
  ].filter((fact): fact is string => Boolean(fact));

  const verification = course?.needs_verification === true ? "Course record needs verification against the official page." : "Course record was marked verified on the date stored with it.";
  return {
    facts,
    finance: {
      tuition: asNumber(finance?.tuition_fee_gbp),
      deposit: asNumber(finance?.deposit_paid_gbp),
      rent: asNumber(student?.accommodation_cost_gbp),
    },
    profileText: [
      `Name: ${asString(profile?.full_name) ?? "not set"}`,
      `Country: ${asString(profile?.home_country) ?? "not set"}`,
      `Career goal: ${asString(student?.career_goal) ?? "not set"}`,
      `Sponsor: ${asString(finance?.sponsor_name) ?? "not set"} (${asString(finance?.sponsor_occupation) ?? "occupation not set"})`,
      `Tuition on profile: ${asNumber(finance?.tuition_fee_gbp) ?? "not set"}`,
      `Deposit on profile: ${asNumber(finance?.deposit_paid_gbp) ?? "not set"}`,
    ].join(". "),
    courseText: [
      `${asString(university?.name) ?? "University not set"}, ${asString(course?.name) ?? "course not set"}.`,
      `Modules: ${moduleNames.join(", ") || "none stored"}.`,
      `Tuition on record: ${asNumber(course?.tuition_fee_gbp) ?? "not stored"}. ${asString(course?.tuition_note) ?? ""}`,
      verification,
      `Source: ${asString(course?.official_url) ?? "none"}.`,
    ].join(" "),
  };
}

export function labelMap(categories: Record<string, number>): Array<{ key: string; label: string; score: number }> {
  return Object.entries(categories).map(([key, score]) => ({ key, label: categoryLabel(key), score }));
}
