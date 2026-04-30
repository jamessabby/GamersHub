You are fixing the public tournament registration page in the GamersHub repository.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/04-bugfix.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

Primary issues to fix:
- `frontend/public/tournament-register.html` shows `Failed to load tournaments`
- the public page must correctly reach the backend API while running from a frontend static server
- remove `roster notes`
- replace it with a better structured team-size input

Required outcome:
1. Find the real root cause of the failed tournament loading.
2. Fix the API/base-URL issue without breaking existing frontend auth helpers.
3. Replace `roster notes` with a clearer field.
4. Keep the UI consistent with GamersHub styling.
5. Update backend handling only if needed to match the new form payload.

Preferred replacement:
- required `playerCount`
- optional `captainName` only if the current flow benefits from it

Files likely relevant:
- `frontend/public/tournament-register.html`
- `frontend/public/js/tournament-register.js`
- `frontend/public/css/tournament-register.css`
- `backend/src/tournaments/tournament.routes.js`
- `backend/src/tournaments/tournament.controller.js`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `frontend/shared/js/auth-state.js`

After finishing, report:
- root cause
- files changed
- exact behavior fixed
- validation performed
- remaining follow-up if any
