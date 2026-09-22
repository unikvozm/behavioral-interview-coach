# Behavioral Interview Coach

Practice STAR-format behavioral interview answers out loud, get instant AI
feedback, and download a PDF of the transcript + feedback. No answers or
recordings are ever stored — only your latest numeric score per question,
saved locally in your browser.

Full build rationale, alternatives considered, and the step-by-step plan from
zero to MVP live in **PLAN.md** (shipped alongside this project). This file
only covers running the code.

## 1. Local setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste a free Groq API key (https://console.groq.com)
npm run dev
```

Open the printed local URL in **Chrome or Edge** (required for the free
speech-to-text — see PLAN.md for why). Note that `npm run dev` only serves
the frontend; the `/api/feedback` serverless function needs the Vercel dev
server to run locally:

```bash
npm install -g vercel   # one-time
vercel dev
```

`vercel dev` serves both the frontend and the `/api` function together and
reads `.env.local` automatically.

## 2. Configure the contribute-a-question form

Open `src/pages/ContributePage.tsx` and replace `FORMSPREE_ENDPOINT` with
your own [Formspree](https://formspree.io) endpoint (free tier). See
PLAN.md -> "Contribute-a-question form" for the two-minute setup.

## 3. Deploy for free

```bash
vercel        # first deploy, follow the prompts
vercel --prod # promote to production
```

In the Vercel dashboard -> Project -> Settings -> Environment Variables, add
`GROQ_API_KEY` with your key, then redeploy. See PLAN.md -> "Step 11" for a
fully detailed walkthrough, plus Netlify/Cloudflare Pages alternatives.

## Project layout

```
src/
  data/questions.ts       question bank (edit/extend this)
  pages/                  QuestionListPage, PracticePage, ContributePage
  components/             MicRecorder, FeedbackPanel
  utils/                  scores.ts (localStorage), pdf.ts (jsPDF), api.ts
api/
  feedback.ts             serverless function that calls the LLM
```
