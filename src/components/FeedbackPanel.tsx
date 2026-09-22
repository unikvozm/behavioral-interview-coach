import type { Feedback } from "../types";

const STAR_LABELS: { key: keyof Feedback["scores"]; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
  { key: "communication", label: "Communication" },
];

function scoreClass(score: number) {
  if (score >= 4) return "score-good";
  if (score >= 2.5) return "score-mid";
  return "score-low";
}

export default function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  return (
    <section className="feedback-panel" aria-live="polite">
      <div className="feedback-header">
        <div>
          <p className="feedback-eyebrow">Overall score</p>
          <p className={`feedback-overall ${scoreClass(feedback.overall)}`}>
            {feedback.overall.toFixed(1)} <span>/ 5</span>
          </p>
        </div>
        <p className="feedback-summary">{feedback.summary}</p>
      </div>

      <div className="star-grid">
        {STAR_LABELS.map(({ key, label }) => {
          const value = feedback.scores[key];
          return (
            <div className="star-row" key={key}>
              <span className="star-label">{label}</span>
              <div className="star-bar-track">
                <div
                  className={`star-bar-fill ${scoreClass(value)}`}
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className={`star-value ${scoreClass(value)}`}>{value}/5</span>
            </div>
          );
        })}
      </div>

      <div className="feedback-columns">
        <div>
          <h3>What worked</h3>
          <ul>
            {feedback.strengths.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>How to improve</h3>
          <ul>
            {feedback.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {feedback.rewrittenExample && (
        <div className="feedback-rewrite">
          <h3>Example of a stronger phrasing</h3>
          <p>{feedback.rewrittenExample}</p>
        </div>
      )}
    </section>
  );
}
