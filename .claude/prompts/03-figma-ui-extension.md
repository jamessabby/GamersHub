You are designing and implementing a UI page or UI change in the GamersHub repository.

Read first:
- `CLAUDE.md`
- `.claude/rules/code-style.md`
- `.claude/rules/design-system.md`
- `.claude/rules/product-context.md`

You must treat the GamersHub Figma as the visual source of truth.

UI rules:
- If the target page already exists in Figma, follow it closely.
- If the target page does not exist in Figma, derive it from the nearest existing GamersHub page in the same role area.
- Preserve the dark esports visual language, sidebar structure, spacing rhythm, card style, form style, and dashboard hierarchy.
- Do not create a generic SaaS redesign.
- Do not introduce React, Vue, Tailwind rewrites, or unrelated UI libraries unless explicitly asked.

Implementation rules:
- This project uses plain HTML/CSS/JavaScript.
- Reuse shared styles and shared JS helpers where appropriate.
- Keep role-based navigation consistent with nearby pages.
- Make the new page feel like it belongs in the existing Figma file.
- If you invent any missing UI section, explicitly base it on the closest existing GamersHub screen and mention which one.

Execution steps:
1. Identify the closest existing Figma-backed page pattern.
2. Read the existing HTML/CSS/JS files for that page family.
3. Implement the new page or change with minimal visual drift.
4. Keep the frontend compatible with current backend routes and auth/session handling.

After finishing, report:
- which existing page/design pattern you extended
- which files changed
- what still needs visual/manual review

UI task:
[PASTE YOUR PAGE OR UI REQUEST HERE]
