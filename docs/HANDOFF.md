# Development handoff — node-red-contrib-s7

**Updated:** 2026-11-07. Recheck GitHub heads, reviews and CI when resuming; links here are historical evidence, not live status.

## Verified current branch baseline

- Repository: `Missel2/node-red-contrib-s7`; protected `master` baseline `e79c15107731e0387d1b3679f2409aef043e87f5`. Merged PR #6 added test-only characterization; **no runtime fix on master**.
- [PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9): open runtime fix for Issue #3 at last inspected SHA `7eed4d3`. [CI 42378784504](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378784504) passed 6/6 on that SHA. Requires explicit human merge permission; do not merge as part of protocol testing. The locked legacy required-check name is retained while testing original-red/candidate-green.
- [PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10): draft for Issue #4, branched independently from `master`. Adds a disposable true S7Comm fixture, **without modifying the runtime** `red/s7.js`. [CI 42411812676](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42411812676) passed 8/8 on `c1b5bdb`; Ubuntu/Windows each passed three real-wire test cases. If later commits exist, verify their exact-head checks before claiming green.
- Dependency `@st-one-io/nodes7@1.1.2`; synthetic server `python-snap7==3.3.1` (MIT). The inherited lockfile still prevents `npm ci` (Issue #5).

## New real-wire coverage in draft PR #10

- Port 1102: real COTP/S7Comm read REAL/INT, scratch DB write/readback, clean disconnect; partial handshake aborted before COTP completion, client rejects by its own ~10-second transport watchdog, not the test deadline.
- Port 1103: same real nodes7 endpoint across **two** full software-server process restarts. Both cycles verify disconnect, a refused connection attempt during 1.6 seconds of downtime, automatic reconnect and fresh reset DB1 data. Python fixture accepts `S7_FIXTURE_PORT` and binds to 127.0.0.1 only. These are not Siemens firmware tests.
- **Not proven:** OS socket/handle leak freedom, blackhole/half-open recovery, general operational suitability or CPU/firmware compatibility.

## Next focused work

1. Check PR #10's current head CI and any regression; do not merge automatically.
2. Extend Issue #4 with controlled TCP blackhole/reset and instrumented repeated-fault socket/handle metrics; do not conflate transport-level failures with a proven runtime fix.
3. Investigate Issue #2: aborted COTP handshake takes approximately 10 seconds; trace outstanding underlying transport handles and create a baseline-failing regression before patching `iso-on-tcp` or nodes7.
4. Restore reproducible `npm ci` and a coherent lockfile in Issue #5, separate from runtime/protocol scope.
5. Once authorized HIL bench exists, run HIL-S7-001/-002/-003/-005 and relevant #3 cases -005/-007 against named S7-1200 firmware and isolated scratch DB. They are **PENDING_HARDWARE**.

## Safety/approval

No auto-merge of #9/#10, no npm publication, no productive OT deployment, no test runner with a public-PR-triggered path to a physical PLC. Only synthetic loopback server receives test writes. Human approval is required for material merges and all real-PLC writes.
