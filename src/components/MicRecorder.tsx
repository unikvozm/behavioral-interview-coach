import { useEffect, useRef, useState } from "react";

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

interface MicRecorderProps {
  onRecordingChange: (result: RecordingResult | null) => void;
  disabled?: boolean;
  fallbackText: string;
  onFallbackTextChange: (text: string) => void;
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of candidates) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return "";
}

export default function MicRecorder({
  onRecordingChange,
  disabled,
  fallbackText,
  onFallbackTextChange,
}: MicRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        onRecordingChange({ blob, mimeType: mimeType || "audio/webm", durationSeconds });
        setHasRecording(true);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      setHasRecording(false);
      setSeconds(0);
      onRecordingChange(null);
      timerRef.current = window.setInterval(() => {
        setSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 250);
    } catch {
      setError(
        "Microphone access was blocked or unavailable. Allow microphone access, or type your answer below instead."
      );
      setSupported(false);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    window.clearInterval(timerRef.current);
  }

  function reRecord() {
    setHasRecording(false);
    onRecordingChange(null);
  }

  if (!supported) {
    return (
      <div className="mic-fallback">
        <p>
          {error ??
            "Your browser doesn't support in-browser audio recording. You can still type your answer below."}
        </p>
        <textarea
          className="transcript-input"
          value={fallbackText}
          onChange={(e) => onFallbackTextChange(e.target.value)}
          placeholder="Type your STAR-format answer here…"
          rows={8}
        />
      </div>
    );
  }

  return (
    <div className="mic-recorder">
      {!hasRecording && (
        <button
          type="button"
          className={`mic-button ${isRecording ? "is-recording" : ""}`}
          onClick={isRecording ? stop : start}
          disabled={disabled}
        >
          <span className="mic-dot" aria-hidden="true" />
          {isRecording ? `Stop recording (${seconds}s)` : "Start recording"}
        </button>
      )}

      {hasRecording && (
        <div className="recording-done">
          <span className="recording-done-label">✓ Recorded {seconds}s of audio</span>
          <button type="button" className="ghost-button" onClick={reRecord} disabled={disabled}>
            Re-record
          </button>
        </div>
      )}

      {isRecording && <p className="mic-hint">Listening… speak your STAR answer, then press Stop.</p>}
      {error && <p className="mic-error">{error}</p>}
      <p className="mic-note">
        Your voice is transcribed accurately on the server (Groq Whisper) when you click Estimate —
        it's far more reliable than the browser's built-in live transcription. The audio itself is
        discarded immediately after transcription, never saved.
      </p>
    </div>
  );
}
