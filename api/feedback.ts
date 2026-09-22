// Vercel Serverless Function (Node.js runtime).
// Deployed automatically by Vercel because it lives in /api.
// Keeps the LLM API key server-side (never shipped to the browser).
//
// Default provider: Groq (https://console.groq.com) — free tier, OpenAI-compatible
// API, fast Llama 3.3 70B inference. To switch providers, see PLAN.md ("Swapping
// the LLM provider") — you mainly need to change GROQ_API_URL/model below and the
// request/response shape, since most providers are OpenAI-compatible.

export const config = { runtime: "nodejs" };

interface VercelRequest {
  method?: string;
  body: unknown;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an experienced software engineering interview coach who evaluates
answers to behavioral interview questions using the STAR framework (Situation, Task, Action, Result).

Score each STAR component from 0-5 (5 = excellent), plus a "communication" score from 0-5 for
clarity/conciseness/confidence. Then give an overall score from 0-5 (one decimal place is fine),
2-4 concrete strengths, 2-4 concrete, actionable improvement suggestions, a short 1-2 sentence
summary, and OPTIONALLY a short rewritten example sentence or two showing how a weak part of the
answer could be phrased more effectively.

Be honest and specific — reference details from the candidate's actual answer, don't be generic.
If the answer is empty, very short, or doesn't address the question, score it low and say so
plainly but constructively.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no extra commentary:
{
  "overall": number,
  "scores": { "situation": number, "task": number, "action": number, "result": number, "communication": number },
  "strengths": string[],
  "improvements": string[],
  "summary": string,
  "rewrittenExample": string
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GROQ_API_KEY. See PLAN.md for setup." });
    return;
  }

  const body = (req.body ?? {}) as { questionText?: string; transcript?: string };
  const questionText = (body.questionText ?? "").toString().slice(0, 2000);
  const transcript = (body.transcript ?? "").toString().slice(0, 8000);

  if (!questionText.trim() || !transcript.trim()) {
    res.status(400).json({ error: "questionText and transcript are required." });
    return;
  }

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Question: ${questionText}\n\nCandidate's answer (voice transcript, may contain minor transcription errors — judge the content, not the typos):\n${transcript}`,
          },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      res.status(502).json({ error: `LLM provider error: ${errText.slice(0, 300)}` });
      return;
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "LLM returned an empty response." });
      return;
    }

    const parsed = JSON.parse(content);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
}
