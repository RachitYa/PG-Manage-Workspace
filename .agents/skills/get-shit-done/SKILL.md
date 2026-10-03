---
name: get-shit-done
description: Execute complex coding tasks using the Get Shit Done (GSD) spec-driven methodology. Eliminates context rot, minimizes back-and-forth, breaks tasks into atomic milestones, and enforces autonomous execution with verification. Trigger on "get shit done", "gsd", "gsd mode", or requests for relentless autonomous task completion.
---

# Get Shit Done (GSD) Autonomous Execution Runbook

The **Get Shit Done (GSD)** methodology is designed for maximum development velocity, zero fluff, and elimination of context rot in agentic pair programming.

---

## The GSD Core Principles

1. **Bias for Direct Action:** 
   - Never ask permission to perform routine investigation (reading files, searching code, checking logs, running builds/tests).
   - Investigate first, form a concrete solution, implement it, and verify it.
2. **Spec-Driven & Atomic Steps:**
   - Deconstruct complex requirements into smaller, verifiable chunks.
   - For multi-step tasks, track milestones in `.gsd/PROGRESS.md` or a clear markdown checklist.
3. **Continuous Verification:**
   - Do not assume code works. Run `npm test`, `npm run build`, or type checkers after edits.
   - If an error occurs, diagnose the root cause immediately and fix it.
4. **Clean Code & No Placeholders:**
   - Always write complete, functional code. Never use `// TODO: implement later` or dummy placeholders.

---

## Step-by-Step Workflow

### Phase 1: Context & Spec Ingestion
1. Map out all relevant existing files before modifying anything.
2. If this is a multi-feature task:
   - Create or update `.gsd/PROGRESS.md` with checklist items.
   - Identify dependencies and ordering.

### Phase 2: Relentless Execution
1. Execute each atomic milestone in order.
2. Apply changes cleanly to target files.
3. Keep commits or working tree clean and logically grouped.

### Phase 3: Automated Verification
1. Run local build checks or unit tests to guarantee zero syntax regressions.
2. Check for runtime compatibility (imports, env variables, port bindings).
3. Confirm all requirements in the spec have been satisfied.

### Phase 4: Concise Completion Report
- Report only what was completed, verified, and ready to use.
- Keep the summary clear, bulleted, and actionable.
