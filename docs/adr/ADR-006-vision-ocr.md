# ADR-006: Vision / OCR for Homework Grading

## Decision

Use **Claude claude-sonnet-4-6 Vision (multimodal)** directly — no separate OCR model.

---

## Finalists Compared

| Criteria | Claude Vision (selected) | pytesseract | PaddleOCR | Mathpix |
|----------|--------------------------|------------|-----------|---------|
| **Handwritten math recognition** | ✅ Excellent (LLM-level understanding) | ❌ Poor on handwriting | ✅ Good (deep learning) | ✅ Excellent (math-specialized) |
| **Printed textbook math** | ✅ | ✅ Good | ✅ | ✅ |
| **Mathematical notation (LaTeX/fractions)** | ✅ Understands semantics | ❌ Outputs raw text | ⚠️ Text only | ✅ LaTeX output |
| **Chinese character recognition** | ✅ Native | ⚠️ Requires chi_sim tessdata | ✅ Chinese-specialized | ⚠️ Limited Chinese |
| **Answer correctness reasoning** | ✅ Combined in one step | ❌ OCR only | ❌ OCR only | ❌ OCR only |
| **Additional model/process** | ❌ None (Claude already used) | ✅ Separate binary | ✅ Separate model (~1GB) | ✅ API call |
| **Self-hosted** | ✅ (API) | ✅ | ✅ | ❌ API only |
| **Cost** | Per-token (image tokens) | Free | Free | $0.004/page |
| **Privacy** | ✅ Same as rest of stack | ✅ Local | ✅ Local | ❌ Third-party |

---

## Why Claude Vision is Best Fit

### One model, one API call, one step

Traditional pipelines split "extract text from image" and "reason about correctness" into two steps with an OCR model in between. Claude claude-sonnet-4-6 with vision input combines both:

1. Receives the homework image
2. Identifies each problem and the student's written answer
3. Cross-references against the retrieved KB answer
4. Produces a structured grading report in a single LLM call

Inserting a separate OCR step (pytesseract, PaddleOCR) would add latency, a failure point, and lose semantic context (e.g., a student writing "x=3" vs "3=x" — OCR sees both as strings; Claude understands the mathematical equivalence).

### Handles the hard cases of Chinese elementary math homework

- Mixed Chinese text + Arabic numerals + mathematical operators
- Handwritten characters at various stroke qualities
- Teacher red-pen corrections in the image
- Diagram annotations (number lines, balance scales)

pytesseract fails on handwriting. PaddleOCR handles Chinese well but still only produces raw text — a separate step must then parse the mathematical expressions and reason about correctness.

### No new dependency

Claude claude-sonnet-4-6 is already the project's LLM. Using its vision capability adds zero new infrastructure.

---

## Vision Prompt Design

```
System: You are a math homework grader for Chinese Grade 4 students.

Input: [homework image] + [canonical answers retrieved from KB]

Output format (JSON):
{
  "problems": [
    {
      "problem_number": 1,
      "extracted_problem": "...",
      "student_answer": "...",
      "correct_answer": "...",   // from KB or inferred
      "is_correct": true/false,
      "source": "kb_match" | "inferred",
      "feedback": "..."          // Chinese, student-friendly
    }
  ]
}
```

---

## Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| Image token cost is higher than text | A typical homework photo is ~800–1200 tokens; acceptable for the use case |
| Claude Vision may hallucinate on very low-quality images | Prompt includes confidence field; low-confidence extractions trigger a "please retake photo" response |
| Internet connectivity required (Claude API) | Document in README; offline mode not supported in v1 |
| PaddleOCR is free and local if cost becomes a concern | `grader.py` accepts a `vision_backend` config parameter; PaddleOCR adapter can be added without changing the agent graph |
