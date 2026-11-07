# Development handoff

**Last updated:** 2026-11-07 — verify live GitHub state before acting.

## Working model and scope

- Repository: `Missel2/node-red-contrib-s7`; protected default branch `master`.
- PR #1: [development process and hosted CI baseline](https://github.com/Missel2/node-red-contrib-s7/pull/1), squash-merged to `master` as commit `42296d8`.
- Current follow-up branch: `test/issue-3-characterize-stale-read-reconnect`; adds **only characterization tests**, CI log capture and handoff. No runtime corrections.
- The intended final PR #1 diff makes **no changes to `red/s7.js`**. Experimental code-level fixes from earlier PR revisions were intentionally returned to the upstream baseline on this branch. Do not revive them in this PR.
- PR #1 includes AI assistance disclosure, upstream provenance/thanks, issue & PR templates, stable documentation handoff, Windows/Linux hosted CI, four positive wrapper baseline tests and one expected failing stale-read characterization test. Node-RED and nodes7 are mocked; no S7 wire/CPU evidence.
- The baseline stale-read test is a **confirmed expected failure** on unmodified upstream code; green CI for that job means reproduction, not repair.
- The inherited `package-lock.json` does not match `package.json` and remains a separately tracked issue.

## First action for next session

1. Verify the final CI run on squash-merged `master` and the current Issue #3 test-only PR/branch. Do not start another overlapping PR.
2. Confirm no `red/s7.js` runtime diff. The additional three expected-failure tests must **each** fail against the original wrapper by the named assertion, while the six required CI checks remain green.
3. If verified, decide whether to merge the test-only suite. Never claim the bugs fixed.
4. Next, prepare a separate Issue #3 single-purpose wrapper correction, with the negative-control gate converted to positive verification on that fix PR. No unattended merges.

## Follow-up work (test first)

- [#2](https://github.com/Missel2/node-red-contrib-s7/issues/2): prove or disprove pending ISO-on-TCP handshake teardown defect in nodes7, then patch independently.
- [#3](https://github.com/Missel2/node-red-contrib-s7/issues/3): characterize stale reads/reconnect overlap with baseline-failing tests; then a narrow wrapper fix PR.
- [#4](https://github.com/Missel2/node-red-contrib-s7/issues/4): licensed disposable S7 protocol fixture and controllable TCP faults on hosted Ubuntu/Windows.
- [#5](https://github.com/Missel2/node-red-contrib-s7/issues/5): regenerate the stale lockfile and enforce npm ci.

## Guards

- No auto-merge, npm publication, productive OT deploy or real PLC writes.
- Separate mocked behavior from wire-protocol/server tests and hardware verification.
- A previous public PR revision contained a private registry hostname; the current documents omit it, but old GitHub references could persist. Do not repeat private identifiers.
