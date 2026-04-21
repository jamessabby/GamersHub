# GamersHub Code Style

## General
- Match the existing file and folder patterns before inventing new abstractions.
- Prefer small, direct functions over clever generic helpers.
- Use descriptive names tied to the esports / community domain.
- Keep comments rare and useful.

## Backend
- Follow the existing layering:
  - routes define endpoints
  - controllers translate HTTP input/output
  - services hold business rules
  - repositories handle SQL and persistence details
- Validate inputs close to the service boundary.
- Throw errors with `statusCode` when the current module already follows that pattern.
- Return plain objects that are easy for the frontend to consume.
- Keep role logic explicit; do not hide authorization-critical behavior in vague helpers.

## Frontend
- Stay with vanilla HTML/CSS/JS unless explicitly told otherwise.
- Reuse `frontend/shared/` utilities when possible.
- Keep dashboard and auth flows readable and page-specific.
- Prefer progressive enhancement over heavy abstraction.
- Respect existing redirect and session conventions from `frontend/shared/js/auth-state.js`.

## Data And Naming
- Use consistent names such as `userId`, `role`, `authProvider`, `createdAt`, `isActive`, `isVisible`.
- Normalize role strings to lowercase before permission checks.
- Be careful with boolean coercion when mapping SQL results to API payloads.

## Scope Discipline
- Do not perform broad refactors during a focused feature task.
- Avoid renaming files or moving modules unless it clearly improves maintainability and the task justifies it.
