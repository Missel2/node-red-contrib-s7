# Development handoff

**Last updated:** 2026-11-06; check GitHub for fresher work. This file is a continuation point, not proof of successful CI.

## Current work

- Repository: `Missel2/node-red-contrib-s7`; default branch `master`.
- Prior default-branch baseline: `e6b5c54f63bce6302f97a7659d258fa30d80caf0`.
- Work branch: `feat/ai-first-maintenance-and-connection-regressions`.
- Proposed changes: transparent AI-assisted maintainer model, repository PR template and CI, Node-RED endpoint wrapper lifecycle correction and mocked regression tests.
- Protocol dependency remains `@st-one-io/nodes7@1.1.2`; this change **does not** claim to repair its partial COTP handshake socket handling.

## First action for next session

**Inspect this branch's PR and its CI for the final head SHA.** Fix failed tests before merging or moving on. Existing GitHub Actions may require manual activation on a newly forked repository.

## Subsequent P0

Recover the actual historical Musashi source patch rather than copying an image claim. Historical patch/image identifiers were recorded in private Musashi deployment work and must be recovered through authorized access; do not place internal registry hosts, infrastructure identifiers or production logs in this public fork. See [source investigation](MUSASHI_CONNECTION_REGRESSION.md). Reproduce the pending-transport case against a named nodes7 revision and check a scoped dependency-level correction.

## Next quality infrastructure

- GitHub-hosted disposable S7 protocol fixture with fault proxy (not yet implemented).
- Regenerate correct dependency lockfile and replace temporary no-lock smoke installation with npm ci.
- Add integration, repeated disconnect/timeout and resource-bound tests.
- No production OT access, npm publish or real PLC writes without human authorization.
