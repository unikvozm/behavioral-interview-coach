import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { questions } from "../data/questions";
import MicRecorder, { type RecordingResult } from "../components/MicRecorder";
import FeedbackPanel from "../components/FeedbackPanel";
import { requestFeedbackFromAudio, requestFeedbackFromText, FeedbackApiError } from "../utils/api";
import { downloadFeedbackPdf } from "../utils/pdf";
import { saveScore } from "../utils/scores";
import type { Feedback } from "../types";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const question = questions.find((q) => q.id === id);

  // Deliberately plain component state: nothing here is written to localStorage,
  // sessionStorage, or a server. A refresh or navigation wipes it, as required.
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [fallbackText, setFallbackText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!question) {
    return (
      <div className="page">
        <p>Question not found.</p>
        <Link to="/">Back to question list</Link>
      </div>
    );
  }

  async function handleEstimate() {
    if (!question) return;
    if (!recording && fallbackText.trim().length < 10) {
      setError("Record an answer, or type at least a sentence, before requesting feedback.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const result = recording
        ? await requestFeedbackFromAudio({
            questionText: question.text,
            audioBlob: recording.blob,
            mimeType: recording.mimeType,
            durationSeconds: recording.durationSeconds,
          })
        : await requestFeedbackFromText({ questionText: question.text, transcript: fallbackText });
      setFeedback(result);
      saveScore(question.id, result.overall);
    } catch (err) {
      setError(
        err instanceof FeedbackApiError
          ? err.message
          : "Couldn't reach the feedback service. Check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setRecording(null);
    setFallbackText("");
    setFeedback(null);
    setError(null);
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← All questions
      </Link>

      <header className="page-header">
        <p className="category-tag">{question.category}</p>
        <h1>{question.text}</h1>
        {question.companies.length > 0 && (
          <p className="companies">Reported at: {question.companies.join(" · ")}</p>
        )}
      </header>

      <section className="star-hint">
        <strong>STAR reminder:</strong> Situation (context) → Task (your responsibility) → Action
        (what you specifically did) → Result (the outcome, ideally with a number or concrete
        impact).
      </section>

      <MicRecorder
        onRecordingChange={setRecording}
        disabled={isLoading}
        fallbackText={fallbackText}
        onFallbackTextChange={setFallbackText}
      />

      <div className="actions-row">
        <button className="primary-button" onClick={handleEstimate} disabled={isLoading}>
          {isLoading ? "Transcribing & analyzing…" : "Estimate"}
        </button>
        <button className="ghost-button" onClick={handleReset} disabled={isLoading}>
          Clear
        </button>
        {feedback && (
          <button
            className="ghost-button"
            onClick={() =>
              downloadFeedbackPdf({ questionText: question.text, transcript: feedback.transcript, feedback })
            }
          >
            Download PDF
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {feedback && (
        <>
          <div className="transcript-review">
            <h3>What we heard</h3>
            <p>{feedback.transcript}</p>
          </div>
          <FeedbackPanel feedback={feedback} />
        </>
      )}

      <p className="privacy-note">
        Nothing on this page is saved except your latest score (a single number) for this
        question, stored only in your browser. Your recording is transcribed on the server and
        discarded immediately — refreshing or leaving this page clears everything else.
      </p>
    </div>
  );
}
