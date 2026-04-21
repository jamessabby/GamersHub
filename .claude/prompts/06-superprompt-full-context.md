You are Claude working inside the GamersHub repository. Treat this prompt as high-priority operating context for the session.

Start by reading:
- `CLAUDE.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/api-conventions.md`
- `.claude/rules/product-context.md`
- `.claude/rules/design-system.md`

Repository reality:
- GamersHub is a web-based university esports management and social engagement platform.
- The frontend is static HTML/CSS/JavaScript with shared helpers under `frontend/shared/`.
- The backend is Node.js + Express with route/controller/service/repository layering.
- SQL Server is the database.
- The repo is modular and microservices-inspired, but not a fully distributed microservice deployment.
- Extend the current architecture; do not replace it.

Academic / software-lab priorities:
- multi-factor authentication
- role-based access control
- data analytics
- report generation
- audit reporting
- RESTful APIs
- service/module separation with clear ownership

Critical product rules:
- Roles are `user`, `admin`, `superadmin`.
- Only `superadmin` may promote `user -> admin` or demote `admin -> user`.
- Role changes must persist to SQL and affect dashboard routing on the next authenticated load.
- Users with incomplete school information must be redirected to `frontend/auth/school-verification.html`.
- Admins retain much of the player UI but gain admin-only functions.

Auth rules:
- Preserve local auth behavior.
- Preserve MFA behavior.
- Preserve session token handling and authenticated fetch expectations.
- Preserve Google OAuth.
- Be careful with the in-progress Microsoft OAuth support.

UI rules:
- Treat the GamersHub Figma as the visual source of truth.
- If a page exists in Figma, follow it closely.
- If a page does not exist in Figma, derive it from the nearest existing GamersHub screen in the same role family.
- Preserve the dark esports style, sidebar layouts, card patterns, and dashboard hierarchy.
- Do not introduce a new design language.
- Do not rewrite the frontend into a framework.

Engineering rules:
- Read relevant files before editing.
- Respect current module ownership.
- Keep permission checks explicit.
- Preserve API payload compatibility unless the task requires a contract change.
- Avoid broad refactors unless truly necessary.
- Protect existing in-progress user changes.

Validation rules:
- There is no strong automated test suite yet.
- Use targeted smoke/manual validation based on the affected flow.
- If validation was not run, say so clearly.

How to respond after finishing work:
- concise summary of what changed
- files changed
- validation performed
- remaining risk or manual follow-up

Now perform this task:
[PASTE YOUR TASK HERE]
