# Disposable classic S7Comm protocol fixture (Issue #4)

**Status: real-wire roundtrip and partial-COTP abort passed on hosted Ubuntu/Windows at `650de1e` (CI 42406338762); later strict teardown assertions pending.** No Siemens hardware or licensed PLCSIM used.

## Implementation

- Fixture package: [python-snap7 3.3.1](https://pypi.org/project/python-snap7/3.3.1/) (MIT); server code at `test/protocol/fixture_server.py`.
- Client: existing `@st-one-io/nodes7@1.1.2` (GPL-3.0-or-later), loaded as a **real dependency**, not a substituted mock.
- Bind: only loopback `127.0.0.1:1102`. Synthetic DB1 is 64 bytes, with REAL 12.5 at 0, INT -123 at 4, REAL 3.25 at 8.
- Harness: `test/protocol/s7-wire-roundtrip.test.js` starts and stops the fixture per test, waits for a readiness signal, connects using COTP and S7Comm, verifies typed reads and a scratch write/readback, then saves bounded synthetic logs to `test-reports/`.
- CI: hosted Ubuntu and Windows Node 22 / Python 3.12, exact package version `python-snap7==3.3.1`. Run locally in an environment with Python/Node available via `python -m pip install python-snap7==3.3.1`, `npm install --no-package-lock --ignore-scripts --no-audit`, `node --test test/protocol/s7-wire-roundtrip.test.js`.
- The inherited lockfile is stale; dependency installation is **not** yet reproducible via `npm ci` (Issue #5).

## Evidence and limitations

Passing tests would demonstrate a real ISO-on-TCP/S7Comm interchange with a compatible *software server* only. It cannot establish real Siemens S7 firmware behavior, multi-session reconnect safety or PLC-specific PUT/GET defaults. HIL-S7-001/-002/-003 remain pending under Issue #8.

**Still not implemented**: server restart/reconnect, blackhole/timeout fault proxy, repeated-failure/socket metrics and secure release gating. A controlled partial COTP handshake abort and Windows runner parity are now present; these do not cover all requested fault cases. Do not mark Issue #4 complete until these are confirmed.

All test writes target a synthetic in-process data block; no external PLC addresses, credentials, real industrial network routes or productive outputs are used.


## First CI proof and next fault scenario

- [PR #10 run 42406148441](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406148441) proved the Linux real-wire roundtrip at commit `88ac3011`.
- Next candidate includes `s7-wire-faults.test.js`: opens a real loopback TCP listener, accepts a genuine RFC1006 TPKT, then intentionally aborts before sending COTP confirmation. Asserts no false connection; this is an actual wire fault, not a fake Node-RED transport. If a connection promise never settles, the test fails with a bounded timeout and records that limitation.
- Windows CI is a platform compatibility check against the **same software server**, not PLCSIM or Siemens firmware. HIL-S7-001/002/003/005 remain pending.


## Confirmed two-platform protocol/fault evidence

[Run 42406338762](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406338762) passed **8/8 jobs**, including both dedicated S7 wire jobs. On **Ubuntu 24.04** and **Windows 2025**, Node 22 ran two real-network assertions: 1) connection, typed DB reads and scratch write/readback through `python-snap7==3.3.1`; 2) injected partial COTP handshake abort without false positive connection. This verifies **software wire interoperability only**. Updated follow-up tests now distinguish an explicit connection rejection from a hung connection and require a clean successful disconnect; recheck newer head before considering these extra guards verified.
