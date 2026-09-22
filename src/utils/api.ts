import type { Feedback } from "../types";

export class FeedbackApiError extends Error {}

export async function requestFeedback(params: {
  questionText: string;
  transcript: string;
}): Promise<Feedback> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new FeedbackApiError(body.error || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as Feedback;
}
