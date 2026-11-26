export const SPEECH_RMS = 0.02;

export type SpeechStats = {
  speechDelayMs: number | null;
  longestSilenceMs: number;
  speakingMs: number;
  elapsedMs: number;
  silenceRunMs: number;
  started: boolean;
};

export function emptySpeech(): SpeechStats {
  return {
    speechDelayMs: null,
    longestSilenceMs: 0,
    speakingMs: 0,
    elapsedMs: 0,
    silenceRunMs: 0,
    started: false,
  };
}

export function stepSpeech(prev: SpeechStats, rms: number, dtMs: number, threshold = SPEECH_RMS): SpeechStats {
  const elapsedMs = prev.elapsedMs + dtMs;
  const speaking = rms >= threshold;
  if (!prev.started) {
    if (!speaking) {
      return { ...prev, elapsedMs, speechDelayMs: elapsedMs };
    }
    return {
      ...prev,
      elapsedMs,
      started: true,
      speechDelayMs: prev.elapsedMs,
      speakingMs: prev.speakingMs + dtMs,
      silenceRunMs: 0,
    };
  }
  if (speaking) {
    return { ...prev, elapsedMs, speakingMs: prev.speakingMs + dtMs, silenceRunMs: 0 };
  }
  const silenceRunMs = prev.silenceRunMs + dtMs;
  return {
    ...prev,
    elapsedMs,
    silenceRunMs,
    longestSilenceMs: Math.max(prev.longestSilenceMs, silenceRunMs),
  };
}

export function finaliseSpeech(stats: SpeechStats, durationMs: number): {
  speechDelayMs: number;
  longestSilenceMs: number;
  speakingRatio: number;
} {
  const delay = stats.started ? (stats.speechDelayMs ?? 0) : durationMs;
  const ratio = durationMs > 0 ? Math.min(1, stats.speakingMs / durationMs) : 0;
  return {
    speechDelayMs: delay,
    longestSilenceMs: stats.longestSilenceMs,
    speakingRatio: ratio,
  };
}

export function rmsFromTimeDomain(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let index = 0; index < data.length; index += 1) {
    const value = (data[index] - 128) / 128;
    sum += value * value;
  }
  return Math.sqrt(sum / data.length);
}

export function averageLuminance(pixels: Uint8ClampedArray): number {
  if (pixels.length < 4) return 0;
  let sum = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    sum += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    count += 1;
  }
  return count ? sum / count : 0;
}

export function lightingVerdict(luminance: number): "dark" | "bright" | "ok" {
  if (luminance < 45) return "dark";
  if (luminance > 225) return "bright";
  return "ok";
}
