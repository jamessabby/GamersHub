You are finishing the tournament registration waitlist and join-code flow in the GamersHub repository.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/04-bugfix.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

Current product goal:
- organizers register from a public link
- admins review registrations in a waitlist page
- admins approve or reject
- approved teams receive a join code by email or notification
- players use the join code to complete tournament entry

Your job:
1. Audit the existing registration, approval, payment-confirmation, and join-code flow.
2. Fix any frontend/backend mismatches.
3. Make sure approval and join-code usage produce a real tournament participation result, not only a success message.
4. Preserve admin and superadmin permission boundaries.
5. Keep manual payment-proof flow unless a true payment gateway is explicitly requested in this task.

Focus especially on:
- payload shape mismatches
- whether join-code use actually creates or connects a tournament team
- email behavior when SMTP is unavailable
- admin waitlist UI correctness
- public registration page compatibility with the backend

Files likely relevant:
- `backend/sql/019_tournament_registration.sql`
- `backend/src/tournaments/tournament.routes.js`
- `backend/src/tournaments/tournament.controller.js`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `backend/src/tournaments/registration.upload.js`
- `backend/src/auth/mail.util.js`
- `frontend/public/tournament-register.html`
- `frontend/public/js/tournament-register.js`
- `frontend/admin/registrations.html`
- `frontend/shared/js/admin-console.js`
- `frontend/player/js/tournaments.js`

After finishing, report:
- what was incomplete before
- what now works end-to-end
- files changed
- validation performed
- remaining gaps such as real payment gateway integration
