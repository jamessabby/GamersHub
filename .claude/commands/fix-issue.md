# Fix Issue Command

When fixing a GamersHub issue:

1. Identify whether it is backend, frontend, or cross-layer.
2. Trace the affected route, controller, service, repository, and page script before editing.
3. Preserve current project patterns unless the issue itself requires a pattern correction.
4. If auth or RBAC is involved, verify:
   - role checks
   - redirect behavior
   - session/token expectations
   - audit logging expectations
5. After the fix, describe:
   - what changed
   - what was validated
   - what still needs manual checking
