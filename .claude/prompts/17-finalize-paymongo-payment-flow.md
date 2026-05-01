You are finalizing the PayMongo payment-link and webhook flow in the GamersHub repository.

Before doing anything else, read these files first and treat them as required context:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/04-bugfix.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

After reading them, briefly summarize the project rules you must preserve, then work only on this task.

Task scope:
- finish and harden the automatic payment update flow
- registration should create a PayMongo link when configured
- successful PayMongo payment should update the registration payment status automatically
- keep the join-code and participant-notification behavior intact

What I want:
1. Audit the current registration -> PayMongo link -> webhook -> payment status flow.
2. Identify any remaining gaps or unsafe behavior.
3. Finish the smallest clean implementation needed so `paymentStatus` reliably changes from `unpaid` to `paid` after successful payment.
4. Preserve manual admin payment confirmation only if it still serves as a fallback.
5. Do not break participant-targeted approval notifications.

Important constraints:
- do not broaden this into a full billing system
- preserve the current tournament registration architecture
- webhook verification should be correct
- keep API response shapes stable unless needed
- do not mix this task with match stats, report flow, or deployment

Files likely relevant:
- `backend/src/app.js`
- `backend/src/payments/paymongo.service.js`
- `backend/src/payments/webhook.routes.js`
- `backend/src/tournaments/tournament.controller.js`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `backend/sql/019_tournament_registration.sql`
- `frontend/public/js/tournament-register.js`
- `frontend/shared/js/admin-console.js`

At the end, respond with:
- current behavior found
- root cause(s)
- files changed
- how the automatic payment flow now works
- validation performed
- remaining manual checks
