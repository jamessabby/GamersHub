---
name: GamersHub scope corrections
description: Auth scope and working rules confirmed by user — Microsoft OAuth removed, simple student-friendly code required
type: feedback
---

Do NOT include Microsoft OAuth in any plan or implementation. Scope is local auth + MFA + Google OAuth only.

**Why:** User explicitly removed Microsoft OAuth from all priorities. The backend code for it can stay but must not be referenced in new work.

**How to apply:** When listing priorities, features, or writing new auth code, treat the auth providers as local + Google only. Ignore all Microsoft OAuth routes/service code unless the user explicitly re-introduces it.

---

Keep code simple, readable, and explainable by a student.

**Why:** This is a university lab project. The student needs to understand and defend the code.

**How to apply:** Avoid clever abstractions, complex patterns, or over-engineered solutions. Prefer direct, obvious implementations. Three simple lines beat a reusable helper. No unnecessary indirection.

---

Ask before making major changes to analytics or user management UI.

**Why:** User wants to review feasibility and confirm scope before UI-heavy work begins.

**How to apply:** For analytics pages, admin pages, or superadmin pages with significant UI expansion, propose a simple version first and wait for confirmation before coding.

---

Priority rule: blocker-level features first, then necessary features only.

**Why:** Keep deliverables focused for lab submissions.

**How to apply:** Do not add features that are not asked for. Fix what blocks new-user flow before improving existing features. Do not redesign pages that already work adequately.
