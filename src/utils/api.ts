import type { Feedback } from "../types";

export class FeedbackApiError extends Error {}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the "data:audio/webm;base64," prefix — we only want the payload.
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function requestFeedbackFromAudio(params: {
  questionText: string;
  audioBlob: Blob;
  mimeType: string;
  durationSeconds: number;
}): Promise<Feedback> {
  const audioBase64 = await blobToBase64(params.audioBlob);
  return postFeedback({
    mode: "audio",
    questionText: params.questionText,
    audioBase64,
    mimeType: params.mimeType,
    durationSeconds: params.durationSeconds,
  });
}

export async function requestFeedbackFromText(params: {
  questionText: string;
  transcript: string;
}): Promise<Feedback> {
  return postFeedback({
    mode: "text",
    questionText: params.questionText,
    transcript: params.transcript,
  });
}

async function postFeedback(body: Record<string, unknown>): Promise<Feedback> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new FeedbackApiError(errBody.error || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as Feedback;
}
