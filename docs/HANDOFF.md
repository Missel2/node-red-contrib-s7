# Development handoff — node-red-contrib-s7

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
