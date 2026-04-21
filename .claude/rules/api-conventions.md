# GamersHub API Conventions

## Route Style
- Keep routes REST-like and grouped by domain under `/api/...`.
- Match the existing domain ownership instead of creating overlapping endpoints.

## Layer Responsibilities
- Routes: wiring and middleware
- Controllers: request parsing, service calls, response status codes
- Services: business rules, validation, orchestration
- Repositories: SQL queries and record mapping

## Responses
- Prefer JSON objects with stable keys.
- For list endpoints, prefer shapes like:
  - `items`
  - `total`
  - `page`
  - `pageSize`
- For action endpoints, include a clear `message` when the frontend benefits from it.

## Errors
- Use meaningful status codes:
  - `400` for invalid input
  - `401` for unauthenticated or expired auth state
  - `403` for forbidden role or protected resource
  - `404` for missing entities
  - `409` for duplicate or conflicting state
- Error messages should help the current frontend show a sensible status to the user.

## RBAC
- Put authentication in middleware where possible.
- Keep authorization decisions explicit inside services or controllers.
- Superadmin-only operations should be unmistakably guarded.

## Data Integrity
- Convert ids to numbers before repository calls when the current module expects numeric ids.
- Normalize enums and role strings before persistence.
- Preserve compatibility with SQL-backed field names already used by the frontend.
