# Anthropic News evidence

- Source ID: `anthropic-news`
- Retrieved: 2026-11-19T12:01:19Z
- Index URL: https://www.anthropic.com/news
- Item URL: https://www.anthropic.com/research/building-strong-safety-evaluations
- Item date: 2026-11-13 (modified 2026-11-17)

Anthropic's safety-evaluation guidance treats an evaluation as a decision tool rather than a score alone. It recommends a written question-specific design, a realistic but bounded sandbox with real-time monitoring where harm could occur, multi-turn scenarios that preserve earlier context, paired harmful and benign prompts to measure both unsafe compliance and over-refusal, independent variation of scenario dimensions, and reporting that makes failures and limitations inspectable. Its example workflow uses an expert-authored scenario specification, a simulated user that responds to the tested model, a separate grader that reads the full trace, and repeated runs.

Scout interpretation: consequential agent evaluations need a representative interaction trajectory and a decision-relevant environment, not isolated prompt scores. This reinforces Foundation's outcome, whole-system, environment, robustness, and independent-judgment doctrine; it does not establish a new standalone principle.
