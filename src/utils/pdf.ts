import jsPDF from "jspdf";
import type { Feedback } from "../types";

export function downloadFeedbackPdf(params: {
  questionText: string;
  transcript: string;
  feedback: Feedback;
}) {
  const { questionText, transcript, feedback } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;
  let y = 56;

  function heading(text: string, size = 14) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.text(text, marginX, y);
    y += size * 0.9;
  }

  function paragraph(text: string, size = 10.5) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || "—", maxWidth);
    for (const line of lines) {
      if (y > 780) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, marginX, y);
      y += size * 1.35;
    }
    y += 8;
  }

  heading("Behavioral Interview Practice — Feedback Report", 16);
  paragraph(new Date().toLocaleString());

  heading("Question");
  paragraph(questionText);

  heading("Your answer (transcript)");
  paragraph(transcript);

  heading(`Overall score: ${feedback.overall.toFixed(1)} / 5`);
  paragraph(feedback.summary);

  heading("STAR breakdown", 12);
  paragraph(
    `Situation: ${feedback.scores.situation}/5   Task: ${feedback.scores.task}/5   ` +
      `Action: ${feedback.scores.action}/5   Result: ${feedback.scores.result}/5   ` +
      `Communication: ${feedback.scores.communication}/5`
  );

  heading("Strengths", 12);
  feedback.strengths.forEach((s) => paragraph(`• ${s}`));

  heading("Suggestions to improve", 12);
  feedback.improvements.forEach((s) => paragraph(`• ${s}`));

  if (feedback.rewrittenExample) {
    heading("Example of a stronger phrasing", 12);
    paragraph(feedback.rewrittenExample);
  }

  const fileSafeQuestion = questionText.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`behavioral-feedback-${fileSafeQuestion || "answer"}.pdf`);
}
