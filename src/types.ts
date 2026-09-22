export interface Question {
  id: string;
  text: string;
  category: string;
  companies: string[];
}

export interface StarScores {
  situation: number;
  task: number;
  action: number;
  result: number;
  communication: number;
}

export interface DeliveryStats {
  durationSeconds: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
}

export interface Feedback {
  transcript: string; // the transcript the score is actually based on (from Whisper, or typed)
  overall: number; // 0-5
  scores: StarScores;
  strengths: string[];
  improvements: string[];
  summary: string;
  rewrittenExample?: string;
  delivery?: DeliveryStats;
}

export interface StoredScore {
  questionId: string;
  overall: number;
  timestamp: number;
}
