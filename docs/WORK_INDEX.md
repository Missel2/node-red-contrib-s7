# Work index — S7 reliability fork

**Updated:** 2026-11-07. GitHub Issues are enabled. This file is a navigation index; do not duplicate tracked work.

| ID | Priority | Work | State / next |
| --- | --- | --- | --- |
| WI-001 | Completed | [PR #1: AI-assisted process, upstream credits and first CI](https://github.com/Missel2/node-red-contrib-s7/pull/1) | Squash-merged on `master` as `42296d8`; no S7 runtime changes |
| WI-002 | P0 | [Issue #2: pending transport teardown](https://github.com/Missel2/node-red-contrib-s7/issues/2) | Concrete real TCP reproducer: socket remains open even 200ms after successful public disconnect on all 6 Linux/Windows blackhole trials ([CI 42415198163](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415198163)); targeted dependency-level red-before/green-after fix still needed |
| WI-003 | Fixed on master; HIL pending | [Issue #3 / PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) | Squash-merged `c931dba`; ten original-red/current-green mocked lifecycle controls passed [master CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) (6/6). HIL-S7-004/-005/-007 pending. |
| WI-004 | P1 | [Issue #4 / draft PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) | Real software S7Comm on Linux/Windows: DB1 read/write, aborted handshake, two server restarts with ECONNREFUSED retries passed [CI 42412099544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412099544) (8/8); integration SHA still needs new CI; three COTP blackhole iterations + peer-socket diagnostics successfully measured on both systems (historic stock dependency); OS-level leak metrics and HIL remain pending. |
| WI-005 | P1 | [Issue #5: reproducible npm lockfile](https://github.com/Missel2/node-red-contrib-s7/issues/5) | **MERGED**: PR #12 approved, squash `7bee547d164fd94d3ecec1eee472fb860ba4a31c`; registry v3 lockfile with `npm ci` Ubuntu/Windows. Fixed-fork integration remains draft PR #15. |
| WI-006 | P2 | Data freshness, diagnostics and uncertain writes | Requirements only; do not implement before reliability baseline |
| WI-007 | P1 future | [Issue #8: isolated S7-1200 HIL + test-debt tracking](https://github.com/Missel2/node-red-contrib-s7/issues/8) | Hardware absent; `HIL-S7-*` test matrix is pending and required in all new PR descriptions |

## Continuation rules

Review open PRs, CI and issues before starting new work. Test one defect before patching it. Preserve the historic required check name `Baseline must fail stale-read regression`; it now validates ten original-baseline-red **and** current-runtime-green lifecycle controls after merged PR #9. Confirm the actual job semantics for each exact commit. Passing mock checks do not establish real S7 compatibility.

Never automatically merge, publish packages or access a production PLC.
