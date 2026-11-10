**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.

Current navigation: [work index](WORK_INDEX.md), [review](PROJECT_REVIEW.md).
Historical sections below retain the status of their named revision; they do not override this snapshot.

---

# Test strategy

**Goal:** test the Node-RED S7 integration's protocol and connection behavior without requiring a complete PLC process simulation on each change.

## Required state-transition and command-versus-state regression standard

For changes affecting connection, retry, timeout, S7 I/O, node lifecycle, flow deploy/close or queue ownership, require a **public-API behavioral contract with positive and negative tests**, not solely a method-level or mock assertion:

1. **Explicit command:** `disconnect()`/Node-RED flow removal stops new TCP/S7 attempts regardless of the configured `autoReconnect`. After an intentional new connect/deploy, the same client must resume a real synthetic S7Comm operation when relevant.
2. **External condition:** without a public user disconnect/reconnect command, drop the local peer/network. With retry configured, assert bounded reconnect and a fresh synthetic DB read after recovery; with retry disabled, assert no self-initiated reconnect. A reported disconnect *event* is not a user stop command.
3. **Bug detectability:** for a defect use a named original baseline SHA, an intentional *same-test* failed behavioral assertion (red), and a passing candidate SHA (green). Harness timeout, skipped tests, a known-failure allowance, or a mock-only pass must not be presented as fixed behavior.
4. **End-to-end evidence:** test the actual installed package inside disposable Node-RED where changes cross the wrapper boundary; otherwise real loopback TCP/COTP/S7Comm suffices for transport behavior. Capture emitted errors/status/Complete/Catch, real requests, fresh values, timers/peers before forced fixture cleanup, and redacted machine-readable logs. Bound all waits; ambiguous writes must never be silently replayed.
5. **Merge review:** every relevant PR identifies covered command/external-state/configuration combinations, exact-head Windows/Linux CI, meaningful negative controls, known gaps and `HIL-S7-*` debt. Documentation-only or independent tooling PRs may mark cases N/A with clear technical justification.

