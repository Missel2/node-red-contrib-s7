# Disposable classic S7Comm protocol fixture (Issue #4)

**Status: Linux/Windows real-wire roundtrip and strict partial-COTP abort both passed at `1aff199` (CI 42406722052); firmware and network-fault completeness remain unverified.** No Siemens hardware or licensed PLCSIM used.

## Implementation

- Fixture package: [python-snap7 3.3.1](https://pypi.org/project/python-snap7/3.3.1/) (MIT); server code at `test/protocol/fixture_server.py`.
- Client: existing `@st-one-io/nodes7@1.1.2` (GPL-3.0-or-later), loaded as a **real dependency**, not a substituted mock.
- Bind: only loopback `127.0.0.1:1102`. Synthetic DB1 is 64 bytes, with REAL 12.5 at 0, INT -123 at 4, REAL 3.25 at 8.
- Harness: `test/protocol/s7-wire-roundtrip.test.js` starts and stops the fixture per test, waits for a readiness signal, connects using COTP and S7Comm, verifies typed reads and a scratch write/readback, then saves bounded synthetic logs to `test-reports/`.
- CI: hosted Ubuntu and Windows Node 22 / Python 3.12, exact package version `python-snap7==3.3.1`. Run locally in an environment with Python/Node available via `python -m pip install python-snap7==3.3.1`, `npm install --no-package-lock --ignore-scripts --no-audit`, `node --test test/protocol/s7-wire-roundtrip.test.js`.
- The inherited lockfile is stale; dependency installation is **not** yet reproducible via `npm ci` (Issue #5).

## Evidence and limitations

Passing tests would demonstrate a real ISO-on-TCP/S7Comm interchange with a compatible *software server* only. It cannot establish real Siemens S7 firmware behavior, multi-session reconnect safety or PLC-specific PUT/GET defaults. HIL-S7-001/-002/-003 remain pending under Issue #8.

**Already verified:** two software-server restart cycles on both Ubuntu and Windows at CI 42412099544. **Still missing:** TCP blackhole/half-open, OS-level socket resource metrics and release gates. A controlled partial COTP handshake abort and Windows runner parity are now present; these do not cover all requested fault cases. Do not mark Issue #4 complete until these are confirmed.

All test writes target a synthetic in-process data block; no external PLC addresses, credentials, real industrial network routes or productive outputs are used.


## First CI proof and next fault scenario

- [PR #10 run 42406148441](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406148441) proved the Linux real-wire roundtrip at commit `88ac3011`.
- Next candidate includes `s7-wire-faults.test.js`: opens a real loopback TCP listener, accepts a genuine RFC1006 TPKT, then intentionally aborts before sending COTP confirmation. Asserts no false connection; this is an actual wire fault, not a fake Node-RED transport. If a connection promise never settles, the test fails with a bounded timeout and records that limitation.
- Windows CI is a platform compatibility check against the **same software server**, not PLCSIM or Siemens firmware. HIL-S7-001/002/003/005 remain pending.


## Confirmed two-platform protocol/fault evidence

[Run 42406338762](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406338762) passed **8/8 jobs**, including both dedicated S7 wire jobs. On **Ubuntu 24.04** and **Windows 2025**, Node 22 ran two real-network assertions: 1) connection, typed DB reads and scratch write/readback through `python-snap7==3.3.1`; 2) injected partial COTP handshake abort without false positive connection. This verifies **software wire interoperability only**. Updated follow-up tests now distinguish an explicit connection rejection from a hung connection and require a clean successful disconnect; recheck newer head before considering these extra guards verified.


### Diagnosed stricter fault test

[Run 42406520582](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406520582) exposed a false-positive design in the earlier aborted-handshake test: its own 6-second timeout was being counted as a successful client rejection. The real `nodes7@1.1.2` transport connection includes a 10-second setup watchdog, so a 6-second limit was not equivalent to a hung connection. We now require a rejection raised by the **actual client**, with a 14-second upper bound; the test-runner's own timeout explicitly fails. Future sessions should examine any 10-second latency and resource leakage under Issue #2 without extrapolating from one software-fault scenario.


### Exact-head verification and latency finding

[PR #10 CI 42406722052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406722052) verified both new strict assertions on commit `1aff199`: **8/8 jobs green**, the genuine S7Comm read/write/readback and clean endpoint.disconnect, plus a real aborted COTP connection that fails by the **dependency's own 10s watchdog**, not the harness deadline. The aborted handshake takes **~10.01s (Ubuntu)** / **~10.03s (Windows)**. This timing should be evaluated under [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2), especially the unresolved `iso-on-tcp` stream-close promise and possible pending-handle cleanup, before reliability claims.


## Verified repeated failures and real auto-reconnect (Issue #4, 2026-11-07)

The exact candidate commit `c1b5bdb8cd1c8f59fea60d903f571364d82111cb` passed [GitHub Actions run 42411812676](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42411812676) with **8/8 jobs**. Both Ubuntu 24.04 and Windows 2025 ran **three real-wire tests** (`# pass 3`, `# fail 0`):

1. Genuine S7Comm handshake, synthetic DB1 typed read/write/readback and clean `nodes7` disconnect on port 1102.
2. Aborted RFC1006/COTP handshake produces an explicit `nodes7` failure after ~10 seconds, **not** merely the harness deadline.
3. A single real `nodes7` endpoint remains alive across **two consecutive restarts** of the pure-Python S7 server on separate loopback port 1103. Each cycle writes a synthetic scratch value, verifies it, observes TCP/S7 disconnect, waits 1.6 seconds for at least one **actual failed retry during downtime**, restarts the server, observes automatic reconnect, and reads the reset DB1 content instead of stale scratch data. Test evidence contains bounded error/event counters, not client socket-handle measurements.

The fixture port can be selected using `S7_FIXTURE_PORT` (default 1102), limited to nonprivileged ports and bound only to 127.0.0.1. This supports simultaneous protocol test files without TCP listener collisions.

**Unverified:** total client-side active sockets/handles, transport teardown speed, TCP blackhole/half-open behavior, multiple concurrent endpoints, Siemens firmware characteristics, and physical-CPU HIL-S7-001/-002/-003/-005. There is no claim that the tests prove leak freedom. The fixture still does not model an actual PLC program.


## Integration with merged PR #9

PR #10 incorporates `master` at `c931dbac4232d3f4481812a65597301548f30739`, retaining all ten old-red/new-green lifecycle cases and the protected CI gate. Only protocol test files, a separate workflow matrix and documentation are introduced; the runtime remains identical to `master`. Exact-head CI after this reconciliation is required before any further merge decision.


## Three repeated COTP blackhole scenarios — candidate, pending CI

`test/protocol/s7-wire-blackhole.test.js` creates a real ephemeral **127.0.0.1** TCP listener for each of three successive client attempts. It accepts an RFC1006/COTP request and **never replies**, keeping the TCP session open during the dependency's own connection watchdog. A `nodes7` `S7Endpoint.connect()` must reject each attempt within 14.5 seconds **without a false connected event** and without counting a *harness timeout* as a success.

The test records: accepted TCP sockets, actual RFC1006 header, elapsed watchdog time, client rejection, whether the peer socket is still open at the moment of failure, and an **experimental process active-handle count** for sockets matching the peer port (Node's `_getActiveHandles()` is internal and may omit sockets). It then forcibly closes the synthetic peer and listener to avoid orphaning CI processes. **Peer sockets remaining open after client rejection are recorded as a possible transport cleanup defect, never mislabeled as a passing teardown assertion.**

This candidate **must pass Ubuntu/Windows exact-head CI** before claiming its bounded failure test verified. A positive blackhole watchdog test is not proof of leak-free TCP resources or vendor firmware compatibility. Any recorded open handles warrant a focused Issue #2 reproduction with stronger instrumentation before a library patch. HIL-S7-001/-005 still PENDING_HARDWARE.


### Exact-run blackhole baseline, and follow-up

On [PR #10 run 42414980669](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414980669), commit `66997fd98087afe7774fc4ed70018cd018d9a9ea`, **all eight CI jobs passed** (both real-wire OS jobs included). [CodeQL 42414976685](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414976685) also passed both analysis jobs.

Actual archived `s7-blackhole-evidence.json` on **both** Ubuntu and Windows shows three full TCP connections accepted with valid RFC1006 TPKT; real nodes7 `ERR_TIMEOUT` at about 10 seconds, zero false connected events, and **one peer socket and one visible client Socket still open immediately after that error in each of six observations**. The fixture explicitly destroyed those sockets afterward to avoid polluting the runner. This is a concrete **socket still open at timeout** observation, not proof of permanent leak or resource accumulation.

A follow-up adds a second measurement after explicit `endpoint.disconnect()` plus a short async-close allowance, and separates the eventual forced fixture cleanup from the library's own cleanup. **New exact-head CI and artifacts are required** before conclusions about explicit disconnect.
