# Local Prototype Implementation Plan

> Execute inline in the existing user-requested local checkout.

Goal: Use the current UI with an authenticated local session, 30 sample places and 3 archives.
Architecture: A development-only flag selects a local API adapter at the generated-client boundary. Typed seed records and localStorage support browsing and editing without backend writes.
Spec: docs/superpowers/specs/2026-11-15-local-prototype-design.md

- [x] Add behavioral tests for archive CRUD persistence, place filtering/pagination, and unsupported requests failing without network access.
- [x] Add dev/local-prototype seed and adapter, matching generated response types.
- [x] Connect the dev-only flag to auth and API; document activation and keep all current UI components.
- [x] Run web typecheck, tests, lint for changed files; verify server response and open localhost:5174/archive.

Review focus: production mode must ignore the flag; local changes must survive reload; removed archives must not leave stale post groups; pagination must reach all 30 places; unknown API requests must not fall through to the backend.

Validation: web typecheck and build passed; 94 web test files / 664 tests passed. Changed TypeScript files pass Biome. Independent review found no critical/important issues. Existing React act warnings and Vite chunk-size warnings remain. Local server returns HTTP 200, serves VITE_LOCAL_PROTOTYPE=true, and browser opened /archive.
