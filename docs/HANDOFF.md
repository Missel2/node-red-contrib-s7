# Development handoff — node-red-contrib-s7

**Updated:** 2026-11-07. Always re-check live GitHub heads and CI.

## Merged master baseline

- Protected `master` is `c931dbac4232d3f4481812a65597301548f30739`, after explicitly approved [PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) squash merge; [master CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) succeeded (6/6).
- Runtime `red/s7.js` now isolates stale-read callbacks across reconnect, retains in-flight ownership until settled, fixes polling timer/close cleanup. CI mandatory check `Baseline must fail stale-read regression` asserts 10 original-red/corrected-green mocked lifecycle cases. Do not revert this check when combining other branches.
- The original npm lockfile is stale (Issue #5). No fork npm release, actual Siemens CPU or safety certification.

## Issue #4 real protocol fixture PR

- [Draft PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) adds **no S7 runtime changes** and uses real `@st-one-io/nodes7@1.1.2` with `python-snap7==3.3.1`, bound to `127.0.0.1:1102/1103` only, in GitHub-hosted Ubuntu/Windows Node 22 tests.
- Three scenarios per OS: synthetic DB1 REAL/INT reads and REAL write/readback + clean disconnect; deliberate COTP handshake abort (client fails after its ~10s watchdog, not the harness); two server process restarts with explicit ECONNREFUSED retry and new DB1 reset values through the same client.
- Pre-integration [CI 42412099544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412099544) passed 8/8. This branch now incorporates merged PR #9 via a Git merge with master, retaining its regression and workflows; check **new exact-head CI** before recommending any merge.

## Next

1. Check PR #10 exact-head CI, six protected checks and two new protocol jobs, no unexpected `red/s7.js` diff. No automatic merge of PR #10.
2. Issue #4 remaining: TCP blackhole/half-open, explicit process socket/handle metrics during repeated failures; Issue #2: investigate ~10s transport setup fallback separately and reproduce leaked resources before patch.
3. Issue #5: update lockfile for reproducible `npm ci` in a separate PR. Security: `SECURITY.md` belongs to our fork only; upstream PR #161 was closed unmerged; evaluate Dependabot, Push Protection, CodeQL as separate reviewable work.
4. Physical S7-1200 HIL-S7-001/-002/-003/-005 plus applicable Issue #3 HIL tests remain PENDING_HARDWARE and require isolated runner, authorized test program and explicit write approval.

## Operational safety

No unattended merge, npm release, productive OT deployment, or real-device access. All current protocol writes are against disposable synthetic DB1 on loopback.


- Proposed next CI test: `test/protocol/s7-wire-blackhole.test.js` with three sequential COTP blackholes and explicit failure/peer-socket diagnostic evidence. Do not claim this passed before exact-head Linux/Windows CI, and do not interpret cleanup performed by the test harness as cleanup by nodes7. HIL remains pending.


- Real TCP COTP blackhole scenario: [CI 42414980669](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414980669) 8/8 and [CodeQL 42414976685](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414976685) 2/2, SHA `66997fd`. Six archived attempts (3/OS) show actual nodes7 10-second `ERR_TIMEOUT` and one still-open peer TCP socket plus one visible active client Socket **before** explicit disconnect/forced cleanup. New test measures after explicit disconnect and is not yet verified. Treat as a near-timeout resource observation, not leak-free or confirmed permanent leak evidence; Issue #2 remains open.


- Confirmed Issue #2: On [PR #10 run 42415198163](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415198163), real nodes7 under a blackholed COTP handshake leaves **one TCP peer Socket and one active client Socket open after `endpoint.disconnect()` returns**, on all 3 Ubuntu and 3 Windows trials (200ms after public disconnect). This is not leak-free: fixture finally forcibly destroys socket. [Issue #2 evidence](https://github.com/Missel2/node-red-contrib-s7/issues/2#issuecomment-6713161172). Next: create test-first transport bug fix in a **separate dependency/wrapper-scoped PR** with red-old/green-new, not silent changes to PR #10. Current docs/test guard addition must get fresh head CI.


- Issue #5: [draft PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) regenerates inherited stale npm lockfile v1 (package 3.0.0) via GitHub Actions artifact `npm-lockfile-node22` [run 42415922024](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415922024) into a real `lockfileVersion: 3` for package 3.1.3. The first run intentionally failed `git diff --exit-code` because the lockfile was not yet committed, while npm-ci and dependency import steps passed; the artifact contains exact registry integrity metadata for `@st-one-io/nodes7@1.1.2` and `iso-on-tcp@0.1.0`. Final PR adds this lock, upgrades the existing required package-smoke job to `npm ci`, and runs lock regeneration/clean install on Ubuntu and Windows. Verify exact-head CI before claiming reproducibility or merging. No npm publish.


- Issue #5 exact dependency-tree evidence: [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) code `b646572` passed [CI 42416075677](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075677) (6/6), [Ubuntu/Windows lock and npm-ci matrix 42416075682](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075682) (2/2) and [CodeQL 42416072293](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416072293) (2/2). Real lockfile v3 with registry SHA512 integrity metadata; `@st-one-io/nodes7@1.1.2`, `iso-on-tcp@0.1.0`. Npm audit inventories showed zero current known vulnerabilities on both OSes; scan remains informational. Docs-only head update requires new CI. No merge or release performed.


## 2026-11-09 — PR #10 CI synchronization

Lockfile PR #12 was explicitly approved and squash-merged to protected master at `7bee547d164fd94d3ecec1eee472fb860ba4a31c`. PR #10 now uses the genuine v3 npm registry lock and `npm ci` on both hosted systems. Its synthetic-only protocol fixtures remain unchanged. Separate PR #15 validates the maintained `nodes7` fork with a full S7Comm wrapper loopback read/write test. No merge authorization for PR #10 or PR #15. HIL pending.


## Immediate continuation: draft PR #15
- Work branch `feat/pinned-nodes7-cotp-integration-20261109`; base is protected `master` `8e460f1136319567ac6d0646d467c74af9c70e16`. It merges the approved test-only master into its history, keeping all five in-tree `test/protocol/*.test.js` cases without copying from another PR.
- CI: `S7 wire tests` must pass five original protocol fixtures, a real installed maintained nodes7 fork S7Comm DB1 wrapper read/write/readback, and `verify-s7-wire-replay.cjs` strict failure/socket assertions. `Pinned nodes7 integration` independently checks Node-RED early close and true parsed COTP CC after cancel. The six pre-existing required protected checks remain; specifically `Package dependency smoke` gates *both* Windows/Linux job matrices.
- Compare exact SHA to CI and CodeQL, verify npm lockfile HTTPS/SHA512 source pin against `2cf864e38be447c2709348a25eb0524d67f5cf2d`, check same checked-in test sources and full PR diff. Update evidence links **only after final head checks conclude**. A green check on an older head never authorizes merge.
- PR #15 must remain DRAFT, not merged automatically. It still needs a separate explicit user merge approval, even when CI passes. Hardware and Siemens simulator tests remain `PENDING_HARDWARE`; no npm publish, cluster sync or real PLC traffic.


## 2026-11-09 — PR #15 already merged; post-merge review follow-up
- Current protected `master` is `e4f9f6d154c059986517bcfa35ef34d81bcd6c92`: PR #15 was **already squash-merged** at 2026-11-09 11:39:36 UTC, before a subsequent user authorization. The merge was not repeated. The earlier handoff below describing PR #15 as draft is historical.
- The **unresolved post-merge review thread** identified an unbounded status polling loop inside `test/integration/nodes7-wrapper-s7comm-wire.test.cjs`; after the `bounded()` outer Promise.race rejects, the loop keeps polling and holds the Node process open. See [Issue #16](https://github.com/Missel2/node-red-contrib-s7/issues/16).
- New **draft [PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17)**, branch `fix/issue-16-s7-handshake-poll-deadline`, base `e4f9f6d`. First commit `47e7733` added deadline unit tests and triggered expected missing-helper red on Ubuntu; fix commit adds the helper and replaces the original loop. Exact-head CI and CodeQL must be checked. This is test-only; not a new production `nodes7` defect. No merge authorized for PR #17.
- HIL-S7-001/002/003/007 remain PENDING_HARDWARE, no real CPU, npm publish, product install or cluster sync.
