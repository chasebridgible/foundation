# Anthropic News evidence

Run ID: `2026-10-07-agent-scout-01`
Source ID: `anthropic-news`
Fetched at: `2026-10-07T05:04:40Z`
Source URL: https://www.anthropic.com/news
Retrieval status: fetched via web retriever

## Observed source state

The Anthropic News index listed these visible top and news-list items on 2026-10-07:

- `Expanding the Cyber Verification Program`, Oct 6, 2026.
- `Anthropic invests $100 million to train 10,000 engineers and tackle the enterprise AI talent gap`, Oct 2, 2026.
- `Barclays scales Claude to upgrade operations and improve client experience`, Oct 1, 2026.
- `Claude discovers a novel enzyme system with CRISPR-like repeats`, Sep 23, 2026.
- `Partnering with Accenture on embedded evaluation`, Sep 18, 2026.
- `Introducing the Life Sciences Verification Program`, Sep 17, 2026.
- `Developing Enterprise Frontier Safeguards with our customers`, Sep 1, 2026.
- `Improving our alignment and security efforts`, Aug 31, 2026.
- `Previewing the Model Hardware Standard`, Aug 27, 2026.

## Reviewed source details

`Expanding the Cyber Verification Program` announces an expanded CVP with three access tiers for qualifying security professionals. Defense Access covers defensive security operations, incident response, malware reverse engineering, and vulnerability analysis; Red Team Access adds authorized penetration testing and red-teaming with stronger eligibility and controls; Specialized Access is limited to verified organizations authorized to test safety systems that could affect lives or markets, with in-depth review in collaboration with the US government.

The source says data retention is required for enrolled organizations so Anthropic can monitor for cyber misuse, with Enterprise Frontier Safeguards planned to combine privacy and safeguards. It reports CyScenarioBench tests across tiers: generally available access blocked every task on the first prompt; Defense Access blocked 46 of 50 trials at some point; Red Team Access had no blocks and completed 34 of 50 tasks, equivalent to the no-safeguards completion rate representative of Specialized Access. The source also reports Project Glasswing partner impact: at least 129,000 verified vulnerabilities uncovered between April and July 2026, plus 5,500 from Anthropic open-source scanning, with more than 33,000 rated critical or high severity so far.

## Scout assessment

One Anthropic finding was created:

- Cyber Verification Program expansion, graded 10/10, because it turns dual-use agent capability into a governed access-tier system with verification requirements, workspace assignment, retained monitoring evidence, scenario-benchmark calibration, high-risk residual blocks, privacy/safeguard tradeoffs, and measured defensive outcomes.

## Baseline comparison

Compared against `2026-10-05-agent-scout-01`, Anthropic added the Oct 6 CVP expansion. The Oct 2 and Oct 1 enterprise training and deployment items were already recorded by `2026-10-03-agent-scout-01`.
