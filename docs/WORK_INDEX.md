# Work index — S7 reliability fork

**Updated:** 2026-11-07. GitHub Issues are enabled. This file is a navigation index; do not duplicate tracked work.

| ID | Priority | Work | State / next |
| --- | --- | --- | --- |
| WI-001 | Completed | [PR #1: AI-assisted process, upstream credits and first CI](https://github.com/Missel2/node-red-contrib-s7/pull/1) | Squash-merged on `master` as `42296d8`; no S7 runtime changes |
| WI-002 | P0 integration pending | [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) | Fixed library fork at `2cf864e38be447c2709348a25eb0524d67f5cf2d` independently merged; [draft PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) installs it with SHA512 pin, checks native protocol CI plus Node-RED real COTP close, but **not merged into wrapper master**. |
| WI-003 | Fixed on master; HIL pending | [Issue #3 / PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) | Squash-merged `c931dba`; ten original-red/current-green mocked lifecycle controls passed [master CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) (6/6). HIL-S7-004/-005/-007 pending. |
| WI-004 | Completed / HIL pending | [Issue #4 / PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) | **Squash-merged with explicit human approval** as `8e460f1136319567ac6d0646d467c74af9c70e16`, 13/13 exact-head checks including CodeQL; five synthetic loopback S7Comm, reconnect, RST and blackhole cases now native in `master`. HIL pending. |
| WI-005 | P1 | [Issue #5: reproducible npm lockfile](https://github.com/Missel2/node-red-contrib-s7/issues/5) | **MERGED**: PR #12 approved, squash `7bee547d164fd94d3ecec1eee472fb860ba4a31c`; registry v3 lockfile with `npm ci` Ubuntu/Windows. Fixed-fork integration remains draft PR #15. |
| WI-006 | P2 | Data freshness, diagnostics and uncertain writes | Requirements only; do not implement before reliability baseline |
| WI-007 | P1 future | [Issue #8: isolated S7-1200 HIL + test-debt tracking](https://github.com/Missel2/node-red-contrib-s7/issues/8) | Hardware absent; `HIL-S7-*` test matrix is pending and required in all new PR descriptions |

| WI-008 | P1 draft | [Issue #16 / PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17) | Post-merge PR #15 review: test harness Promise.race leaves orphan handshake polling on timeout. Deadline-owned helper and no-poll-after-timeout regression staged, **not merged**. HIL not applicable to harness scheduling. |

## Continuation rules

Review open PRs, CI and issues before starting new work. Test one defect before patching it. Preserve the historic required check name `Baseline must fail stale-read regression`; it now validates ten original-baseline-red **and** current-runtime-green lifecycle controls after merged PR #9. Confirm the actual job semantics for each exact commit. Passing mock checks do not establish real S7 compatibility.

Never automatically merge, publish packages or access a production PLC.
