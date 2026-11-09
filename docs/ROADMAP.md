# Roadmap and next verified work

**Status date:** 2026-11-07. This is an ordered engineering plan, not a delivery claim. Work state must be updated from code, PRs and CI logs at the time of each change.

## P0 — Reproduce the previously investigated Musashi connection fault

**First technical priority.** Do not start with feature development or a large protocol rewrite. PRs #1 and #6 added governance and defect characterization; **PR #9 has now been squash-merged**, fixing confirmed stale-read/reconnect lifecycle defects in `master`. Separate **draft PR #10** adds genuine classic S7Comm tests against a disposable server on Linux and Windows, including two server restarts. Physical HIL verification is still pending. [Issue #3](https://github.com/Missel2/node-red-contrib-s7/issues/3) tracks wrapper characterization, and [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) tracks the separate pending COTP/transport teardown hypothesis. See [Musashi investigation](MUSASHI_CONNECTION_REGRESSION.md) and [evidence ledger](EVIDENCE.md). Apply targeted patches only after reproducing a failure.

- [ ] Locate the actual Musashi Node-RED image patch/source, its origin commit and failure evidence.
- [ ] Separate `@st-one-io/nodes7` / classical S7 code from any independent `s7-plus` changes.
- [ ] Create a minimal failing test for a failed or interrupted connection and resource cleanup.
- [ ] Record connection/session counts, retry cycles, timing and diagnostic events.
- [ ] Apply the minimum reviewed correction at the right layer; decide whether it belongs in this fork, a maintained protocol dependency fork or both.
- [ ] Demonstrate fail-before/pass-after on identified commits and verify no write regression.
- [ ] Preserve the analysis, test fixture and results in the repository.

**Exit evidence:** reproducible fault and traceable passing regression on the corrected commit. Prior image-level verification is not equivalent to this exit criterion.

## P1 — CI baseline and disposable protocol endpoint

- [ ] Select and pin supported Node.js/Node-RED platforms.
- [ ] Replace the current failing `npm test` placeholder with real automated tests.
- [ ] Verify an S7-compatible server/fixture on GitHub-hosted Ubuntu and Windows runners.
- [ ] Test TCP fault injection and ensure the workflow fails if the server cannot start.
- [ ] Add static analysis, dependency/security checks and redacted downloadable diagnostics.
- [ ] Record covered protocol operations and fixture limitations.

**Exit evidence:** green CI on a named commit, confirmed read/write and connection recovery behavior against the named fixture; unsupported scenarios documented.

## P2 — Connection and data-quality behavior

- [ ] Define explicit connection state model, error identifiers and diagnostic schema.
- [ ] Bound reconnect/backoff, concurrent sessions and queued work.
- [ ] Expose last successful read, value age/quality and disconnected/stale states.
- [ ] Define behavior and tests for invalid addresses, read failures and ambiguous write results.
- [ ] Test redeploy, shutdown, repeated faults and sustained recovery for leaks.

**Exit evidence:** specified and tested behavior, not merely absence of observed errors.

## P2H — Future isolated physical S7-1200 verification ([Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8))

**Planned, not deployed and not run.** The maintainer intends to provide a dedicated S7-1200 reachable only through an isolated RischLab hardware-in-the-loop test runner. Continue mock and disposable protocol CI while awaiting hardware.

- [ ] Identify the exact CPU order number, firmware and a dedicated test PLC program with a non-optimized scratch DB and no physical I/O effects.
- [ ] Approve topology, TCP/102 egress constraints, test-data addresses, power/reset and safe read/write procedures.
- [ ] Run only trusted, approved source revisions against the hardware; do not expose the test runner or PLC to arbitrary public PR code.
- [ ] For **every development PR**, mark required future tests by stable `HIL-S7-*` IDs from [HIL_TEST_MATRIX.md](HIL_TEST_MATRIX.md). Pending means **not executed**, even if mocked tests are green.
- [ ] Create a separately authorized, gated HIL workflow with evidence (CPU, firmware, project SHA, commit SHA, test logs), after the bench is available.

**Exit evidence:** verified runs on the named S7-1200 with safe setup and reset. Until then all HIL cases remain pending.

## P3 — Compatibility and controlled releases

- [ ] Preserve existing Node-RED node types/settings or publish tested migration instructions.
- [ ] Specify supported Node.js/Node-RED and classic S7 CPU/protocol test matrix.
- [ ] Implement versioned release candidates, change log, dependency bill of materials as appropriate, and rollback notes.
- [ ] Evaluate hardware-in-the-loop or supported Siemens simulation for vendor-specific claims.
- [ ] Define publication identity/name before any npm release to avoid confusion with the upstream package.

**Exit evidence:** traceable release candidate with documented verification boundaries.

## P4 — Additional functionality after reliability baseline

Candidates for separate design decisions and issues:
- independently configurable publish intervals without additional PLC polling;
- optional publish-on-change, freshness metadata and reconnect-event output;
- targeted per-variable failure diagnostics;
- import and validation of variable definitions;
- clearer Node-RED editor status and debug information.

New functionality must not bypass P0/P1 reliability work.

## Maintainer continuation rule

