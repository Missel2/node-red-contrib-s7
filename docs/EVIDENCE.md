# Verification ledger

**Updated:** 2026-11-07. A green status check is evidence only for its named assertion and the exact commit tested.

| Item | Status | Evidence / limitations |
| --- | --- | --- |
| Upstream runtime | Preserved after merged PR #1 | No `red/s7.js` modification in PR #1 or draft PR #6. Original runtime still contains known connection lifecycle bugs |
| Project governance and credits | Merged in PR #1 | Public AI-assisted workflow, upstream credits, GitHub issue/PR tracking and active required checks on protected `master` |
| Baseline wrapper behavior | CI-verified in original PR #1 and draft PR #6 | Five positive isolated Node-RED wrapper tests, including repeated-trigger coalescing; nodes7 remains stubbed. [PR #6 run 42375597004](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42375597004) |
| Stale read after disconnect | **Confirmed bug reproduction** | [Initial expected-failure check, CI 42358368272](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42358368272): baseline test reported `actual: online` when `expected: offline`. This is not a fix. Issue #3 expands this into two further expected-failure tests (obsolete rejection and concurrent reads), with verification pending. |
| Prior experimental wrapper patches | Excluded from PR #1 | Earlier PR branch revisions passed mocked tests; they were removed to enforce one-defect-per-fix work |
| Pending nodes7 handshake cleanup | Source-inspection concern, unproven | [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) |
| Reconnect and stale-read scenarios | **5 named defects reproduced, not fixed** | [PR #6 CI 42375597004](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42375597004) individually confirms stale status, obsolete rejection, read overlap, obsolete data publication, timer retained on close. Mocked-only. [Issue #3](https://github.com/Missel2/node-red-contrib-s7/issues/3) |
| Actual S7 wire protocol CI | Not tested | [Issue #4](https://github.com/Missel2/node-red-contrib-s7/issues/4) |
| Reproducible package install | Not tested | Inherited lockfile v1 lists different package/dependency versions; smoke job temporarily installs without it. [Issue #5](https://github.com/Missel2/node-red-contrib-s7/issues/5) |
| Siemens CPU/firmware support | Not verified | No PLC or Siemens simulator tests on this branch. [HIL-S7 test matrix](HIL_TEST_MATRIX.md) and [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8) track **future pending** physical CPU tests only |
| Fork npm package | Not released | No publish workflow or release approval |

## Check semantics

- **Wrapper contract (four OS/Node combinations):** positive baseline behavior only, via mocks.
- **Baseline must fail stale-read regression:** expected failure of a named known-defect test on unmodified `red/s7.js`. Green means the fault reproduced, **not** that the behavior passed. After a future #3 fix, change this to a positive regression gate and coordinate required check names.
- **Package dependency smoke:** install and `npm pack --dry-run`, without a coherent lockfile. It is not a reproducible release test.

Record every later test's actual commit SHA, OS, command, workflow URL, fixture version and whether it was run; never state “green CI” without naming its coverage.


### Issue #3 characterization follow-up (2026-11-07; hosted CI verified on commit `1fbd93d`)

- Draft PR #6 expands the expected-failure harness to **five** individually named lifecycle defects: stale successful status, stale rejection, overlapping reads after reconnect, obsolete value publication, and active polling timer on close.
- Positive coalescing of repeated triggers during one unresolved read is added to the passing mocked baseline suite.
- **HIL pending:** HIL-S7-004, HIL-S7-005 and HIL-S7-007; no physical Siemens CPU tested. See [HIL_TEST_MATRIX.md](HIL_TEST_MATRIX.md). These findings are mocks, not protocol or hardware tests.
- Confirmed all five individually named assertions fail as expected (five TAP logs in the baseline-negative-control job) on [GitHub Actions run 42375597004](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42375597004), commit `1fbd93da39e7f52fc8b9581b417f7ada7a7c328b`. All six required checks passed. The tests are negative characterizations, **not successful behavior regressions or hardware verification**.


### Issue #4 first actual-wire PoC (2026-11-07, not yet independently verified)

- Branch `test/issue-4-s7-wire-roundtrip` proposes `python-snap7==3.3.1` (MIT-licensed, pinned), an ephemeral synthetic DB1 server on loopback port 1102 and an actual `@st-one-io/nodes7@1.1.2` COTP/S7Comm read/write/readback.
- Expected evidence: successful handshake, DB1 REAL/INT read and REAL scratch write/readback, plus fixture logs. The new `S7 wire roundtrip (Ubuntu, Node 22)` job must actually pass on the exact SHA. **Not a Siemens PLC, not real firmware, not Windows validation or TCP fault injection yet.**
- HIL-S7-001/-002/-003: `PENDING_HARDWARE`; synthetic writes are isolated to a disposable test process, not an authorized physical PLC.


### Issue #4 first verified S7 wire roundtrip

- [PR #10 first CI run 42406148441](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406148441), exact commit `88ac3011b7232e977ef924a2e497e1e036cd439a`: **S7 wire roundtrip (Ubuntu, Node 22) passed** a test with the real `@st-one-io/nodes7@1.1.2` against `python-snap7==3.3.1` loopback server: COTP/S7Comm connection, DB1 REAL/INT reads, synthetic REAL write/readback. No physical CPU. This is confirmed only for Linux at this commit.
- Follow-up branch aims to add Windows parity and partial COTP failure test. **These additions are not verified until the new head CI succeeds.**


### Issue #4 Windows parity and partial COTP injection — CI verified at `650de1e`

- [Run 42406338762](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406338762) completed all **8/8** jobs successfully, including **2 real S7Comm tests on each of Ubuntu 24.04 and Windows 2025** (Node 22).
- Both OS runs confirmed actual `nodes7` COTP/S7Comm roundtrip via `python-snap7==3.3.1` and explicit TCP abort after a genuine TPKT before COTP confirmation; both had `# pass 2`, `# fail 0`.
- Hardware not tested; this is a software fixture, not a Siemens compatibility claim. The follow-up commit adds stricter handshake timeout rejection and explicit clean disconnect assertions; **its own exact-head CI must still pass before claiming these enhancements verified**.


### Strict COTP watchdog correction (2026-11-07; re-run pending)

- [PR #10 CI 42406520582](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406520582) failed the *strict* handshake check on both Ubuntu and Windows: the client had **not rejected within 6 s** after an aborted COTP handshake. The previous green fault test had incorrectly accepted the test's own timeout as a rejection; no S7 runtime regression was proven by this result.
- Source inspection of `@st-one-io/nodes7@1.1.2` shows an explicit **10,000 ms** timeout in `S7Endpoint._connect()` for transport creation. The adjusted test permits up to **14 s** for the client's own failure and still **rejects a timeout raised by the test itself**. CI on the adjusted commit is required before attributing any pass. Issue #2 remains open for cleanup/resource testing, not marked repaired.


### Issue #4 strict-head Linux/Windows verification (2026-11-07)

- [Run 42406722052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42406722052) completed **8/8** checks on candidate commit `1aff19956113b9736bbf20b6c15663603bac9c54`. Both real-wire jobs ran **two tests**, `# pass 2`, `# fail 0`.
- Healthy classic-S7 transport: actual `nodes7` connects over COTP/S7Comm, reads REAL and INT from synthetic DB1, writes REAL to scratch DB and reads it back, and **endpoint.disconnect resolves**.
- Partial-handshake fault: genuine RFC1006 TPKT accepted then TCP dropped before COTP confirmation. The **client itself rejects the connection** (not our test timeout) after **10.01 s on Ubuntu and 10.03 s on Windows**, matching its hard-coded 10-second transport-setup watchdog. No false `connect`. This confirms a bounded fallback, **not prompt teardown** and not leak freedom.
- Do not claim fault handling earlier than ~10 seconds or all transport resources are reclaimed. See Issue #2; no Siemens firmware, no physical CPU, no production writes. HIL-S7-001/-002/-003/-005 pending.
