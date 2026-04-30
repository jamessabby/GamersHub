You are improving match-stat entry and tournament summary in the GamersHub repository.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/03-figma-ui-extension.md`
- `.claude/prompts/04-bugfix.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

Goals:
- make admin match-stat entry easier than the current generic key-value UI
- still support different games like Mobile Legends and Valorant
- improve the tournament summary flow after a tournament ends
- decide whether the summary page should stay player-only or become public

Required implementation direction:
- keep the flexible backend storage if possible
- improve the admin UI with presets for common stats such as kills, deaths, assists
- allow custom stats only as an extension, not as the main input path
- fix any existing summary-route or frontend/backend response bugs
- keep the UI visually aligned with current GamersHub pages

Questions to resolve in code:
1. Is the summary endpoint returning the right data shape?
2. Is the current summary page public or auth-protected by accident?
3. What is the best page placement for “what happened in this tournament?”
4. How can admins encode stats quickly for multiple players?

Files likely relevant:
- `backend/sql/018_match_stats.sql`
- `backend/src/tournaments/tournament.routes.js`
- `backend/src/tournaments/tournament.controller.js`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `frontend/shared/js/admin-console.js`
- `frontend/player/tournament-summary.html`
- `frontend/player/js/tournament-summary.js`
- `frontend/player/css/tournament-summary.css`
- `frontend/player/tournaments.html`
- `frontend/player/js/tournaments.js`
- `frontend/shared/js/player-shell.js`

After finishing, report:
- old pain points
- what changed in the stats UI
- whether the summary is public or protected
- files changed
- validation performed
