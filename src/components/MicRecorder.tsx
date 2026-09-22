import { useEffect, useRef, useState } from "react";

interface MicRecorderProps {
  transcript: string;
  onTranscriptChange: (transcript: string) => void;
  disabled?: boolean;
}

function getRecognition(): SpeechRecognitionLike | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

export default function MicRecorder({ transcript, onTranscriptChange, disabled }: MicRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef(transcript);

  useEffect(() => {
    finalTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    setError(null);
    const recognition = getRecognition();
    if (!recognition) {
      setSupported(false);
      return;
    }

    recognition.onresult = (event) => {
      let interimText = "";
      let finalAddition = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalAddition += text + " ";
        } else {
          interimText += text;
        }
      }
      if (finalAddition) {
        finalTranscriptRef.current = (finalTranscriptRef.current + " " + finalAddition).trim();
        onTranscriptChange(finalTranscriptRef.current);
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. Allow microphone access and try again."
          : `Speech recognition error: ${event.error}`
      );
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  if (!supported) {
    return (
      <div className="mic-fallback">
        <p>
          Your browser doesn't support live speech-to-text (this needs Chrome, Edge, or another
          Chromium-based browser). You can still type your answer below.
        </p>
        <textarea
          className="transcript-input"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Type your STAR-format answer here…"
          rows={8}
        />
      </div>
    );
  }

  return (
    <div className="mic-recorder">
      <button
        type="button"
        className={`mic-button ${isRecording ? "is-recording" : ""}`}
        onClick={isRecording ? stop : start}
        disabled={disabled}
      >
        <span className="mic-dot" aria-hidden="true" />
        {isRecording ? "Stop recording" : "Start recording"}
      </button>
      {isRecording && <p className="mic-hint">Listening… speak your STAR answer, then press Stop.</p>}
      {error && <p className="mic-error">{error}</p>}
      <textarea
        className="transcript-input"
        value={interim ? `${transcript} ${interim}`.trim() : transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        placeholder="Your transcribed answer will appear here as you speak. You can also edit it directly."
        rows={10}
      />
    </div>
  );
}
