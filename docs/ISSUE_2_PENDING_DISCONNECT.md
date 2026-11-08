# Issue #2: Disconnect during pending COTP handshake

**Scope:** Expected-failing characterization only. This branch contains no runtime fix.

The actual `@st-one-io/nodes7@1.1.2` S7Endpoint connects to a disposable
Node.js TCP server bound only to `127.0.0.1` and an ephemeral port. The
server receives a genuine RFC1006/COTP connection request and intentionally
withholds the connection confirmation. The test calls public
`endpoint.disconnect()` **during the unfinished handshake**, rather than
waiting for the built-in 10-second timeout.

The future corrected behavior is: disconnect settles within 600 ms, the
underlying client TCP socket closes, the peer observes TCP close, and the
endpoint never emits a stale `connect` event. The fixture captures all
observations *before* forcibly closing test sockets during cleanup.

On the unmodified dependency the expected-red gate should fail specifically
because public disconnect does not settle in the bounded window. A passing
CI gate thus proves a **reproduced bug**, not successful teardown.
The independent test controls run on GitHub-hosted Ubuntu and Windows,
while the existing real S7Comm roundtrip, restart and watchdog tests from
PR #10 are retained. Always verify the exact commit's CI before claiming
cross-platform results.

## Correction required later

- Preserve this original dependency assertion as a red negative control.
- Make the identical assertion pass using a separately reviewed candidate
  dependency change; do not monkey-patch production at install time.
- Verify cleanup on 10-second timeout, explicit early disconnect, late
  handshake completion, peer reset and repeated attempts without forcing
  server-side cleanup before measurement.
- Retain synthetic DB read/write and restart CI from PR #10, as well as
  Node-RED wrapper's ten baseline-red/candidate-green lifecycle regressions.
- Choose the dependency fork and published package strategy explicitly;
  do not silently replace the protocol stack or touch a real PLC.

**HIL:** HIL-S7-001 and HIL-S7-005 remain `PENDING_HARDWARE`.
No Siemens firmware, physical hardware, production traffic, npm publication
or cluster sync is part of this work.

**Integration:** Draft stacked on PR #10 branch because its wire-protocol
fixtures are not yet merged; do not merge this ahead of PR #10.
