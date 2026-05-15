# HamıyaBravo — Build Plan

**Source of truth:** `hackathon/detailed.docx` (Bravo AI Waste Reduction Ecosystem — full PRD, 25 sections). This folder is the build-ready translation of that PRD into something an engineer can implement in one pass during a 48h hackathon and demo in 60 seconds.

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Architecture | **Single Next.js full-stack** (App Router + Server Actions + Route Handlers + Prisma) | One codebase, one deploy, one process to run on stage. Fastest in 48h. |
| Database | **SQLite via Prisma** (`file:./dev.db`) for the demo + deterministic seed; **Postgres-portable** schema | Zero infra: no server/Docker/root, runs on any judge laptop offline. Enum values & domain layer unchanged; production swap path (provider=postgresql + archived `_postgres-migration/`) documented in `02-data-model.md`. _Revised from Dockerized Postgres 16: build/demo environment cannot run a Postgres server (no Docker socket, no server binaries, no root); SQLite delivers the same reproducible offline demo with stronger "runs anywhere" guarantees._ |
| AI layer | **Deterministic formula (PRD §11) + Claude assistant** (explanations, narration, jury Q&A) with graceful offline fallback | Risk math never fails on stage; Claude adds the "wow" but is never load-bearing. |
| Demo env | **Local laptop primary**, Vercel-ready | No Wi-Fi dependency during the pitch; deployable if wanted. |

These were confirmed by the user. Do not relitigate them mid-build.

## How to read this folder

Read in order. `06` is the executable plan; the rest are the specs it references.

| File | What it gives the engineer |
|---|---|
| `00-overview.md` | Goal, the winning vertical slice, scope cuts, jury-criteria → feature map, the 60s demo storyboard, definition of done |
| `01-tech-stack.md` | Exact stack + versions, repo layout, env vars, every command |
| `02-data-model.md` | Full Prisma schema, enums, the seed dataset (PRD §18 + engineered sales history), money handling |
| `03-architecture.md` | Folders, layers, data flow (PRD §12), session/RBAC, Server Action vs Route Handler rules, error handling |
| `04-pages-and-flows.md` | Every route/page, its purpose and components, the user flows, storyboard → clicks |
| `05-ai-spec.md` | Risk formula (§11.1), decision rules (§11.3), discount ladder, sustainability math, Claude integration (prompts, tools, streaming, fallback) |
| `06-implementation-plan.md` | **The TDD task-by-task plan.** Bite-sized steps, real code, exact commands, commits. This is what you execute. |
| `07-testing-and-demo.md` | Test plan (maps to PRD §20), acceptance criteria (§19) checklist, demo run script, fallback rehearsal, judge Q&A prep |

## Execution

`06-implementation-plan.md` carries the standard superpowers header. Execute it with **superpowers:subagent-driven-development** (recommended) or **superpowers:executing-plans**. Steps use `- [ ]` checkboxes for tracking.

The plan is ordered as one **vertical slice first** (seed → risk → admin → marketplace → loop close → impact), then AI polish, then demo hardening. At every phase boundary the app runs and demos end-to-end. If time runs out mid-plan, the last completed phase is still a winning demo.