**Reference:** [nodes7 PR #21](https://github.com/Missel2/nodes7/pull/21), whose real COTP/S7Comm test proves stop → deliberate reconnect → external failure → *automatic* recovery → stop, plus original-red/candidate-green. The wrapper must additionally retest this **through its installed Node-RED tarball** after the library change is approved and repinned; merely passing the dependency's CI is not sufficient.

## Layers and confidence

| Layer | Environment | Test focus | What it cannot establish |
| --- | --- | --- | --- |
| Unit | Node.js, mocks | Lifecycle state transitions, timers, error classification, read/write queue behavior | Wire/protocol interoperability |
| Protocol CI | Disposable S7-compatible server and Node-RED/client | Connection setup, reads, writes, reconnect and wire-visible errors | Vendor firmware compatibility |
| Fault injection | Controllable TCP proxy/server | Partial handshake, abrupt close, reset, blackhole/timeouts, slow response, repeated failures | Full behavior of every real network |
| Optional vendor simulation | Licensed and supported Siemens environment | Documented Siemens simulator behavior | All physical CPU/firmware variants |
| Hardware-in-the-loop | Isolated, authorized test PLC | Named CPU/firmware behaviors and endurance | Universal compatibility |

Each layer must identify the exact fixture/software version and the tested commit. A protocol test double is not a Siemens PLC.

## Future physical Siemens S7-1200 bench and per-PR test debt

The maintainer plans an isolated real S7-1200 and a controlled RischLab RKE2 runner, tracked as [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8). **No CPU, firmware or hardware CI is available yet.** Never present pending hardware tests as passed.

For every development PR, populate `HIL applicability` with IDs from [HIL_TEST_MATRIX.md](HIL_TEST_MATRIX.md), including new cases where existing IDs are insufficient. Declare `HIL: not applicable` with justification only if hardware cannot materially test the changed behavior. Annotate test sources with relevant IDs where practical. The matrix is a versioned traceability record; a hardware pass requires test execution with CPU order number, firmware, test-program hash, Git SHA, operator authorization and logs.

Do not configure `pull_request` jobs on a runner with a route to the physical CPU. Use a trusted branch/manual approval workflow and a dedicated isolated runner; verify a known safe program, disconnected outputs, scratch DB and read/write preflight, then reset and check the CPU after the run. Protocol-only CI remains mandatory and independent of the future HIL bench.

## Initial GitHub-hosted CI proof of concept

1. Run on Linux and Windows GitHub-hosted runners with supported Node.js versions and an independently started S7-compatible local server.
2. Verify actual S7 handshake and successful read/write against known test addresses; use a nonprivileged local test port where supported.
3. Add a controllable fault proxy so a test can forcibly stop/reset a connection during setup and a read without relying on undocumented simulator behavior.
4. Capture active application-managed socket counts, state changes, failure/recovery events and bounded logs.
5. Repeat faults enough to detect resource leaks; use deterministic assertions and collect run-to-run metrics rather than selecting an arbitrary pass threshold.
6. Shut down all child processes; upload redacted logs and machine-readable test results even for failed runs.
7. Fail CI on violated behavior or a test harness that did not start correctly. No silent skip counts as success.

Candidate fixture: a Python/Snap7-derived S7 server or a dedicated deterministic protocol fixture. Its protocol coverage, licensing, runner compatibility and ability to inject the required failures must be verified before selection. Use plain TCP mocks for purely transport-level failures; do not overstate those tests as S7 protocol validation.

## Priority regression: Musashi connection lifecycle

Prior work reported socket/resource cleanup and reconnection faults in a Node-RED deployment. The exact patch provenance and relevant dependency have **not yet been independently verified in this repository**. First locate and review the source patch, deployment/container changes and any available logs. Distinguish classic `nodes7` from the separate `s7-plus` stack. Do not merge unrelated protocol changes.

Expected regression sequence:
1. Identify an affected baseline revision and a deterministic trigger.
2. Demonstrate the failure on the baseline.
3. Observe socket/session and error-state behavior while the peer fails or restarts.
4. Apply the smallest justified correction to the correct dependency or integration layer.
5. Demonstrate that the same regression passes on the corrected commit.
6. Confirm that reads, writes, redeploy/shutdown and normal reconnect remain functional.
7. Preserve test output and document what remains unverified on actual hardware.

## Release validation

- At each PR: fast unit checks, key connection fault regression and baseline protocol tests.
- At scheduled/RC validation: extended recovery/stress runs, supported OS/Node-RED compatibility matrix, dependency scanning and packaging.
- Before asserting compatibility with a Siemens CPU family/firmware: simulator or test hardware evidence specific to that claim.
- Before operational use: plant owner approval, network security assessment and read/write risk evaluation.

Windows is useful to check platform compatibility, but a Windows runner is not itself evidence of Siemens PLCSIM compatibility. No trial-license reset, license bypass or assumed “PLCSIM Light” capability is part of the CI architecture.


## First actual-wire fixture candidate: python-snap7 3.3.1 (Issue #4)

A separate disposable hosted CI proof of concept runs a **pure-Python S7Comm server** with synthetic DB1 data bound to `127.0.0.1:1102`, and tests the existing `@st-one-io/nodes7@1.1.2` dependency without stubbing S7Endpoint/S7ItemGroup. This covers COTP/ISO-on-TCP setup, S7 read and scratch DB write/readback **only if the dedicated CI test passes**. The fixture does not load Siemens firmware, simulate physical process I/O, or validate Siemens security features. The exact dependency version is pinned and the fixture runs inside an ephemeral GitHub-hosted job, with logs archived.

A second phase must add controlled TCP handshake corruption/drop, blackhole/timeouts and server restart via a bounded fault proxy; a third phase verifies Windows parity. The current upstream `package-lock.json` remains out of sync until Issue #5. Record any interoperability failures rather than silently suppressing them. Physical tests HIL-S7-001/-002/-003 remain pending.


The first real-wire Linux roundtrip passed on [PR #10 run 42406148441](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406148441), SHA `88ac3011`. The next candidate adds a loopback TCP server aborting after an RFC1006 TPKT but before COTP confirmation, and Windows hosted-runner parity. **Do not claim those newly added scenarios passed before checking exact-head CI.** This is not the same as validating a real PLC's transport behavior.


The stricter false-positive-resistant abort test and an explicit clean disconnect passed on both platforms at [run 42406722052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406722052), SHA `1aff199`. **A partial COTP abort takes about 10 seconds to reject** under nodes7's configured transport-setup watchdog. This is an observed limitation, not an industrial recovery guarantee.


## Two actual software server restarts (CI verified 2026-11-07)

[PR #10 run 42411812676](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42411812676) passed on Ubuntu and Windows with a *single real S7Endpoint* reused across two killed/recreated `python-snap7==3.3.1` server processes. Each cycle includes an observed TCP disconnect, at least one refused retry while the server is down, successful reconnect and fresh reset DB1 read. These are protocol-level integration results, distinct from hardware HIL or proof of all resource cleanup. The remaining priority for Issue #4 is bounded blackhole/half-open fault injection and explicit client/socket resource measurements.


## Maintained nodes7 fork integration — PR #15 unmerged
- With PR #10 approved and on protected master, **run `test/protocol/*.test.js` directly from this repository**. Do not fetch a second checkout of PR #10 or copy fixtures from an unmerged branch.
- Hosted `S7 wire tests` on Ubuntu/Windows Node 22 use `python-snap7==3.3.1`, the fixed SHA512-locked fork and additionally execute `test/integration/nodes7-wrapper-s7comm-wire.test.cjs` and `scripts/ci/verify-s7-wire-replay.cjs`. All write tests use synthetic DB1 in a disposable software server. No hardware writes.
- Hosted `Pinned nodes7 integration` on both OSes executes `npm run test:integration`, with actual installed library, TCP early close in minimal Node-RED harness and a genuinely parsed late CC callback. Both OS matrices are upstream gates for protected `Package dependency smoke (Ubuntu, Node 22)`. CI cannot silently succeed from an expected-red test or skipped protocol job.
- HIL-S7-001/-002/-003/-004/-005/-007 PENDING_HARDWARE; software server does not represent Siemens firmware or full Node-RED runtime compatibility.

## Static quality characterization (draft PR #14, 2026-11-09)

- Dev-only, independent locked `tools/quality` dependencies are installed with `npm ci --prefix tools/quality` under Ubuntu and Windows Node 22. ESLint checks correctness rules, including CJS integration and wire verification scripts; the genuine negative control fails on `no-undef` and on invalid Prettier formatting while accepting known-good controls.
- Prettier checks newly introduced files and previously formatted changed files using GitHub's exact PR base SHA. Existing unformatted legacy files are explicitly reported as debt, not rewritten in a bulk change or excused from ESLint. A wrong merge-base previously flagged eight unrelated protocol files and was corrected with verified source and CI evidence.
- Advisory `tsc --checkJs` captures inherited Node-RED property typing warnings, **not** a strict type-pass. No source code safety or hardware approval follows from passing static tools; HIL-S7-001…007 pending. Protected package smoke must require native protocol, pinned nodes7 COTP and static-quality OS matrices together.

## Installed package and real runtime

[The installed Node-RED runtime lab](RUNTIME_LAB.md) exercises both a
lock-equivalent install and a consumer install of the exact same tarball.
The report separates passing lifecycle observations, the recorded known
post-removal retry failure, and hardware test debt.
