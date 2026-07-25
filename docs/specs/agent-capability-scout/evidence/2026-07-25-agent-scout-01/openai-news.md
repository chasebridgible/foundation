# OpenAI News evidence - 2026-07-25 agent scout

Source: https://openai.com/news/
Run ID: `2026-07-25-agent-scout-01`
Fetched at: `2026-07-25T05:02:46Z`
Retrieval notes: Browser retrieval succeeded for the enabled OpenAI News source and the relevant article URL. The OpenAI News index listed `Launching Health in ChatGPT` as the newest item on July 23, 2026.

## Newly observed relevant items since the 2026-07-23 scout

- `Launching Health in ChatGPT` (July 23, 2026), https://openai.com/index/health-in-chatgpt/
  - Relevance: OpenAI launched a ChatGPT health surface that can connect Apple Health and supported medical records with explicit user permission, use connected health data across conversations, and help users compare records, summarize changes, and prepare medical questions.
  - Agent-system lesson: agents that operate over sensitive connected data need permissioned data access, clear memory boundaries, action-specific sharing safeguards, expert-shaped evals, and red-team loops before the data can safely influence personalized responses or downstream tool actions.
  - Evidence excerpts: the article says users choose when connected health information can be used; connected health conversations do not train foundation models or target ads; memories are not created directly from connected medical records or Apple Health information; actions that could disclose health information get additional checks and sometimes confirmation; and dedicated red-team exercises test connected-information safeguards.

## Comparison with prior scout state

The 2026-07-23 run already recorded OpenAI Presence and the Hugging Face model-evaluation security incident. The new Health item adds a separate sensitive-data agent pattern: connected personal records, per-use permission, memory separation, disclosure checks, expert evals, and red-team feedback loops. Other OpenAI News items visible on the index were already covered or were low-signal company/product announcements for this scout scope.
