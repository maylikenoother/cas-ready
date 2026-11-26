"use client";

import { useEffect, useRef, useState } from "react";
import { averageLuminance, lightingVerdict, rmsFromTimeDomain } from "@/lib/speech";

export function DeviceCheck({ onCamera, onTyped }: { onCamera: () => void; onTyped: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [light, setLight] = useState("Not checked yet");
  const [level, setLevel] = useState(0);
  const [voice, setVoice] = useState("Say a short sentence when you are ready.");
  const [noise, setNoise] = useState("Optional. Stay quiet for two seconds.");
  const [alone, setAlone] = useState(false);
  const [passport, setPassport] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot use the camera. You can still practise with typing.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
      const audio = new AudioContext();
      const analyser = audio.createAnalyser();
      audio.createMediaStreamSource(stream).connect(analyser);
      const bins = new Uint8Array(analyser.fftSize);
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      timerRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(bins);
        setLevel(Math.min(100, Math.round(rmsFromTimeDomain(bins) * 400)));
        if (videoRef.current && context) {
          context.drawImage(videoRef.current, 0, 0, 32, 24);
          const pixels = context.getImageData(0, 0, 32, 24).data;
          const verdict = lightingVerdict(averageLuminance(pixels));
          setLight(verdict === "ok" ? "Brightness looks usable." : verdict === "dark" ? "The picture looks dark. Face a window or a lamp. This is brightness only, not a face check." : "The picture looks blown out. Turn away from a bright light.");
        }
      }, 300);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      });
    } catch {
      setError("The camera or microphone was blocked. Check the site permission, close other apps using the camera, and use https. You can still practise by typing.");
    }
  }

  function sample(ms: number, quiet: boolean) {
    const stream = streamRef.current;
    if (!stream) return;
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    audio.createMediaStreamSource(stream).connect(analyser);
    const bins = new Uint8Array(analyser.fftSize);
    let peak = 0;
    let total = 0;
    let count = 0;
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(bins);
      const rms = rmsFromTimeDomain(bins);
      peak = Math.max(peak, rms);
      total += rms;
      count += 1;
    }, 100);
    window.setTimeout(() => {
      window.clearInterval(timer);
      void audio.close();
      if (quiet) {
        const average = count ? total / count : 0;
        setNoise(average > 0.04 ? "Background noise is high. A real interview needs a quiet room." : "Background noise looks low enough to practise.");
      } else {
        setVoice(peak > 0.02 ? "We can hear you." : "We could not hear a clear voice. Move closer or check the microphone.");
      }
    }, ms);
  }

  const voiceOk = voice.startsWith("We can hear");

  return (
    <section className="room-card">
      <h1>Check the room</h1>
      <p>Brightness only. We do not look at your face.</p>
      <video ref={videoRef} className="viewfinder" muted playsInline />
      <div className="meter" aria-hidden="true"><span style={{ width: `${level}%` }} /></div>
      <p role="status">{light}</p>
      <p role="status">{voice}</p>
      <p role="status">{noise}</p>
      {error ? <p className="banner banner-warn" role="alert">{error}</p> : null}
      <div className="actions">
        <button className="btn btn-primary" type="button" onClick={start}>Open camera and microphone</button>
        <button className="btn btn-secondary" type="button" onClick={() => sample(2500, false)} disabled={!live}>Check my voice</button>
        <button className="btn btn-secondary" type="button" onClick={() => sample(2000, true)} disabled={!live}>Check background noise</button>
      </div>
      <label className="check">
        <input type="checkbox" checked={alone} onChange={(event) => setAlone(event.target.checked)} />
        <span>I am alone, in a quiet room.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={passport} onChange={(event) => setPassport(event.target.checked)} />
        <span>My passport is nearby. We do not photograph it.</span>
      </label>
      <div className="actions">
        <button className="btn btn-primary" type="button" disabled={!live || !voiceOk || !alone || !passport} onClick={() => { streamRef.current?.getTracks().forEach((track) => track.stop()); onCamera(); }}>
          Start the timed answers
        </button>
        <button className="btn btn-ghost" type="button" onClick={onTyped}>Continue without a camera</button>
      </div>
    </section>
  );
}
