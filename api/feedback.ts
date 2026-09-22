// Vercel Serverless Function (Node.js runtime).
//
// Two-step pipeline, both steps free-tier Groq (https://console.groq.com):
//   1. If the client sent a recording, transcribe it with Groq Whisper
//      (whisper-large-v3-turbo) — far more accurate than the browser's
//      built-in live speech recognition, and works in any browser since the
//      client only needs MediaRecorder, not SpeechRecognition.
//   2. Send the resulting transcript (+ objective pace/filler-word stats
//      computed here, not guessed by the model) to a Groq chat model for
//      STAR feedback.
//
// Model IDs matter: Groq deprecates/renames models over time. As of writing,
// llama-3.3-70b-versatile is Enterprise-only; openai/gpt-oss-120b and
// llama-3.1-8b-instant are the current free/developer-tier chat models, and
// whisper-large-v3-turbo / whisper-large-v3 are the current transcription
// models. If you hit a "model not found" error again, check
// https://console.groq.com/docs/models for the current list and update the
// two constants below.
//
// Nothing here is logged or persisted: the audio buffer only exists for the
// duration of this request, is sent to Groq once for transcription, and is
// discarded when the function returns.

export const config = {
  runtime: "nodejs",
  api: { bodyParser: { sizeLimit: "10mb" } }, // audio as base64 is ~33% larger than raw
};

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const CHAT_MODEL = "openai/gpt-oss-120b";
const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

const FILLER_WORDS = ["um", "uh", "erm", "like", "you know", "sort of", "kind of", "basically"];

interface VercelRequest {
  method?: string;
  body: unknown;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

const SYSTEM_PROMPT = `You are an experienced software engineering interview coach who evaluates
answers to behavioral interview questions using the STAR framework (Situation, Task, Action, Result).

Score each STAR component from 0-5 (5 = excellent), plus a "communication" score from 0-5 for
clarity/conciseness/confidence based on the transcript wording and the pace/filler-word stats you
are given. Then give an overall score from 0-5 (one decimal place is fine), 2-4 concrete strengths,
2-4 concrete actionable improvement suggestions, a short 1-2 sentence summary, and OPTIONALLY a
short rewritten example sentence or two showing how a weak part of the answer could be phrased
more effectively.

You will be given objective speaking-pace and filler-word statistics computed from the audio. Use
them to inform the communication score and, where relevant, an improvement suggestion (e.g. "you
spoke at 190 wpm, which is fast for an interview — slow down on key results" or "you used 12
filler words in under a minute — pause instead of filling silence"). Don't invent claims about
tone or confidence that aren't supported by the transcript or these stats.

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

function countFillerWords(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const word of FILLER_WORDS) {
    const re = new RegExp(`\\b${word.replace(/ /g, "\\s+")}\\b`, "g");
    count += (lower.match(re) ?? []).length;
  }
  return count;
}

async function transcribeAudio(audioBase64: string, mimeType: string, apiKey: string): Promise<string> {
  const buffer = Buffer.from(audioBase64, "base64");
  const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `answer.${extension}`);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("response_format", "json");

  const response = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Transcription failed: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as { text?: string };
  return (data.text ?? "").trim();
}

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

  const body = (req.body ?? {}) as {
    mode?: "audio" | "text";
    questionText?: string;
    transcript?: string;
    audioBase64?: string;
    mimeType?: string;
    durationSeconds?: number;
  };

  const questionText = (body.questionText ?? "").toString().slice(0, 2000);
  if (!questionText.trim()) {
    res.status(400).json({ error: "questionText is required." });
    return;
  }

  try {
    let transcript: string;
    let durationSeconds = 0;

    if (body.mode === "audio") {
      if (!body.audioBase64) {
        res.status(400).json({ error: "audioBase64 is required for mode 'audio'." });
        return;
      }
      transcript = await transcribeAudio(body.audioBase64, body.mimeType || "audio/webm", apiKey);
      durationSeconds = body.durationSeconds ?? 0;
    } else {
      transcript = (body.transcript ?? "").toString().slice(0, 8000);
    }

    if (!transcript.trim() || transcript.trim().length < 5) {
      res.status(400).json({
        error:
          "Couldn't get a usable transcript. Try recording again a little closer to the microphone, or type your answer instead.",
      });
      return;
    }

    const wordCount = transcript.trim().split(/\s+/).length;
    const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    const fillerWordCount = countFillerWords(transcript);

    const statsLine = durationSeconds
      ? `\n\nSpeaking stats: ${durationSeconds}s duration, ${wordCount} words, ~${wordsPerMinute} words per minute, ${fillerWordCount} filler words detected (um/uh/like/etc.).`
      : "";

    const chatResponse = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Question: ${questionText}\n\nCandidate's answer (transcript):\n${transcript}${statsLine}`,
          },
        ],
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      res.status(502).json({ error: `LLM provider error: ${errText.slice(0, 300)}` });
      return;
    }

    const chatData = await chatResponse.json();
    const content = chatData.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "LLM returned an empty response." });
      return;
    }

    const parsed = JSON.parse(content);
    res.status(200).json({
      ...parsed,
      transcript,
      delivery: durationSeconds ? { durationSeconds, wordCount, wordsPerMinute, fillerWordCount } : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
}
