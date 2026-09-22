// Voice notes — capture a short spoken note in the browser (MediaRecorder),
// send it to the `transcribe` Edge Function (Gemini), and hand back the text.
// The transcript is then fed into the normal diary flow, so speaking and typing
// share one pipeline.
//
// Web only: MediaRecorder / getUserMedia don't exist in the native Expo Go
// runtime, so on native `supported` is false and the mic button hides.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

// Cap a note so payloads stay small and transcription stays fast.
const MAX_MS = 120_000;

// Prefer formats that both browsers can record AND Gemini can read. Chrome
// records webm/opus; iOS/desktop Safari records mp4/aac.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickMime(): string | undefined {
  const MR = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder;
  if (!MR?.isTypeSupported) return undefined;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MR.isTypeSupported(m)) return m;
    } catch {
      // ignore and keep trying
    }
  }
  return undefined; // let the browser choose its default
}

export function isVoiceSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  const g = globalThis as {
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
    MediaRecorder?: unknown;
  };
  return Boolean(g.navigator?.mediaDevices?.getUserMedia && g.MediaRecorder);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return (globalThis as { btoa: (s: string) => string }).btoa(binary);
}

/**
 * Records a short voice note and calls `onTranscript` with the recognised text.
 * `toggle()` starts recording when idle and stops (then transcribes) when
 * recording. Returns UI state so the caller can render the mic button.
 */
export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => cleanupStream, [cleanupStream]);

  const transcribe = useCallback(async (blob: Blob, mimeType: string) => {
    setState('transcribing');
    try {
      const audio = await blobToBase64(blob);
      if (!audio) {
        setError("That recording came through empty — try again.");
        setState('idle');
        return;
      }
      const { data, error: fnErr } = await supabase.functions.invoke('transcribe', {
        body: { audio, mimeType },
      });
      if (fnErr) {
        setError('The voice AI is unreachable right now. Please try again, or type instead.');
        setState('idle');
        return;
      }
      const p = data as { text?: string; error?: string } | null;
      if (!p || p.error) {
        setError(p?.error ?? "Couldn't transcribe that. Please try again.");
        setState('idle');
        return;
      }
      const text = (p.text ?? '').trim();
      if (!text) {
        setError("I couldn't hear anything — try again a little louder.");
        setState('idle');
        return;
      }
      onTranscriptRef.current(text);
      setState('idle');
    } catch {
      setError("Couldn't process that recording. Please try again.");
      setState('idle');
    }
  }, []);

  const start = useCallback(async () => {
    if (!isVoiceSupported()) {
      setError('Voice notes need a browser with microphone access.');
      return;
    }
    setError(null);
    cancelledRef.current = false;
    try {
      const stream = await (
        globalThis as { navigator: { mediaDevices: { getUserMedia: (c: unknown) => Promise<MediaStream> } } }
      ).navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const MR = (globalThis as { MediaRecorder: new (s: MediaStream, o?: { mimeType?: string }) => MediaRecorder })
        .MediaRecorder;
      const recorder = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const usedMime = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: usedMime });
        cleanupStream();
        if (cancelledRef.current) {
          setState('idle');
          return;
        }
        if (blob.size === 0) {
          setError("That recording came through empty — try again.");
          setState('idle');
          return;
        }
        transcribe(blob, usedMime);
      };

      recorder.start();
      setState('recording');
      timerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, MAX_MS);
    } catch (err) {
      cleanupStream();
      const name = (err as { name?: string })?.name;
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access was blocked. Enable it in your browser to record.'
          : "Couldn't start recording. Please check your microphone.",
      );
      setState('idle');
    }
  }, [cleanupStream, transcribe]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const toggle = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle') start();
  }, [state, start, stop]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else cleanupStream();
    setState('idle');
    setError(null);
  }, [cleanupStream]);

  return { supported: isVoiceSupported(), state, error, toggle, cancel };
}
