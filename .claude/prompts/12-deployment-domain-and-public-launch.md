You are preparing GamersHub for public access and deployment planning.

Read first, in this order:
- `.claude/README.md`
- `.claude/prompts/README.md`
- `.claude/prompts/01-project-kickoff.md`
- `.claude/prompts/05-review.md`
- `.claude/prompts/06-superprompt-full-context.md`
- `CLAUDE.md`

This task is planning-first unless I explicitly ask for code changes.

Goals:
- identify what must be fixed before GamersHub can be shared publicly
- recommend a practical hosting and domain setup for this stack
- keep recommendations aligned with Node.js + Express + SQL Server + static frontend
- explain how the public registration page could be shared on social media

Deliverables:
1. A deployment readiness checklist for this repository.
2. Recommended hosting architecture for frontend, backend, and SQL Server.
3. Domain and DNS recommendation.
4. Environment-variable and security checklist.
5. Clear “do this first / later / not yet” advice.

Be concrete about:
- API base URLs
- CORS
- SMTP/email requirements
- file uploads
- SQL Server hosting
- HTTPS
- social-media-friendly public link strategy

If you browse or reference external providers, prefer official pricing/docs and clearly separate facts from recommendations.
