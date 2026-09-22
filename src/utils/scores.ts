import type { StoredScore } from "../types";

// We intentionally store ONLY the latest numeric score per question, never the
// transcript or audio. This is what powers the color-coded list page.
const STORAGE_KEY = "bic:scores:v1";

function readAll(): Record<string, StoredScore> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredScore>) : {};
  } catch {
    // Corrupt or inaccessible storage (e.g. private browsing) — fail soft.
    return {};
  }
}

export function getScore(questionId: string): StoredScore | undefined {
  return readAll()[questionId];
}

export function getAllScores(): Record<string, StoredScore> {
  return readAll();
}

export function saveScore(questionId: string, overall: number): void {
  try {
    const all = readAll();
    all[questionId] = { questionId, overall, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore quota / privacy-mode errors — scoring history is a nice-to-have.
  }
}

export function clearAllScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
