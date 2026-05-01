You are simplifying and polishing the tournament summary flow in the GamersHub repository.

Before doing anything else, read these files first and treat them as required context:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/02-feature-implementation.md`
- `.claude/prompts/03-figma-ui-extension.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

After reading them, briefly summarize the project rules you must preserve, then work only on this task.

Task scope:
- improve the tournament summary after an event ends
- keep it simple enough for a student presentation and code explanation
- do not turn this into a very complex analytics or player-scouting system

What I want:
1. Audit the current tournament summary page and API response.
2. Keep the summary focused on:
   - tournament title/meta
   - standings / leaderboard
   - match results / completed schedule
3. If needed, improve wording, data flow, or page placement so it is easier to understand and explain.
4. Avoid adding heavy new logic like deep player-by-player recap analytics unless clearly required for the page to work.
5. Keep the UI aligned with the current GamersHub style.

Important constraints:
- do not expand this into a complex recap engine
- do not mix this task with match-stats editor redesign
- preserve current route/controller/service/repository patterns
- preserve current player/tournament navigation unless a small improvement is clearly better

Files likely relevant:
- `backend/src/tournaments/tournament.controller.js`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `frontend/player/tournament-summary.html`
- `frontend/player/js/tournament-summary.js`
- `frontend/player/css/tournament-summary.css`
- `frontend/player/js/tournaments.js`

At the end, respond with:
- current behavior found
- files changed
- what was simplified or improved
- validation performed
- remaining manual checks
