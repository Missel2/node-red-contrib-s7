
# Development handoff

## Current continuation: 2026-11-08 (PR #14)

- `master` was `c931dbac4232d3f4481812a65597301548f30739` when the scoped CI branch was created. [PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) is **merged**; the previous section below is a historical snapshot, not the current PR state.
- [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12), head `b6afbd8a82fa9e5432f899cec9be7672883f4e6a`: open, validated root `npm ci` lockfile on Ubuntu/Windows; awaiting human merge approval.
- [PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14): **draft stacked on PR #12**, adding isolated locked ESLint/Prettier tooling, Linux/Windows mandatory quality checks and negative controls. Initial exact-head `a8d381e5b506b34e99bb55f2f8b897237369b848` passed [verification 42483462367](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42483462367) and [lockfile 42483462378](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42483462378). After this documentation commit, verify **new exact-head CI** again.
- PR #14 has no runtime/protocol changes. Its TypeScript check reports inherited `red/s7.js` Node-RED instance typing problems, explicitly **advisory**. CodeQL must be rerun after retargeting PR #14 from its stacked branch to `master`; CodeQL is not yet a required branch-protection check.
- [PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10), head `877eed6cdb835f66bc59bf9348880dfb022d9bdf`: open protocol CI candidate, previous exact-head verification successful. Before integrating it after PR #14, combine the protected `package-smoke` job dependencies for **both** `static-quality` and `wire-protocol` and change protocol package install to locked `npm ci`.
- [PR #13](https://github.com/Missel2/node-red-contrib-s7/pull/13): draft stacked on PR #10; additional COTP disconnect characterization, not a transport fix. Issue #2 remains a reproduced, unfixed nodes7 socket cleanup problem.
- Human-approved sequence: #12, then retarget/recheck #14, then reconcile/recheck #10, then advance #13 and independently fix Issue #2. **No automatic merges, npm releases, live PLC tests or deployment.**


**Updated:** 2026-11-07. Confirm GitHub branch/CI state before further work.

## Baseline

- PR #6 [merged](https://github.com/Missel2/node-red-contrib-s7/pull/6) into `master` at `e79c15107731e0387d1b3679f2409aef043e87f5`; post-merge [CI 42377654001](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42377654001) 6/6 success. That green CI confirmed **five known failing desired-behavior checks** on the unmodified runtime; no bug fix.
- Issue #3 follow-up branch `fix/issue-3-session-owned-read-lifecycle` contains the candidate lifecycle fix and a test-gate conversion. **Do not claim this fix verified until a green CI run on the exact head SHA.**
- No new dependency/protocol implementation. Lockfile still stale (#5); independent S7 wire fixture still outstanding (#4); separate pending COTP transport teardown (#2).

## Candidate lifecycle change / limitations

- Pending ItemGroup read ownership retained through disconnect/reconnect; per-connection generation marks late success/rejection stale; old values do not publish.
- Stop/close cancels polling timer and makes close callback complete even if disconnect rejects; repeated read requests coalesce. Keep disabled cycle interval through reconnect.
- **Known limitation:** an `@st-one-io/nodes7` read promise that never settles still blocks subsequent reads on the same item group. True transport abort/recreation belongs to an independent, test-first dependency strategy; do not silently overlap operations.
- Existing required check `Baseline must fail stale-read regression` is retained for branch ruleset continuity. It now checks seven assertions **red against frozen original master `e79c151` AND green against proposed corrected wrapper**. Five were characterized in PR #6, five are added as negative controls here (including disabled polling, post-close events and a transient transport-error retry without a disconnect). `npm test` must now run positive corrected lifecycle checks.
- Only mock Node-RED/transport tests have run, no actual wire, Siemens simulator or physical S7-1200 tests.

## Future hardware testing

- [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8), [HIL matrix](HIL_TEST_MATRIX.md): HIL-S7-004/005/007 **PENDING_HARDWARE**. No physical CPU or test-runner available; no real PLC interaction permitted.
- Only trusted, approved hardware tests on isolated runner with explicit safety checks, and separate approval for physical writes.

## Next

1. Inspect actual branch head, current CI (all six jobs) and the patch; fix failures without weakening negative control or regression expectations.
2. Provide human review and merge decision for the scoped Issue #3 fix PR; **no unattended merge**.
3. Then continue #4 (wire fixture), #5 (reproducible lockfile) and #2 (pending handshake teardown) separately.

## No-go boundaries

Do not auto-merge, publish to npm, deploy to production OT or use real PLCs without explicit authorization.


- Issue #5: [draft PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) regenerates inherited stale npm lockfile v1 (package 3.0.0) via GitHub Actions artifact `npm-lockfile-node22` [run 42415922024](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415922024) into a real `lockfileVersion: 3` for package 3.1.3. The first run intentionally failed `git diff --exit-code` because the lockfile was not yet committed, while npm-ci and dependency import steps passed; the artifact contains exact registry integrity metadata for `@st-one-io/nodes7@1.1.2` and `iso-on-tcp@0.1.0`. Final PR adds this lock, upgrades the existing required package-smoke job to `npm ci`, and runs lock regeneration/clean install on Ubuntu and Windows. Verify exact-head CI before claiming reproducibility or merging. No npm publish.


- Issue #5 exact dependency-tree evidence: [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) code `b646572` passed [CI 42416075677](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075677) (6/6), [Ubuntu/Windows lock and npm-ci matrix 42416075682](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075682) (2/2) and [CodeQL 42416072293](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416072293) (2/2). Real lockfile v3 with registry SHA512 integrity metadata; `@st-one-io/nodes7@1.1.2`, `iso-on-tcp@0.1.0`. Npm audit inventories showed zero current known vulnerabilities on both OSes; scan remains informational. Docs-only head update requires new CI. No merge or release performed.
