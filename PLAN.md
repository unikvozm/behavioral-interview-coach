# Behavioral Interview Coach — Plan (Step 0 → MVP)

A voice-based practice tool for software-engineering behavioral interviews.
User picks a question, answers by mic in STAR format, gets AI feedback with a
score breakdown, can download a PDF, and never has an answer persisted
anywhere. Everything below is free to build, run, and deploy at hobby scale.

---

## 1. Requirements → architecture decisions

| Requirement | Decision |
|---|---|
| Question bank + practice page with mic | Static React SPA |
| Voice → text | Browser's built-in Web Speech API (free, no server round-trip) |
| AI feedback on the STAR answer | One serverless function calling a free-tier LLM (Groq/Llama) |
| Nothing about the answer is stored | Keep transcript/feedback in React component state only — never write it to `localStorage`, a database, or a log |
| Download transcript + feedback as PDF | Client-side PDF generation (`jsPDF`) — no server involved, so nothing leaves the browser at download time |
| Community-contributed questions, manually curated | A plain HTML form posting to a free form backend (Formspree) — no database, no moderation UI needed for MVP |
| List page with color-coded average score per question | `localStorage`, keyed by question id, read on the list page |
| Fully free to run and deploy | Static hosting + one serverless function, both within free tiers described below |

---

## 2. Technology choices, alternatives, and why

### 2.1 Frontend framework: **React + Vite + TypeScript**

| Option | Pros | Cons |
|---|---|---|
| **React + Vite (chosen)** | Huge ecosystem, official Web Speech typings workarounds well documented, fast dev server, trivial static build, easiest to hand off/extend | Slightly more boilerplate than Svelte |
| Next.js | Built-in API routes (would replace the separate `/api` function), SSR if ever needed | Heavier for a pure SPA with no SEO need; App Router adds complexity we don't need for a client-only tool |
| Svelte/SvelteKit | Less boilerplate, smaller bundles | Smaller ecosystem for this kind of niche browser-API work; more friction if you later want contributors |
| Vanilla JS / no framework | Zero build step, absolute minimum dependencies | State management for recording/feedback/routing gets messy fast; harder to maintain as the app grows |

**Why React+Vite wins here:** the app is a small number of stateful pages
(list, practice, contribute) with routing and moderate UI logic (mic state
machine, async feedback fetch, score bars). React's component model maps
directly onto that, Vite's build is instant and produces a static `dist/`
folder deployable anywhere for free, and it doesn't need SSR because there's
no content that benefits from being pre-rendered (the question bank is small
and public; nothing here needs to rank in search engines).

### 2.2 Speech-to-text: **`MediaRecorder` + Groq Whisper (server-side), not the browser's live `SpeechRecognition`**

An earlier version of this plan used the browser's built-in
`SpeechRecognition` API for free, zero-latency live captions. In practice it
turned out to be unreliable: when the API isn't confident about a stretch of
speech, it silently *drops* it rather than transcribing it imperfectly — so
normal pauses, a quieter word, or background noise can wipe out large chunks
of an answer with no visible error. That's a structural limitation of the
API, not something fixable with better event handling.

