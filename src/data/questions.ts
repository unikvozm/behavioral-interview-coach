import type { Question } from "../types";

// Starter question bank, in the spirit of common behavioral prompts collected at
// https://www.techinterviewhandbook.org/behavioral-interview-questions/
// Companies are illustrative (commonly reported for that question style) — verify
// before relying on them, and extend this list via the "Contribute a question" page.
export const questions: Question[] = [
  {
    id: "conflict-teammate",
    text: "Tell me about a time you disagreed with a teammate's technical decision. What did you do?",
    category: "Conflict & Collaboration",
    companies: ["Amazon", "Google"],
  },
  {
    id: "missed-deadline",
    text: "Describe a situation where you missed a deadline. What happened and what did you learn?",
    category: "Failure & Learning",
    companies: ["Meta"],
  },
  {
    id: "influence-without-authority",
    text: "Tell me about a time you had to influence someone without having direct authority over them.",
    category: "Leadership & Influence",
    companies: ["Amazon"],
  },
  {
    id: "ambiguous-requirements",
    text: "Describe a project where the requirements were unclear or kept changing. How did you handle it?",
    category: "Ambiguity",
    companies: ["Google", "Stripe"],
  },
  {
    id: "difficult-stakeholder",
    text: "Tell me about a time you worked with a difficult stakeholder or product manager.",
    category: "Conflict & Collaboration",
    companies: ["Microsoft"],
  },
  {
    id: "biggest-failure",
    text: "What is the biggest professional mistake you've made, and how did you recover from it?",
    category: "Failure & Learning",
    companies: ["Amazon", "Meta"],
  },
  {
    id: "tight-deadline",
    text: "Tell me about a time you had to deliver something under a very tight deadline. How did you prioritize?",
    category: "Time Management",
    companies: ["Uber"],
  },
  {
    id: "mentoring",
    text: "Describe a time you mentored or helped a struggling teammate improve.",
    category: "Leadership & Influence",
    companies: ["Google"],
  },
  {
    id: "pushback-management",
    text: "Tell me about a time you pushed back on your manager or a senior stakeholder.",
    category: "Conflict & Collaboration",
    companies: ["Amazon"],
  },
  {
    id: "scope-cut",
    text: "Describe a situation where you had to cut scope to hit a launch date. How did you decide what to cut?",
    category: "Prioritization",
    companies: ["Stripe"],
  },
  {
    id: "learning-new-tech",
    text: "Tell me about a time you had to quickly learn an unfamiliar technology or codebase to get something done.",
    category: "Learning & Growth",
    companies: ["Meta", "Netflix"],
  },
  {
    id: "conflicting-priorities",
    text: "Describe a time you had to juggle two conflicting priorities from different stakeholders.",
    category: "Prioritization",
    companies: ["Amazon"],
  },
  {
    id: "production-incident",
    text: "Tell me about a time you caused or handled a production incident. Walk me through what happened.",
    category: "Ownership & Accountability",
    companies: ["Google", "Netflix"],
  },
  {
    id: "disagree-and-commit",
    text: "Tell me about a time you disagreed with a decision but committed to it anyway.",
    category: "Leadership & Influence",
    companies: ["Amazon"],
  },
  {
    id: "proudest-achievement",
    text: "What's the project or achievement you're most proud of in your career so far?",
    category: "Motivation",
    companies: ["Microsoft", "Meta"],
  },
  {
    id: "receiving-feedback",
    text: "Tell me about a time you received tough feedback. How did you respond?",
    category: "Learning & Growth",
    companies: ["Google"],
  },
  {
    id: "cross-team-project",
    text: "Describe a project that required close collaboration across multiple teams.",
    category: "Conflict & Collaboration",
    companies: ["Amazon", "Stripe"],
  },
  {
    id: "simplify-complex",
    text: "Tell me about a time you had to explain a complex technical concept to a non-technical audience.",
    category: "Communication",
    companies: ["Microsoft"],
  },
  {
    id: "risk-taken",
    text: "Describe a calculated risk you took at work. What was the outcome?",
    category: "Ownership & Accountability",
    companies: ["Amazon"],
  },
  {
    id: "why-this-company",
    text: "Why do you want to work here, and why this role in particular?",
    category: "Motivation",
    companies: [],
  },
];
