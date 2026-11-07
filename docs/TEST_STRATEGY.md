# Test strategy

**Goal:** test the Node-RED S7 integration's protocol and connection behavior without requiring a complete PLC process simulation on each change.

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
