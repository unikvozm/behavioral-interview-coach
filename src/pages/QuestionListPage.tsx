import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { questions } from "../data/questions";
import { getAllScores } from "../utils/scores";
import type { StoredScore } from "../types";

export default function QuestionListPage() {
  const [scores, setScores] = useState<Record<string, StoredScore>>({});

  useEffect(() => {
    setScores(getAllScores());
    // Pick up scores saved just now if the user came back via browser back-button.
    const onFocus = () => setScores(getAllScores());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, typeof questions>();
    for (const q of questions) {
      const list = map.get(q.category) ?? [];
      list.push(q);
      map.set(q.category, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Question bank</h1>
        <p>
          Pick a question to practice out loud. Your latest score for each question is saved only
          in this browser (localStorage) — nothing is sent to a server except while you're
          actively requesting feedback.
        </p>
      </header>

      {categories.map(([category, items]) => (
        <section key={category} className="category-block">
          <h2>{category}</h2>
          <ul className="question-list">
            {items.map((q) => {
              const score = scores[q.id];
              return (
                <li key={q.id} className="question-row">
                  <Link to={`/practice/${q.id}`} className="question-link">
                    {q.text}
                  </Link>
                  <div className="question-meta">
                    {q.companies.length > 0 && (
                      <span className="companies">{q.companies.join(" · ")}</span>
                    )}
                    {score ? (
                      <span className={`score-pill ${score.overall >= 4 ? "score-good" : "score-low"}`}>
                        {score.overall.toFixed(1)}/5
                      </span>
                    ) : (
                      <span className="score-pill score-empty">Not attempted</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
