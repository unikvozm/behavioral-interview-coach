import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

// Sign up free at https://formspree.io, create a form, and replace this with your
// own endpoint id (see PLAN.md → "Contribute-a-question form"). Formspree's free
// tier accepts a limited number of submissions per month, forwards each one to
// your email, and needs zero backend code.
const FORMSPREE_ENDPOINT = import.meta.env.FORMSPREE_ENDPOINT;

export default function ContributePage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← All questions
      </Link>
      <header className="page-header">
        <h1>Contribute a question</h1>
        <p>
          Got asked a behavioral question that isn't in the bank yet? Add it here. Submissions go
          to a moderation inbox and are added to the question bank by hand, so please double-check
          the wording before sending.
        </p>
      </header>

      {status === "sent" ? (
        <p className="success-text">Thanks! Your question was submitted for review.</p>
      ) : (
        <form className="contribute-form" onSubmit={handleSubmit}>
          <label>
            Question
            <textarea name="question" required rows={3} placeholder="e.g. Tell me about a time…" />
          </label>
          <label>
            Company (optional)
            <input name="company" type="text" placeholder="e.g. Amazon" />
          </label>
          <label>
            Category (optional)
            <input name="category" type="text" placeholder="e.g. Conflict & Collaboration" />
          </label>
          <label>
            Your email (optional, in case we have questions)
            <input name="email" type="email" placeholder="you@example.com" />
          </label>
          <button className="primary-button" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Sending…" : "Submit question"}
          </button>
          {status === "error" && (
            <p className="error-text">
              Something went wrong. Make sure FORMSPREE_ENDPOINT is configured (see PLAN.md).
            </p>
          )}
        </form>
      )}
    </div>
  );
}
