"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { DeviceCheck } from "@/components/device-check";
import { emptySpeech, finaliseSpeech, rmsFromTimeDomain, stepSpeech, type SpeechStats } from "@/lib/speech";

export type RoomQuestion = {
  sessionQuestionId: string;
  position: number;
  prompt: string;
  hints: string[];
  category: string;
};

type Feedback = {
  transcript: string | null;
  answerScore: number;
  deliveryScore: number;
  contentScore: number | null;
  flags: string[];
  feedback: null | {
    strengths: string[];
    improvements: string[];
    outline: string[];
    consistencyNotes: string[];
  };
};

type Phase = "consent" | "device" | "prep" | "record" | "type" | "review" | "save" | "notes" | "feedback";

export function InterviewRoom({
  sessionId,
  userId,
  mode,
  answerSeconds,
  prepSeconds,
  questions,
  startIndex,
  consented,
}: {
  sessionId: string;
  userId: string;
  mode: "trial" | "practice" | "mock";
  answerSeconds: number;
  prepSeconds: number;
  questions: RoomQuestion[];
  startIndex: number;
  consented: boolean;
}) {
  const { getToken } = useAuth();
  const [phase, setPhase] = useState<Phase>(consented ? "device" : "consent");
  const [typedOnly, setTypedOnly] = useState(false);
  const [index, setIndex] = useState(startIndex);
  const [secondsLeft, setSecondsLeft] = useState(prepSeconds);
  const [error, setError] = useState("");
  const [practiceOnly, setPracticeOnly] = useState(false);
  const [alone, setAlone] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statsRef = useRef<SpeechStats>(emptySpeech());
  const blobsRef = useRef<{ video: Blob; audio: Blob } | null>(null);
  const leftRef = useRef(0);
  const question = questions[index];
  const allowRerecord = mode === "practice";

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      window.speechSynthesis?.cancel();
    };
  }, [reviewUrl]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "record" && phase !== "type") return;
    const total = phase === "prep" ? prepSeconds : answerSeconds;
    const started = Date.now();
    setSecondsLeft(total);
    const timer = window.setInterval(() => {
      const left = Math.max(0, total - Math.floor((Date.now() - started) / 1000));
      setSecondsLeft(left);
      if (left <= 0) window.clearInterval(timer);
    }, 200);
    const done = window.setTimeout(() => {
      if (phase === "prep") void beginAnswer();
      if (phase === "record") void stopRecording(false);
      if (phase === "type") void submitTyped();
    }, total * 1000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(done);
    };
    // beginAnswer is stable enough for a timer that restarts when the phase changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, prepSeconds, answerSeconds]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (phase !== "record" || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [phase]);

  useEffect(() => {
    if (phase !== "record") return;
    const onHide = () => {
      if (document.hidden) leftRef.current += 1;
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

  async function acceptConsent() {
    setError("");
    const response = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "recording", accepted: true }),
    });
    if (!response.ok) {
      setError("Consent could not be saved, so the camera will stay off.");
      return;
    }
    setPhase("device");
  }

  async function openStream() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    return stream;
  }

  async function beginAnswer() {
    setError("");
    leftRef.current = 0;
    statsRef.current = emptySpeech();
    if (typedOnly) {
      setDraft("");
      setPhase("type");
      return;
    }
    try {
      const stream = streamRef.current?.active ? streamRef.current : await openStream();
      const videoMime = pickMime(["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]);
      const audioMime = pickMime(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
      const videoRecorder = new MediaRecorder(stream, videoMime ? { mimeType: videoMime, videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 } : undefined);
      let audioRecorder: MediaRecorder | null = null;
      try {
        audioRecorder = new MediaRecorder(stream, audioMime ? { mimeType: audioMime, audioBitsPerSecond: 32_000 } : undefined);
      } catch {
        audioRecorder = null;
      }
      const videoDone = collect(videoRecorder);
      const audioDone = audioRecorder ? collect(audioRecorder) : async () => new Blob();
      videoRecorder.start();
      audioRecorder?.start();
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const bins = new Uint8Array(analyser.fftSize);
      let last = performance.now();
      const meter = window.setInterval(() => {
        analyser.getByteTimeDomainData(bins);
        const now = performance.now();
        statsRef.current = stepSpeech(statsRef.current, rmsFromTimeDomain(bins), now - last);
        last = now;
      }, 100);
      blobsRef.current = null;
      (videoRef.current as HTMLVideoElement & { __stop?: () => Promise<void> }).__stop = async () => {
        window.clearInterval(meter);
        await audioContext.close().catch(() => undefined);
        const [video, audio] = await Promise.all([videoDone(), audioDone()]);
        blobsRef.current = { video, audio };
      };
      setPhase("record");
    } catch {
      setError("The camera stopped. You can finish this question by typing.");
      setTypedOnly(true);
      setPhase("type");
    }
  }

  async function stopRecording(discard: boolean) {
    const stopper = (videoRef.current as HTMLVideoElement & { __stop?: () => Promise<void> } | null)?.__stop;
    if (stopper) await stopper();
    if (discard) {
      blobsRef.current = null;
      setPhase("prep");
      return;
    }
    if (allowRerecord && blobsRef.current) {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      setReviewUrl(URL.createObjectURL(blobsRef.current.video));
      setPhase("review");
      return;
    }
    await persist(blobsRef.current);
  }

  async function submitTyped() {
    await persist(null, draft);
  }

  async function persist(blobs: { video: Blob; audio: Blob } | null, typed?: string) {
    if (!question) return;
    setPhase("save");
    setError("");
    const durationMs = answerSeconds * 1000;
    const metrics = finaliseSpeech(statsRef.current, durationMs);
    let videoPath: string | undefined;
    if (blobs && blobs.video.size > 0) {
      videoPath = await uploadVideo(userId, sessionId, question.sessionQuestionId, blobs.video, () => getToken()) ?? undefined;
    }
    let audioBase64: string | undefined;
    let audioMime: string | undefined;
    if (blobs && blobs.audio.size > 0 && blobs.audio.size < 3_500_000) {
      audioBase64 = await blobToBase64(blobs.audio);
      audioMime = blobs.audio.type || "audio/webm";
    }
    const response = await fetch(`/api/sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionQuestionId: question.sessionQuestionId,
        transcript: typed?.trim() || undefined,
        typedNotes: typed?.trim() || undefined,
        durationMs,
        speechDelayMs: typed ? 0 : metrics.speechDelayMs,
        longestSilenceMs: typed ? 0 : metrics.longestSilenceMs,
        speakingRatio: typed ? 1 : metrics.speakingRatio,
        videoPath,
        audioBase64,
        audioMime,
        leftScreenCount: leftRef.current,
        replace: allowRerecord,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "The answer could not be saved.");
      setPhase(typedOnly ? "type" : "review");
      return;
    }
    const nextFeedback = body as Feedback;
    setFeedback(nextFeedback);
    if (allowRerecord) {
      setPhase("feedback");
      return;
    }
    if (!nextFeedback.transcript) {
      setDraft("");
      setPhase("notes");
      return;
    }
    advance();
  }

  function advance() {
    if (index + 1 >= questions.length) {
      void finish();
      return;
    }
    setFeedback(null);
    setIndex((value) => value + 1);
    setPhase("prep");
  }

  async function finish() {
    setPhase("save");
    const response = await fetch(`/api/sessions/${sessionId}/complete`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "The report could not be finished.");
      return;
    }
    window.location.href = `/interview/${sessionId}/report`;
  }

  async function saveNote() {
    if (!question || !draft.trim()) {
      advance();
      return;
    }
    await fetch(`/api/sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionQuestionId: question.sessionQuestionId,
        typedNotes: draft.trim(),
        transcript: draft.trim(),
        durationMs: answerSeconds * 1000,
        speechDelayMs: 0,
        longestSilenceMs: 0,
        speakingRatio: 1,
        leftScreenCount: leftRef.current,
        replace: true,
      }),
    });
    advance();
  }

  if (!question && phase !== "save") {
    return (
      <main className="room">
        <p>This interview has no questions left.</p>
        <button className="btn btn-primary" type="button" onClick={() => void finish()}>Open the report</button>
      </main>
    );
  }

  return (
    <main className="room" id="main">
      <div className="wrap stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <a href="/home">Leave</a>
          <span>{mode === "mock" ? "Mock" : mode === "trial" ? "Free question" : "Practice"} · {Math.min(index + 1, questions.length)} of {questions.length}</span>
        </div>
        <div className="room-progress" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={Math.min(index + 1, questions.length)} aria-label="Interview progress">
          <span style={{ width: `${questions.length ? (Math.min(index + 1, questions.length) / questions.length) * 100 : 0}%` }} />
        </div>
        <p className="small">Practice only. {mode === "mock" || mode === "trial" ? "No re-record." : "You can re-record."}</p>
        {error ? <p className="banner banner-warn" role="alert">{error}</p> : null}

        {phase === "consent" ? (
          <section className="room-card">
            <h1>Before the camera comes on</h1>
            <p>We record video and audio. We do not look at your face.</p>
            <details>
              <summary>What is stored</summary>
              <p>Files stay private until you delete them. Audio may be sent to Gemini for a transcript. See the privacy notice for the tier in use.</p>
            </details>
            <label className="check">
              <input type="checkbox" checked={practiceOnly} onChange={(event) => setPracticeOnly(event.target.checked)} />
              <span>I understand this is practice only and does not predict a CAS or a visa.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={alone} onChange={(event) => setAlone(event.target.checked)} />
              <span>I am answering as myself, without someone telling me what to say.</span>
            </label>
            <button className="btn btn-primary" type="button" disabled={!practiceOnly || !alone} onClick={() => void acceptConsent()}>
              I agree, check my camera
            </button>
          </section>
        ) : null}

        {phase === "device" ? (
          <DeviceCheck
            onCamera={() => { setTypedOnly(false); setPhase("prep"); }}
            onTyped={() => { setTypedOnly(true); setPhase("prep"); }}
          />
        ) : null}

        {question && (phase === "prep" || phase === "record" || phase === "type" || phase === "review" || phase === "save" || phase === "notes" || phase === "feedback") ? (
          <section className="room-card">
            <p className="small" style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>{question.category.replaceAll("_", " ")}</p>
            <h1>{question.prompt}</h1>
            <button className="btn btn-ghost" type="button" onClick={() => speak(question.prompt)}>Read the question aloud</button>
            {allowRerecord && question.hints.length > 0 && phase !== "record" ? (
              <div>
                <p><strong>Cover these points in your own words.</strong> Do not memorise a script.</p>
                <ul>{question.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
              </div>
            ) : null}
            {phase === "prep" ? <p role="status">Read the question. Recording starts in {secondsLeft} seconds.</p> : null}
            {phase === "record" ? (
              <p className="rec" role="status"><i /> Recording · {secondsLeft}s left</p>
            ) : null}
            {(phase === "record" || phase === "review" || phase === "save") && !typedOnly ? <video ref={videoRef} className="viewfinder" muted playsInline /> : null}
            {phase === "type" ? (
              <>
                <p role="status">{secondsLeft}s left to type the answer you would have said.</p>
                <label className="field">
                  <span>Your answer</span>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
                </label>
                <button className="btn btn-primary" type="button" onClick={() => void submitTyped()}>Save this answer</button>
              </>
            ) : null}
            {phase === "review" && !reviewUrl ? (
              <button className="btn btn-primary" type="button" onClick={() => void persist(blobsRef.current)}>Try saving again</button>
            ) : null}
            {phase === "review" && reviewUrl ? (
              <>
                <video className="viewfinder" controls src={reviewUrl} />
                <div className="actions">
                  <button className="btn btn-primary" type="button" onClick={() => void persist(blobsRef.current)}>Use this take</button>
                  <button className="btn btn-secondary" type="button" onClick={() => void stopRecording(true)}>Record again</button>
                </div>
              </>
            ) : null}
            {phase === "save" ? <p role="status">Saving the answer. Keep this page open.</p> : null}
            {phase === "notes" ? (
              <>
                <p>We could not make a transcript. Type a short version of what you said if you want content feedback. You still cannot re-record.</p>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
                <button className="btn btn-primary" type="button" onClick={() => void saveNote()}>Continue</button>
              </>
            ) : null}
            {phase === "feedback" && feedback ? (
              <div className="stack">
                <p>Practice score {feedback.answerScore}. {feedback.contentScore == null ? "Delivery only, because there was no transcript." : `Content ${feedback.contentScore}, delivery ${feedback.deliveryScore}.`}</p>
                {feedback.feedback?.improvements.map((item) => <p key={item}>{item}</p>)}
                {feedback.flags.map((flag) => <p key={flag}>{flag}</p>)}
                <div className="actions">
                  <button className="btn btn-primary" type="button" onClick={advance}>Next question</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setPhase("prep")}>Record again</button>
                </div>
              </div>
            ) : null}
            {(phase === "prep" || phase === "record") ? (
              <p className="small" aria-live="polite">Time remaining {secondsLeft} seconds.</p>
            ) : null}
          </section>
        ) : null}
        {phase !== "consent" && phase !== "save" ? (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={async () => {
              await fetch(`/api/sessions/${sessionId}/abandon`, { method: "POST" });
              window.location.href = "/home";
            }}
          >
            Abandon this interview
          </button>
        ) : null}
      </div>
    </main>
  );
}

function pickMime(candidates: string[]): string {
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function collect(recorder: MediaRecorder): () => Promise<Blob> {
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  return () => new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    if (recorder.state !== "inactive") recorder.stop();
    else resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
  });
}

async function uploadVideo(
  userId: string,
  sessionId: string,
  questionId: string,
  blob: Blob,
  getToken: () => Promise<string | null>,
) {
  try {
    const { createClient } = await import("@/lib/supabase/browser");
    const supabase = createClient(getToken);
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${userId}/${sessionId}/${questionId}.${extension}`;
    const { error } = await supabase.storage.from("recordings").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "video/webm",
    });
    return error ? null : path;
  } catch {
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  window.speechSynthesis.speak(utterance);
}
