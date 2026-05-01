You are improving the admin match-stats input UI in the GamersHub repository.

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
- make match-stat entry easier for admins
- keep the solution understandable for a student presentation
- do not over-engineer it into a complicated esports analytics platform

What I want:
1. Audit the current stats-entry UI and backend format.
2. Keep the flexible backend if possible.
3. Improve the frontend admin flow so Kills / Deaths / Assists are easier to input.
4. Allow other stat types only as a simple extension, not as the main workflow.
5. Keep the UI consistent with the current admin console.

Important constraints:
- do not combine this task with tournament summary redesign
- do not rewrite the backend schema unless truly necessary
- prefer simple preset-driven inputs over a complicated custom-builder UX

Files likely relevant:
- `backend/sql/018_match_stats.sql`
- `backend/src/tournaments/tournament.service.js`
- `backend/src/tournaments/tournament.repository.js`
- `frontend/shared/js/admin-console.js`

At the end, respond with:
- current behavior found
- files changed
- what UI became easier
- validation performed
- remaining manual checks
