---
name: pipos-specs
description: Applies pipos_fitness specs when editing weekly plan, AI agent, exercises, auth, or QA. Use when working in pipos_fitness, touching API routes, Prisma, or copy; or when the user asks for QA, audits, or spec compliance.
---

# Pipos Fitness – Specs Context

When working in **pipos_fitness** (weekly plan, AI, exercises, auth, errors, copy), read the relevant spec and follow it. Do not suggest changes that contradict invariants or QA checks.

## Where to Look

| Task                                                 | Spec                                                   |
| ---------------------------------------------------- | ------------------------------------------------------ |
| AI / weekly plan / OpenAI routes, prompts, DB writes | [specs/11_ai_beta_audit.md](specs/11_ai_beta_audit.md) |
| Daily QA, issues, evidence, labels                   | [specs/11_beta_daily_qa.md](specs/11_beta_daily_qa.md) |
| Data model, Prisma                                   | specs/02_data_model.md                                 |
| API contracts                                        | specs/03_api_contracts.md, specs/02_api_exercises.md   |
| Errors, copy, UX                                     | specs/10_error_handling_ux.md                          |
| Product scope, roadmap                               | specs/00_product_vision.md, specs/01_mvp_scope.md      |

## Invariants (from 11_ai_beta_audit)

- **weekStart:** `YYYY-MM-DD`, normalized to UTC midnight. Unique plan key: `(userId, weekStart)`.
- **Training:** `training.sessions.length === daysPerWeek`; `dayIndex` in 0..6.
- **Nutrition:** `nutrition.days.length === 7`; each day `dayIndex` 0..6 unique; each day has exactly `mealsPerDay` meals.
- **Exercise slugs:** Alphanumeric-kebab; every slug in the plan must exist in `Exercise` (created/updated in the same flow). Only `slug`, `name`, `environment` written from the agent.
- **Copy:** No medical jargon; no raw error codes (UNAUTHORIZED, INVALID_INPUT) or internal terms (onboarding, logs, DRAFT, placeholder, adherencia) in user-facing copy.

## QA Labels (from 11_beta_daily_qa)

When opening issues from failed checks: `p0-blocker`, `p1-ux`, `p1-auth`, `p2-copy`, `data`. Attach Network tab / status when relevant; request screenshot evidence.

## Quick Rules

1. Changing weekly-plan or agent code → re-check 11_ai_beta_audit (routes, prompt data, schema, DB tables, invariants).
2. Changing copy or error messages → ensure no internal jargon (check 10 in 11_beta_daily_qa).
3. Adding/editing API routes → align with 03_api_contracts and 02_api_exercises; sensitive routes per specs (e.g. G4).
4. Only modify what the user asked; do not add features or refactors beyond the request.
