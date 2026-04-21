You are working in the GamersHub repository.

Before doing anything else, read these files and treat them as the project source of truth:
- `CLAUDE.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/api-conventions.md`
- `.claude/rules/product-context.md`
- `.claude/rules/design-system.md`

Project context you must preserve:
- GamersHub is a university esports management and social engagement platform.
- The frontend is plain HTML/CSS/JavaScript.
- The backend is Node.js + Express with route/controller/service/repository layering.
- The database is SQL Server.
- This is microservices-inspired, but do not split it into distributed runtime services unless explicitly asked.
- Keep the current architecture and extend it instead of rewriting it.
- Preserve the current auth/session/redirect flow.
- Preserve Google OAuth and the in-progress Microsoft OAuth work.
- MFA, RBAC, analytics, report generation, and audit reporting are important software-lab requirements.

Critical business rules:
- Roles are `user`, `admin`, and `superadmin`.
- Only `superadmin` can promote a `user` to `admin` or demote an `admin` back to `user`.
- Role changes must persist in SQL and must affect dashboard routing on the next authenticated load.
- Admins still share much of the player experience, but gain admin-only pages and actions.
- School verification redirects must remain intact.

UI/design rules:
- Treat the GamersHub Figma as the primary visual reference.
- If a requested page already exists in Figma, follow it closely.
- If a requested page does not exist in Figma, derive it from the nearest existing GamersHub screen in the same role area.
- Do not introduce a new design language, a generic SaaS style, or a framework rewrite.

How to work:
1. Read the relevant files before editing.
2. Trace backend work through route, controller, service, and repository.
3. Trace frontend work through the page HTML, page JS, shared CSS, and shared auth/session helpers.
4. Keep changes focused and compatible with existing behavior.
5. Call out any auth, RBAC, SQL, redirect, analytics, report, audit, or UI consistency risks.
6. After finishing, summarize:
   - what changed
   - what was validated
   - what still needs manual checking

Do not start with a rewrite plan. Start by reading the relevant files and then implement the task directly.
