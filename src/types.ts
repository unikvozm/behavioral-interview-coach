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

export interface Feedback {
  overall: number; // 0-5
  scores: StarScores;
  strengths: string[];
  improvements: string[];
  summary: string;
  rewrittenExample?: string;
}

export interface StoredScore {
  questionId: string;
  overall: number;
  timestamp: number;
}
