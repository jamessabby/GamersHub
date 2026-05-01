You are improving user profile completion and CSV report convenience in the GamersHub repository.

Before doing anything else, read these files first and treat them as required context:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

After reading them, briefly summarize the project rules you must preserve, then work only on this task.

Task scope:
- improve the normal post-login / normal profile-completion flow so users are encouraged or required to complete the fields needed for CSV reporting
- do not mention any fixed target like "30 users" or "30 fields"
- keep this as a normal user login/profile flow, not a weird admin-only reporting flow

What I want:
1. Audit the current auth -> school verification -> profile flow.
2. Identify which fields are already exported in the users CSV report.
3. Make the smallest clean improvement so regular users complete the important profile fields naturally after login.
4. Reuse the current school-verification/profile pages instead of inventing a separate reporting page.
5. Preserve auth, MFA, redirects, RBAC, analytics, reports, and audit behavior.

Important constraints:
- frontend is plain HTML/CSS/JS
- backend is Express with route/controller/service/repository layering
- database is SQL Server
- keep the current user role defaults and school-verification redirect logic
- do not do a broad rewrite
- do not mix this task with tournaments, PayMongo, or deployment

Files likely relevant:
- `backend/src/auth/auth.service.js`
- `backend/src/users/user.service.js`
- `backend/src/users/profile.repository.js`
- `backend/src/admin/admin.service.js`
- `frontend/auth/school-verification.html`
- `frontend/auth/js/school-veriification.js`
- `frontend/player/profile.html`
- `frontend/player/js/profile.js`
- `frontend/shared/js/auth-state.js`

At the end, respond with:
- current behavior found
- files changed
- what profile/reporting behavior was improved
- validation performed
- remaining manual checks
