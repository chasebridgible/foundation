# Organization structure — master template

| Field | Value |
|--------|--------|
| **Entity** | `[Company / engagement name]` |
| **Version** | `1.0` |
| **Owner** | `[Who maintains this doc]` |
| **Effective / reviewed** | `[YYYY-MM-DD]` |
| **Companion docs** | Copy alongside **`SOPs/sop-template.md`** — every SOP references **Role IDs** defined below |

---

## How this connects to SOPs

Use this file as the **single source of truth for roles**. Procedures should never invent one-off titles without adding them here first.

1. **Assign each ongoing role a stable `Role ID`** (examples: `R-CEO`, `R-OPS-01`). IDs stay fixed even if the person’s name changes.
2. In every SOP header, set **Owner role ID** to the role **accountable** for the procedure (see **`SOPs/sop-template.md`**).
3. In each SOP’s **Audience & accountability** section, list **Role ID + title + what they do** for that workflow (optionally with **RACI** letters — defined below).
4. When accountability shifts, **update this org template first**, then adjust affected SOPs.

### RACI (optional shorthand in SOPs)

| Letter | Meaning |
|--------|---------|
| **R** | Responsible — does the work |
| **A** | Accountable — owns outcome (aim for **one A** per SOP) |
| **C** | Consulted — gives input before/during |
| **I** | Informed — notified after / on milestones |

---

## 1. Purpose

**Why this doc exists.** One short paragraph: clarity on who decides, who executes, and who is accountable so SOPs, tools, and handoffs stay aligned.

---

## 2. Reporting lines (summary)

Use **Role IDs**. Extend or collapse levels to match reality.

```text
[R-CEO] — [Title]
├── [R-COO] — [Title]
│   ├── [R-OPS-01] — [Title]
│   └── [R-OPS-02] — [Title]
├── [R-CFO] — [Title]
└── [R-LEAD-X] — [Title]
```

*External / non-employee: `[Board]`, `[Fractional role]`, `[Vendor lead]` — note in the Role registry.*

---

## 3. Role registry

**Canonical list.** Every row should appear exactly once; merge duplicates if titles drift.

| Role ID | Role title | Reports to (Role ID) | Holder(s) | One-line mandate |
|---------|------------|----------------------|-----------|------------------|
| `[R-CEO]` | `[Title]` | `[None / Board]` | `[Name or TBD]` | `[Owns strategy & ultimate tradeoffs]` |
| `[R-COO]` | `[Title]` | `[R-CEO]` | `[…]` | `[Owns operating rhythm & delivery]` |
| `[R-???]` | `[Title]` | `[R-???]` | `[…]` | `[…]` |

**Vacant / TBD:** Keep the row; mark Holder as `Vacant` or `TBD` so SOPs still reference a stable ID.

---

## 4. Role detail cards

Duplicate this block **per role** that needs richer clarity (skip lightweight roles).

### `[Role ID]` — `[Role title]`

| | |
|--|--|
| **Reports to** | `[Role ID]` |
| **Holder(s)** | `[Name(s)]` |
| **Backstop when absent** | `[Role ID — interim escalation]` |

**Purpose:** `[One paragraph — outcomes this role exists to drive.]`

**Core accountabilities**

- `[Outcome / domain]` — `[what “good” looks like]`
- `[…]`
- `[…]`

**Key handoffs & collaborators** *(by Role ID)*

| Partner Role ID | Relationship |
|-----------------|--------------|
| `[R-???]` | `[e.g. receives weekly forecast]` |
| `[R-???]` | `[e.g. approves spend > $X]` |

**SOPs this role owns or must follow**

| Relationship | SOP ID | Title |
|--------------|--------|-------|
| Accountable (A) | `[OPS-014]` | `[Title]` |
| Responsible (R) | `[FIN-003]` | `[Title]` |
| Consulted (C) | `[…]` | `[…]` |

*If none yet, write “None — pending.”*

---

## 5. Functional ownership snapshot *(optional)*

Use when several roles touch the same capability but **only one** should own disputes.

| Capability / domain | Accountable Role ID | Notes |
|---------------------|---------------------|-------|
| `[e.g. Customer billing]` | `[R-CFO]` | `[…]` |
| `[e.g. Hiring]` | `[R-CEO]` | `[…]` |

---

## 6. Related documents

| Type | Reference |
|------|-----------|
| Intake question lane | `../organizational-structure.md` *(discovery — not the system of record)* |
| SOP template | `../SOPs/sop-template.md` |
| Org chart visual | `[Link to diagram if any]` |

---

## 7. Revision history

| Version | Date | Author | Summary of change |
|---------|------|--------|---------------------|
| 1.0 | `[YYYY-MM-DD]` | `[Name]` | Initial publication |

---

### Tips when copying this template

- **Fewer Role IDs than people** when one person wears many hats — but each **distinct accountability** worth naming in SOPs should have an ID or a clearly tagged “hat.”
- Prefer **`Reports to` via Role ID**, not names.
- When an SOP mentions “manager,” tie it to **`Escalate to:`** using a Role ID from section 4.
