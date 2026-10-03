---
name: code-review
description: Perform a comprehensive, production-grade code review on recent git changes, pull requests, diffs, or specified files. Trigger on "/code review", "/code-review", "code review", or requests to review code quality and security.
---

# Comprehensive Code Review Runbook

This skill executes an in-depth, production-readiness code review across the codebase or recent git commits/working tree.

## Step 1: Identify Changed Files & Inspect Diffs

1. Check git status to see unstaged and staged changes:
   ```powershell
   git status --short
   ```
2. Retrieve the diff for modified files:
   ```powershell
   git diff
   git diff --staged
   ```
   Or if reviewing recent commits:
   ```powershell
   git diff HEAD~1 HEAD
   ```
3. If specific files or modules were requested by the user, read and inspect those targeted files directly.

---

## Step 2: Multi-Dimensional Review Criteria

Evaluate the changes against the following core pillars:

### 1. Correctness & Edge Cases
- **Logic Bugs:** Off-by-one errors, incorrect boolean conditions, missing null/undefined checks.
- **Async Handling:** Unhandled promise rejections, missing `await`, race conditions, deadlocks.
- **State Management:** Uncontrolled mutations, stale closures in React hooks (`useEffect`, `useCallback`, `useMemo` dependency arrays).
- **Error Handling:** Empty catch blocks, uninformative error messages, missing error boundaries.

### 2. Security & Data Protection
- **Secrets & Credentials:** Hardcoded API keys, passwords, JWT tokens, connection strings.
- **Injection:** SQL/NoSQL injection, Command injection, Cross-Site Scripting (XSS).
- **Authentication & Authorization:** Missing role checks, insecure direct object references (IDOR), unprotected API endpoints.
- **Input Sanitization:** Missing validation on user inputs, path traversal risks.

### 3. Performance & Scalability
- **Database/API:** N+1 queries, unindexed lookups, missing pagination on unbounded queries.
- **Frontend/React:** Unnecessary re-renders, missing keys on list items, expensive computations in render path.
- **Resource Cleanup:** Unclosed database connections, lingering timers/intervals, unremoved DOM event listeners.

### 4. Code Quality & Architecture
- **Readability & Maintainability:** Self-descriptive naming, clear separation of concerns, DRY (Don't Repeat Yourself).
- **Dead Code:** Unused imports, orphaned variables, leftover `console.log` / debug statements.
- **Type Safety & Contracts:** Proper TypeScript/JSDoc types, schema validation.

---

## Step 3: Structured Report Format

Present the review to the user in a clean, categorized format:

```markdown
# 📋 Code Review Report

### 📌 Summary of Changes
- [Brief bulleted list of modified modules and their intent]

---

### 🚨 Critical Issues (Blockers)
*Issues that could cause crashes, security breaches, data corruption, or severe bugs.*
- **[File & Line]**: Issue description.
  - **Why it matters:** Impact explanation.
  - **Recommended fix:** Code snippet with fix.

---

### ⚠️ Warnings & Improvements
*Sub-optimal patterns, minor bugs, performance bottlenecks, or missing validations.*
- **[File & Line]**: Description and suggestion.

---

### 💡 Clean Code & Best Practice Tips
*Code styling, simplification, typing, or testability improvements.*
- **[File & Line]**: Suggestion.

---

### ✅ Verified Positives
- Highlights of clean patterns, good abstractions, or well-handled edge cases.
```
