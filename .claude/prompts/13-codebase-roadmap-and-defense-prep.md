You are preparing a codebase roadmap and explanation guide for GamersHub.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/05-review.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

This task is analysis and explanation first. Do not start code changes unless explicitly asked.

Goals:
- explain the codebase from start to finish in a way a student can defend orally
- organize the explanation by architecture, service/module, role flow, and database usage
- connect the implementation to the professor rubric
- identify what is already strong, what is incomplete, and what should not be over-claimed

Required output:
1. High-level architecture explanation.
2. File-reading roadmap from backend entry point to frontend role pages.
3. Module-by-module explanation of what each area does.
4. Rubric mapping:
   - design and UX
   - functionality and system behavior
   - API usage and relevance
   - code quality and structure
5. Honest notes on incomplete flows, risks, or demo-sensitive areas.
6. Suggested speaking script or defense order.

Focus on:
- auth and MFA
- RBAC and superadmin control
- analytics, reports, and audit
- tournaments, registrations, schedules, leaderboards, and match stats
- frontend shared helpers and role-based pages