Start every development round by checking the current default branch, issues, active PRs and CI. Continue unfinished work before creating overlapping branches. Update this roadmap with actual evidence and outstanding gaps. Never convert a design target into a statement of achieved reliability.


## Current milestone — 2026-11-07

- PR #9 was merged as `c931dbac4232d3f4481812a65597301548f30739`; [master CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) passed 6/6 mandatory jobs. Preserve original-red/corrected-green lifecycle check.
- [PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) adds actual loopback COTP/S7Comm, read/write, aborted handshake and auto-reconnect across two server restarts; [pre-integration CI 42412099544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412099544) passed on Ubuntu/Windows. The conflict resolution joining #9 and #10 requires new exact-head CI before merging PR #10.
- Outstanding: TCP half-open/blackhole, OS-level socket resource measurements, reproducible `npm ci` (Issue #5), later authorized S7-1200 HIL. No Siemens firmware or production PLC has been tested.


## CI sync following separate lockfile PR #12 merge (2026-11-09)

- PR #12 approved and merged to protected master `7bee547d164fd94d3ecec1eee472fb860ba4a31c`. PR #10 is updated with the exact v3 lockfile and `npm ci` for the unchanged synthetic S7Comm fixtures, but is **not** approved for merge. HIL remains pending. 


## 2026-11-09: approved S7Comm fixture merge, COTP integration next
- Wrapper PR #12 (v3 lock) approved/merged `7bee547d`; wrapper PR #10 (five actual synthetic S7Comm and TCP fault tests) separately approved/merged `8e460f1`; maintained nodes7 PR #13 approved/merged `2cf864e38be447c2709348a25eb0524d67f5cf2d`.
- Wrapper draft PR #15 pins this exact nodes7 SHA using HTTP(S) plus SHA-512 npm integrity. Its native in-tree five-case S7Comm matrix now also checks actual installed-fork Node-RED DB1 read/write/readback, while a second OS matrix checks pending COTP close and late CC callback. Both feed the required package smoke status. PR #15 has **no merge approval** and needs its own final full exact-head CI and CodeQL.
- No software protocol test establishes Siemens S7-1200 firmware support. HIL-S7-001/-002/-003/-004/-005/-007 remain pending.

## 2026-11-09 — latest integrated software baseline and P1 quality gate

- Human-approved PR #15 squash-merged to protected master `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` with the fixed SHA512-locked maintained nodes7 COTP stream. Issue #2 software leak is closed with Windows/Linux genuine TCP/COTP and S7Comm regression evidence. Hardware HIL and releases remain gated separately.
- Active [draft PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) is independently reconciled with this master, adding isolated pinned ESLint/Prettier on hosted Windows/Linux, deliberate failing quality controls, advisory TS diagnostic artifacts, and a protected aggregate dependent on all three wire/COTP/quality matrices. Source head `294943df` has 19/19 green CI checks; docs-only follow-up requires new exact-head CI. PR #14 still needs explicit human merge permission.

### Quality and future packaging safety boundary

Draft PR #14 now verifies (a) ESLint/Prettier correctness with deliberate failing cases on Windows/Linux, (b) protected package-smoke dependency on actual wire/COTP/quality matrices, and (c) that `npm pack --dry-run` contains Node-RED runtime resources but not the isolated CI-only `tools/quality/` lock and scripts. Source `cfa1eae` had 19/19 checks green. Future *release-readiness* work should separately review whether historically bundled docs/tests/CI metadata also belong in a published Node-RED palette tarball. Do not publish or access Siemens hardware without separate authorization.


## 2026-11-09 — PR #14 synchronized with approved PR #17 master

- Protected `master` advanced from `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` to **`cedbd85a38b26437160788f9dc17c352b645de03`** after separately approved [PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17) fixed an **integration test harness** status-polling timeout, not runtime PLC behavior. [Master CI 42663508468](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663508468) and GitHub code scanning [42663509052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663509052) passed on that exact commit; 13/13 visible post-merge checks green. Issue #16 is closed.
- [Draft PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) retains its existing `ci/quality-gates-before-runtime` branch and its isolated, SHA-integrity-locked `tools/quality` dependencies. This integration merges **the exact approved `master` parent** and preserves the newly committed `test/integration/wait-for-status.cjs`, `wait-for-status.test.cjs`, and `nodes7-wrapper-s7comm-wire.test.cjs` as-is, along with the four-host wrapper-contract deadline test step. Existing PR #14 static quality matrix on Ubuntu/Windows and the required protected `Package dependency smoke` aggregate for `wire-protocol`, `pinned-nodes7-integration` and `static-quality` are retained. No changes to production S7 wrapper/protocol or dependency source.
- PR #14's previous source `94920b28bd16de19345a22f079770d7d9cfd5133` had 19/19 green checks on an older base; **those results do not verify this new integrated commit**. Fresh exact-head Windows/Linux lint, Prettier, deliberate negative controls, npm lockfile, protected package manifest and native CodeQL are required. Advisory TypeScript diagnostics are **not** a zero-error proof.
- The PR remains **DRAFT and UNMERGED** until independent explicit owner approval. No npm publication, product installation, live PLC, HIL tests or production OT. HIL-S7-001…007 remain PENDING_HARDWARE.
