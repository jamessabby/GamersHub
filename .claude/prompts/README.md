# GamersHub Claude Prompt Library

These files are copy-ready prompts for Claude inside VS Code.

## Recommended Session Flow
1. Start with `07-read-first-orchestrator.md` when the task is part of the larger GamersHub improvement scope.
2. Let Claude read the prompt library first.
3. Then use only one separated task prompt at a time.
4. Avoid combining bug fixing, feature work, deployment planning, and defense prep in one prompt unless you truly need that.

## How To Use In VS Code
1. Open the Explorer.
2. Open `.claude/prompts/`.
3. Open the prompt file that matches your task.
4. Copy the full contents.
5. Paste it into the Claude chat panel in VS Code.
6. Add one short sentence below it with your exact task if needed.

## Recommended Prompt Order
- New session or major task:
  - `01-project-kickoff.md`
- New session that must load the whole prompt library first:
  - `07-read-first-orchestrator.md`
- Backend or full-stack feature:
  - `02-feature-implementation.md`
- New page or UI work based on Figma:
  - `03-figma-ui-extension.md`
- Bug fixing:
  - `04-bugfix.md`
- Code review:
  - `05-review.md`

## Separated GamersHub Task Prompts
- `08-fix-public-registration-page.md`
- `09-public-user-id-and-profile-reporting.md`
- `10-registration-waitlist-and-join-code.md`
- `11-match-stats-and-tournament-summary.md`
- `12-deployment-domain-and-public-launch.md`
- `13-codebase-roadmap-and-defense-prep.md`

## Tip
If Claude already has repo context loaded, you can use the shorter task-specific prompts directly.
If the session is fresh or Claude seems confused, start with `01-project-kickoff.md`.
If the session is large, messy, or connected to multiple pending GamersHub issues, start with `07-read-first-orchestrator.md` and then move task-by-task.