| Option | Pros | Cons |
|---|---|---|
| **`MediaRecorder` (record real audio) → Groq Whisper API (chosen)** | Whisper-quality transcription (far higher accuracy, doesn't silently drop words), `MediaRecorder` is supported in every modern browser (Chrome, Firefox, Safari, Edge) not just Chromium, and Groq's Whisper endpoint is on the same free tier as the LLM call | Adds one extra network round-trip (record → upload → transcribe) before feedback can start; requires microphone permission the same as before |
| Browser `SpeechRecognition` (previous approach) | Zero network round-trip for transcription, works while speaking (live captions) | Chromium-only; silently drops low-confidence words/phrases, which is exactly the bug reported — not appropriate as the *authoritative* transcript for scoring |
| OpenAI Whisper API directly | Very high accuracy | No free tier — conflicts with "fully free"; Groq hosts the same Whisper model for free |
| `whisper.cpp` / `transformers.js` running Whisper in-browser via WASM | Free, fully offline, no audio leaves the browser at all | Multi-hundred-MB model download on first load, slow on a typical laptop — too heavy for an MVP |

**Why this wins now:** record with `MediaRecorder` (broadly supported,
simple start/stop, no live-captioning promises to break), send the finished
clip to a serverless function, which forwards it to **Groq's hosted
`whisper-large-v3-turbo`** and gets back an accurate transcript — still
entirely on Groq's free tier (see §2.3), still with the audio discarded the
moment transcription finishes. The trade-off versus the old approach is a
short "Transcribing & analyzing…" wait instead of watching words appear
live, in exchange for actually getting what you said.

**On "should we analyze the raw audio for vocal delivery instead of just the
transcript?"** — worth calling out explicitly, since it's a reasonable
instinct. Groq's chat models are text-only; they cannot reason over an audio
file directly, only Whisper can turn it into text. So this app computes
objective delivery stats *programmatically* from the transcript + recording
duration — words-per-minute and a filler-word count (um/uh/like/etc.) — and
feeds those numbers to the LLM alongside the transcript, so feedback can
speak to pacing without the model fabricating claims about tone or
confidence it can't actually perceive. If you want genuine acoustic analysis
(hesitation sounds, vocal confidence, tone), that needs a multimodal model
that accepts raw audio for reasoning — e.g. Google Gemini's `generateContent`
with an audio part, which does have a real free tier. That's a bigger swap
(different provider, different request/response shape, and the "cannot
verify what a model 'hears' in a voice" caveat gets more important to state
to users) so it's left as a documented extension rather than the MVP
default.

### 2.3 AI feedback: **LLM via a serverless proxy, Groq's free tier by default**

| Option | Pros | Cons |
|---|---|---|
| **Groq API (chosen default)** | Generous free tier, very fast inference (good for a snappy "Estimate" button), OpenAI-compatible request format so it's easy to swap for another provider later | Free tier has rate limits (fine for personal/small-audience use); requires a Groq account |
| Google Gemini API (free tier) | Also has a genuinely free tier; strong quality | Slightly different SDK/response shape; rate limits vary by model |
| OpenAI API | Best-known ecosystem, excellent quality | No meaningful free tier — conflicts with "fully free" |
| Anthropic Claude API | Excellent quality/reasoning for feedback-style tasks | No standing free tier for API usage — conflicts with "fully free" unless the developer is comfortable paying a few cents per evaluation |
| Run a small open model locally in-browser (e.g. via `transformers.js`/WebLLM) | Zero API cost forever, no server needed at all | Multi-GB model download, needs a capable GPU/browser, feedback quality far below a hosted 70B-class model — not realistic for nuanced interview coaching |

**Why Groq wins here:** it is the option that is both free and produces
good-quality, fast structured feedback. Because the proxy function
(`api/feedback.ts`) talks to Groq using the OpenAI-compatible
`/chat/completions` shape, swapping providers later is a small, contained
change — see "Swapping the LLM provider" below.

**A note on model IDs:** Groq's free/developer-tier model lineup changes
over time — models get deprecated or moved to Enterprise-only access (this
already happened once between writing this plan and testing it: an earlier
draft used `llama-3.3-70b-versatile`, which Groq has since moved to
Enterprise-only). The code currently targets `openai/gpt-oss-120b` for chat
and `whisper-large-v3-turbo` for transcription — both confirmed free/
developer-tier as of this writing — but if you ever see a `model_not_found`
error, check the current list at
[console.groq.com/docs/models](https://console.groq.com/docs/models) and
update the two constants at the top of `api/feedback.ts`.

**Why a serverless proxy instead of calling the LLM directly from the
browser:** calling Groq directly from client-side JS would require shipping
your API key inside the JS bundle, where anyone can read it and use up your
free quota (or run up a bill on a paid plan). A serverless function keeps the
key server-side as an environment variable. The alternative — asking each
user to paste in their own API key (BYOK, stored only in their browser) — is
a legitimate pattern for open-source tools distributed to many users, and is
documented as an option below, but for a single deployed instance that you
want to "just work" for anyone who visits, the proxy-with-your-own-key
approach gives a better first-run experience.

*BYOK alternative, if you'd rather not run a shared key at all:* add a
settings field where the user pastes their own Groq/OpenAI/Anthropic key,
store it in `localStorage` only, and call the provider directly from the
browser. Pros: zero cost to you no matter how many people use it, and no
serverless function needed at all (works on pure static hosting like GitHub
Pages). Cons: worse first-run UX (user must go get a key before trying the
app), and the key is visible in browser dev tools/network requests while
it's in use.

### 2.4 PDF generation: **`jsPDF`, client-side**

| Option | Pros | Cons |
|---|---|---|
| **jsPDF (chosen)** | Free, MIT-licensed, runs entirely in the browser, no server call, works offline once the page is loaded | Basic layout primitives (manual text wrapping) — fine for a single-page report |
| Server-side PDF (e.g. Puppeteer rendering HTML → PDF) | Pixel-perfect HTML/CSS layout | Needs a server function with a headless browser, much heavier for a serverless free tier, and pointlessly sends the transcript to a server just to format it |
| `react-pdf` | Declarative React-like API for PDF layout | Extra dependency/complexity not needed for a one-page report |

**Why jsPDF wins here:** it satisfies "download a PDF" without ever sending
the transcript/feedback to a server for formatting purposes, which reinforces
the "nothing is stored, nothing extra leaves the browser" requirement.

### 2.5 Storing scores: **`localStorage`**

| Option | Pros | Cons |
|---|---|---|
| **`localStorage` (chosen)** | Free, zero backend, exactly matches "for now" scope in the requirements, persists across refreshes on the same device/browser | Per-device only, not synced across devices, can be cleared by the user/browser |
| `IndexedDB` | Better for larger structured data | Overkill for "one number per question id" |
| A real backend database (Postgres/Supabase/Firebase) | Enables login, cross-device sync, history over time | Real infrastructure, requires auth, and directly contradicts "the marks can be stored in localStorage for now" from the brief |

**Why `localStorage` wins here:** the brief explicitly scopes this to
localStorage for now; it is genuinely the right MVP choice, and the code is
written so swapping in a real backend later only means changing
`src/utils/scores.ts`.

### 2.6 Contribute-a-question form: **Formspree (free tier)**

| Option | Pros | Cons |
|---|---|---|
| **Formspree (chosen)** | Free tier (a per-month submission cap, no credit card), works as a plain `fetch`/form POST, emails you each submission, zero backend code | Free tier has a monthly submission cap; data lives in a third-party service |
| Google Forms (embed or link out) | Also completely free, no cap in practice, familiar spreadsheet-of-responses UX | Slightly clunkier to embed as a matching-styled in-app form; usually just linked out to rather than embedded |
| Airtable form | Nice structured database of submissions for you to curate from | Free tier limits, more setup than Formspree for the same result |
| Your own backend + database | Full control, instant moderation tooling later | Real infrastructure/auth for what the brief explicitly says can be "done manually" — not needed for MVP |

**Why Formspree wins here:** the brief says storage can be external and
additions are curated by hand, which is exactly Formspree's model — every
submission just lands in your inbox for you to copy into
`src/data/questions.ts` when you're ready.

### 2.7 Hosting/deployment: **Vercel (free "Hobby" tier)**

| Option | Pros | Cons |
|---|---|---|
| **Vercel (chosen)** | Free static hosting *and* free serverless functions in the same deploy (needed for the `/api/feedback` proxy), auto HTTPS, git-push-to-deploy, generous free-tier limits for personal use | Vendor-specific function conventions (though this project's function is written plainly enough to port) |
| Netlify | Also free static hosting + free "Functions", very similar trade-offs to Vercel | Slightly different function file convention — would need `netlify/functions/feedback.ts` instead of `api/feedback.ts` (see note below) |
| Cloudflare Pages + Workers | Free tier, excellent global performance | Workers use a different runtime API (`fetch` handler, not Node req/res) — the proxy function would need a small rewrite |
| GitHub Pages | Completely free static hosting | Static-only — **cannot run the serverless proxy at all**, so it only works with the BYOK approach (§2.3) instead of a shared server-side key |

**Why Vercel wins here:** it is the option that gives you both "free static
hosting" and "free serverless function" out of the box, with the least
configuration, which is exactly what this app needs (SPA + one API route).
If you deploy to Netlify instead, move `api/feedback.ts` to
`netlify/functions/feedback.ts` and adjust the handler signature per
Netlify's docs — the actual Groq-calling logic is unchanged.

---

## 3. Step-by-step: Step 0 → MVP

### Step 0 — Prerequisites (10 min)
1. Install [Node.js](https://nodejs.org) (v18+) and `npm`.
2. Create a free [Groq](https://console.groq.com) account → generate an API key.
3. Create a free [Vercel](https://vercel.com) account (sign in with GitHub is easiest).
4. Create a free [Formspree](https://formspree.io) account → create a form → copy its endpoint URL.
5. (Optional but recommended) create a GitHub account/repo to push this project to, since Vercel deploys straight from a git repo.

### Step 1 — Get the code running locally
All the code is already written and included with this plan (see the project
files delivered alongside this document). From the project folder:
```bash
npm install
cp .env.example .env.local   # paste your GROQ_API_KEY into .env.local
npm install -g vercel
vercel dev                   # serves the SPA + the /api/feedback function together
```
Open the printed `http://localhost:3000` URL in **Chrome or Edge**.

### Step 2 — Confirm the question bank renders
`src/data/questions.ts` ships with ~20 seed questions across common
categories (conflict, failure, leadership, ambiguity, prioritization,
communication…), each with example companies. The list page
(`QuestionListPage.tsx`) groups them by category and links each one to
`/practice/:id`. Edit this file directly to add/remove/rewrite questions —
it's a plain TypeScript array, no build step beyond a normal save+reload.

### Step 3 — Try the practice flow end-to-end
1. Click a question → you land on `/practice/<id>`.
2. Click **Start recording**, speak a short STAR answer, click **Stop recording**
   (or just keep typing/editing the transcript box — it's fully editable).
3. Click **Estimate** → the transcript + question are POSTed to
   `/api/feedback`, which calls Groq, gets back structured JSON
   (`overall`, per-STAR-letter scores, strengths, improvements, summary,
   an optional rewritten example), and renders it in the scorecard.
4. Click **Download PDF** → `jsPDF` builds a one-page report client-side and
   triggers a browser download. No network call happens for this step.
5. Refresh the page, or navigate away and back → the transcript and feedback
   are gone (this is intentional — see §4).

### Step 4 — Confirm score persistence + color coding
After step 3's **Estimate**, go back to the question list page. The question
you just practiced now shows a colored pill: green if the overall score is
≥ 4/5, red if below. This is read from `localStorage` (`src/utils/scores.ts`),
which stores only `{ questionId, overall, timestamp }` — never the transcript.

### Step 5 — Try the contribute form
Go to **Contribute a question**, fill it in, submit. Check the email tied to
your Formspree account — you should see the submission. When you're happy
with a submitted question, manually copy it into `src/data/questions.ts` and
redeploy (this manual curation step is by design, per the brief).

### Step 6 — Push to GitHub
```bash
git init
git add .
git commit -m "Behavioral Interview Coach MVP"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

### Step 7 — Deploy to Vercel
1. In the Vercel dashboard, **Add New → Project**, import your GitHub repo.
2. Framework preset should auto-detect as **Vite**. Leave build command as
   `npm run build` and output directory as `dist` (Vercel usually fills this
   in automatically).
3. Under **Environment Variables**, add `GROQ_API_KEY` with your Groq key.
4. Click **Deploy**. Vercel builds the static site *and* picks up
   `api/feedback.ts` as a serverless function automatically because it's in
   the `/api` folder at the project root.

### Step 8 — Verify the deployed app
Visit the `*.vercel.app` URL Vercel gives you. Repeat Step 3 against the live
site to confirm the serverless function can reach Groq (if it fails, double
check the `GROQ_API_KEY` environment variable is set for the **Production**
environment specifically, not just Preview/Development).

### Step 9 — Polish pass (optional, still free)
- Add a custom domain in Vercel's dashboard (free, you just need a domain you
  already own; Vercel's own `*.vercel.app` subdomain is also free forever).
- Add more seed questions from public lists like
  [Tech Interview Handbook's behavioral questions](https://www.techinterviewhandbook.org/behavioral-interview-questions/)
  (rewrite them in your own words rather than copying verbatim).
- Tighten the Groq system prompt in `api/feedback.ts` based on real feedback
  quality you observe.
- Add basic analytics only if you want them (e.g. free tier of Plausible/
  Vercel Analytics) — not included by default, to keep the "nothing is
  tracked" posture of the MVP.

### Step 10 — Ongoing content moderation
Whenever a Formspree submission arrives, review it, then add a new object to
the `questions` array in `src/data/questions.ts`, commit, and push — Vercel
redeploys automatically on every push to `main`.

**MVP complete.** Everything above uses only free tiers: Vercel Hobby plan,
Groq's free API tier, Formspree's free plan, and the browser's own
Web Speech API.

---

## 4. How "nothing is stored" is actually enforced

- The recording never becomes a file — `SpeechRecognition` streams
  transcribed text straight into React state; there is no `MediaRecorder`,
  no audio `Blob`, nothing to accidentally persist.
- The transcript and feedback live only in `PracticePage`'s `useState` —
  not in a global store, not in `localStorage`, not in the URL. React
  unmounts that state on navigation, and a hard refresh reloads the whole JS
  app from scratch, so both wipe it automatically — no extra "clear on
  unload" code is needed.
- The only thing written to `localStorage` is a single number (`overall`)
  per question id, via `saveScore()` — never the question text, transcript,
  or feedback body.
- The PDF is generated and downloaded entirely client-side; no server ever
  sees the finished report.
- The serverless function (`api/feedback.ts`) doesn't log or store the
  request body anywhere — it forwards it to Groq for one completion and
  returns the result. (Note: Groq's own API, like most LLM providers, may
  transiently process the request per its own data-handling policy — check
  Groq's terms if this matters for your use case. No data is stored by
  *this app*, which is the part under your control.)

---

## 5. Swapping the LLM provider

`api/feedback.ts` calls Groq's OpenAI-compatible endpoint. To switch:

- **OpenAI:** change `GROQ_API_URL` to `https://api.openai.com/v1/chat/completions`,
  the model to e.g. `gpt-4o-mini`, and the env var to `OPENAI_API_KEY` — the
  request/response shape is nearly identical since Groq mirrors OpenAI's API.
- **Google Gemini:** swap the URL/model for Gemini's `generateContent`
  endpoint and adjust the request/response parsing (different shape) and add
  `response_mime_type: "application/json"` for structured output.
- **Anthropic Claude:** call `https://api.anthropic.com/v1/messages` with a
  `system` field and a `messages` array; ask for JSON in the prompt (or use
  tool calling for guaranteed structure) and parse `content[0].text`.

In every case, only `api/feedback.ts` changes — the frontend just expects a
JSON body matching the `Feedback` type in `src/types.ts`.

---

## 6. Known limitations (fine for MVP, worth knowing)

- Speech-to-text needs a Chromium browser; other browsers fall back to a
  manual-typing textarea.
- Groq's free tier has rate limits — under heavy simultaneous use you may see
  429s; the UI surfaces the error message rather than failing silently.
- Scores are per-browser/per-device (`localStorage`), not synced anywhere.
- The question bank ships as static, hand-edited data; there's no admin UI
  for approving Formspree submissions — that's intentionally manual per the
  brief, but could become a small internal page later if volume grows.
