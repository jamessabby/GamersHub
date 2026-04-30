You are implementing the user public ID and report-friendly onboarding flow in the GamersHub repository.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

Feature goals:
- every user should have an immutable external-safe ID
- default role must remain `user`
- only `superadmin` may later change a role to `admin`
- collect the profile/report fields needed for CSV/Excel convenience
- reuse the current profile or school-verification flow instead of inventing a duplicate system

Important design rules:
- do not derive the ID from the password or password hash
- keep internal numeric `USERID` for database joins if already used
- use `PUBLIC_ID` as the external immutable identifier
- preserve current auth, MFA, redirect, and RBAC behavior

What to check and implement:
1. Confirm whether `PUBLIC_ID` already exists in SQL and whether backend queries expose it.
2. Wire `PUBLIC_ID` through the user/auth/profile response shape where appropriate.
3. Decide the smallest clean place to collect report fields after registration/login.
4. Keep CSV export compatibility for superadmin reports.
5. If needed, extend current reports rather than creating a parallel reporting system.

Files likely relevant:
- `backend/sql/017_public_id.sql`
- `backend/src/users/user.repository.js`
- `backend/src/users/user.service.js`
- `backend/src/auth/auth.service.js`
- `backend/src/admin/admin.service.js`
- `backend/src/admin/superadmin.routes.js`
- `frontend/auth/school-verification.html`
- `frontend/auth/js/school-veriification.js`
- `frontend/player/profile.html`
- `frontend/player/js/profile.js`

After finishing, report:
- where `PUBLIC_ID` now exists in the stack
- what profile/report fields are collected
- files changed
- validation performed
- any migration or manual data backfill still needed
