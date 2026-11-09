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


## Pinned COTP fork integration contract (draft PR #15)

- A GitHub-hosted Ubuntu/Windows Node 22 matrix installs the committed v3 lock using `npm ci --ignore-scripts --no-audit --no-fund`. Source is a GitHub HTTPS archive addressed by the full **nodes7 merge commit SHA** and protected by npm SHA-512 integrity, not a mutable branch or npm registry alias.
- Test `test/integration/nodes7-pinned-fork.test.cjs` imports **the installed package** `@st-one-io/nodes7` to prove fork implementation, and instantiates the real `red/s7.js` Node-RED config node using a minimal API harness (not a full Node-RED runtime). Against disposable loopback TCP it verifies pending COTP shutdown during Node-RED close with no false online state, errors, retries or unclosed sockets.
- A separate real TPDU CC test waits until the installed ISO-on-TCP parser decodes a full COTP confirmation, cancels the endpoint before the client's queued native connect callback, and verifies that callback is ignored and no sessions are revived. JSON evidence is captured **before** fixture socket teardown on both OSes.
- Two job results are prerequisites of existing protected `Package dependency smoke (Ubuntu, Node 22)` status check. A green mock test alone cannot satisfy that aggregate.
- The [wire-protocol PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) remains unmerged and is not silently imported into this stacked branch. No claim of production OT, actual CPU/HIL or full Node-RED simulator compatibility; hardware test debt `HIL-S7-001/002/003/004/005/007` remains pending.


## Protected cross-PR S7Comm replay without duplicating PR #10 (draft PR #15)

- Windows/Ubuntu hosted matrix checks out only the immutable `test/issue-4-s7-wire-roundtrip` commit `877eed6cdb835f66bc59bf9348880dfb022d9bdf` into an ephemeral runner directory, verifies its SHA and copies the fixture + five tests **locally**. The installed library is **not** from the fixture branch: it is the SHA+SHA-512-verified `Missel2/nodes7` fork already pinned in wrapper `package-lock.json`.
- Five actual protocol tests prove synthetic DB1 read/write, two restarts with fresh values, partial COTP abort, explicit TCP RST and three 10-second blackhole timeouts. `scripts/ci/verify-s7-wire-replay.cjs` checks report presence, synthetic-only flags, native errors, no client handles, restart freshness, TCP reset, and socket cleanup rather than counting green exit alone.
- The separate `nodes7-wrapper-s7comm-wire.test.cjs` exercises the actual `red/s7.js` config node with a minimal `RED` API harness: real classic S7Comm read of REAL/INT and write/readback through public `node.writeVar`, followed by one Node-RED close callback and zero client handles. This covers real protocol data through wrapper *without* claiming a full Node-RED runtime, Siemens firmware or physical CPU.
- Replay and pinned-COTP matrices both feed the **already-protected** `Package dependency smoke (Ubuntu, Node 22)` check. No hardware-capable runner or production routing is configured. HIL-S7-001/002/003/004/005/007 PENDING_HARDWARE.


## Temporary stacked-branch CodeQL gate

- Because GitHub CodeQL Default Setup is enabled and refuses uploads from a second advanced workflow, this stacked PR's additional security job uses the official CodeQL JS/TS `security-extended` queries with `upload: never`. It runs on the actual PR checkout, emits an unmodified SARIF 2.1.0 result, and executes `scripts/ci/check-local-codeql-sarif.cjs`.
- The quality gate rejects absent SARIF/analysis metadata, fails on any security severity ≥7.0 (or `error` level without a score) and archives SARIF + a structured JSON summary. It is **additional evidence**, not a replacement for GitHub Default Setup after the stack is merged or retargeted; remove/reconcile the temporary workflow before enabling Default Setup checks on the final target branch.
- Local CodeQL implementation result on commit `7cd62fb615da3d71319fc0169d867865ee0feef8` had 1 SARIF file, 1 CodeQL run, **0 findings** and 0 high/critical; [run 42573154401](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42573154401). See `docs/EVIDENCE.md` for the prior rejected SARIF upload and remaining CI security limitations.


### Current fixture replay pin (2026-11-09)

After the separately authorized PR #12 squash merge, the PR #10 branch incorporates the locked npm-ci master baseline and has exact head `e5693ec9d4760632047f5c94f8a3556e6ce07e60` (13/13 CI checks passed on that source). PR #15, now targeting `master` as a draft, pins this SHA for ephemeral fixture checkout and retains the fixed `nodes7` fork commit `2cf864e38be447c2709348a25eb0524d67f5cf2d`. Its two OS S7Comm/protocol and Node-RED wire cases remain strict required aggregate prerequisites. Do not mistake the temporary CI checkout for a dependency merge or a published package.
