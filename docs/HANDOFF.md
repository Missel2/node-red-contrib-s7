# Development handoff

**Last updated:** 2026-11-06; check GitHub for fresher work. This file is a continuation point, not proof of successful CI.

## Current work

- Repository: `Missel2/node-red-contrib-s7`; default branch `master`.
- Prior default-branch baseline: `e6b5c54f63bce6302f97a7659d258fa30d80caf0`.
- Work branch: `feat/ai-first-maintenance-and-connection-regressions`.
- Proposed changes: transparent AI-assisted maintainer model, repository PR template and CI, Node-RED endpoint wrapper lifecycle correction and mocked regression tests.
- Protocol dependency remains `@st-one-io/nodes7@1.1.2`; this change **does not** claim to repair its partial COTP handshake socket handling.

## First action for next session

**Review [PR #1](https://github.com/Missel2/node-red-contrib-s7/pull/1) against the latest SHA and CI.** Six checks passed on `9b7fe3ffe658c588f4d97dcafd3b104e210260d9` in [workflow 42297490497](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42297490497), including a baseline negative control. This proves only scoped wrapper tests, not real S7 socket reliability. After any further commit, recheck CI before merge. Human maintainer decides the merge.

**One-time maintainer action:** follow [repository setup](REPOSITORY_SETUP.md) to enable GitHub Issues and branch rules; the GitHub connector cannot change these settings.

## Subsequent P0

Recover the actual historical Musashi source patch rather than copying an image claim. Historical patch/image identifiers were recorded in private Musashi deployment work and must be recovered through authorized access; do not place internal registry hosts, infrastructure identifiers or production logs in this public fork. See [source investigation](MUSASHI_CONNECTION_REGRESSION.md). Reproduce the pending-transport case against a named nodes7 revision and check a scoped dependency-level correction.

## Repository administration gap

GitHub Issues are currently **disabled** in this fork (GitHub API returned HTTP 410 when an issue was attempted). Until the maintainer enables Issues under Repository Settings → General → Features, use [WORK_INDEX.md](WORK_INDEX.md) as the durable task inventory. The GitHub app in this session cannot change that repository setting; do not pretend issues were created.

## Next quality infrastructure

- GitHub-hosted disposable S7 protocol fixture with fault proxy (not yet implemented).
- Regenerate correct dependency lockfile and replace temporary no-lock smoke installation with npm ci.
- Add integration, repeated disconnect/timeout and resource-bound tests.
- No production OT access, npm publish or real PLC writes without human authorization.
