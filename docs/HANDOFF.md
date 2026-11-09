# Development handoff — node-red-contrib-s7

## Continuation — 2026-11-09 (latest)

- Protected `master` `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` includes human-approved PR #9, #12, #10 and #15. The issue #2 COTP pending-socket leak is **fixed on master** by the exact `2cf864e38be447c2709348a25eb0524d67f5cf2d` dependency archive, COTP/real-CC regression tests and software S7Comm fixtures; issue #2 closed. Master checked **15/15 successful post-merge checks**, including CodeQL.
- **Active separate work:** [draft PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14), branch `ci/quality-gates-before-runtime`, based on current master. Adds *only* isolated `tools/quality` locked ESLint/Prettier/TS toolchain, repository scripts, both-host CI and docs. No runtime S7 code edits or dependency substitutions. Protected package smoke now aggregates native S7 wire + repaired nodes7 COTP + static quality OS matrices.
- Earlier PR #14 was stacked on old PR #12 branch, so the multi-parent-merge format baseline initially selected unrelated old S7Comm files. New `tools/quality/check-changed-format.cjs` anchors the compare to GitHub event `pull_request.base.sha` and refuses missing/non-ancestor bases; no mass formatting of inherited test code. Two observed initial quality failures were corrected. **Implementation SHA `294943df5717adac05cab540bf6d092eb83fb712` has 19/19 green check runs** (Verification 42612030118, lock 42612029945); this documentation commit must receive new exact-head CI before further decisions.
- TypeScript `checkJs` artifacts are **advisory with outstanding historic property errors**, not strict-green type safety. Python-snap7 S7Comm fixtures are *software-only*; HIL-S7-001…007 remain `PENDING_HARDWARE`, including any real scratch DB writes. No release, productive installation, hardware connection or unapproved merge.
- **Required next action:** recheck final PR #14 exact SHA, full required ruleset, 19 checks/CodeQL, current master and changed files; then request separate explicit human permission before any PR #14 merge. Do not merge PR #11/#13/#14 automatically; Issue #7 remains active for later safety/security gaps.

---

Historical notes below are preserved for auditability, not current GitHub state.


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

## Final packaging safeguard and evidence — PR #14 remains draft

After the real npm pack dry-run exposed dev-only `tools/quality/` files in the tarball, the candidate now has a scoped `.npmignore` rule and a `tools/quality/check-package-files.cjs` negative-control verifier in the **existing required** `Package dependency smoke` job. It requires all essential Node-RED runtime files and no quality toolchain files. Implementation SHA `cfa1eaeff67a88d4cbd3a3d32ecdfdc4fedf98df` passed Verification `42613182501`, lock workflow `42613182472`, **19/19 checks green including CodeQL**, actual logged `PACKAGE_MANIFEST_PASS`. The next docs commit requires renewed exact-head checks. This remains software/CI-only; PR #14 cannot be auto-merged without new human approval. HIL-S7-001..007 PENDING_HARDWARE; no publish or deployment.


## 2026-11-09 — PR #14 synchronized with approved PR #17 master

- Protected `master` advanced from `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` to **`cedbd85a38b26437160788f9dc17c352b645de03`** after separately approved [PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17) fixed an **integration test harness** status-polling timeout, not runtime PLC behavior. [Master CI 42663508468](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663508468) and GitHub code scanning [42663509052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663509052) passed on that exact commit; 13/13 visible post-merge checks green. Issue #16 is closed.
- [Draft PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) retains its existing `ci/quality-gates-before-runtime` branch and its isolated, SHA-integrity-locked `tools/quality` dependencies. This integration merges **the exact approved `master` parent** and preserves the newly committed `test/integration/wait-for-status.cjs`, `wait-for-status.test.cjs`, and `nodes7-wrapper-s7comm-wire.test.cjs` as-is, along with the four-host wrapper-contract deadline test step. Existing PR #14 static quality matrix on Ubuntu/Windows and the required protected `Package dependency smoke` aggregate for `wire-protocol`, `pinned-nodes7-integration` and `static-quality` are retained. No changes to production S7 wrapper/protocol or dependency source.
- PR #14's previous source `94920b28bd16de19345a22f079770d7d9cfd5133` had 19/19 green checks on an older base; **those results do not verify this new integrated commit**. Fresh exact-head Windows/Linux lint, Prettier, deliberate negative controls, npm lockfile, protected package manifest and native CodeQL are required. Advisory TypeScript diagnostics are **not** a zero-error proof.
- The PR remains **DRAFT and UNMERGED** until independent explicit owner approval. No npm publication, product installation, live PLC, HIL tests or production OT. HIL-S7-001…007 remain PENDING_HARDWARE.
