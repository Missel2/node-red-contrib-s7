# Work index — S7 reliability fork

**Updated:** 2026-11-09. GitHub Issues are enabled. This file is a navigation index; do not duplicate tracked work.

| ID | Priority | Work | State / next |
| --- | --- | --- | --- |
| WI-001 | Completed | [PR #1: AI-assisted process, upstream credits and first CI](https://github.com/Missel2/node-red-contrib-s7/pull/1) | Squash-merged on `master` as `42296d8`; no S7 runtime changes |
| WI-002 | Completed, hardware pending | [Issue #2 / PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) | **Software defect fixed** in upstream fork SHA `2cf864e38be447c2709348a25eb0524d67f5cf2d` and human-approved/squash-merged wrapper PR #15 → `e4f9f6d154c059986517bcfa35ef34d81bcd6c92`; 16/16 pre-merge and 15/15 post-merge GitHub checks green. Issue #2 closed. Physical HIL remains pending. |
| WI-003 | Fixed on master; HIL pending | [Issue #3 / PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) | Squash-merged `c931dba`; ten original-red/current-green mocked lifecycle controls passed [master CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) (6/6). HIL-S7-004/-005/-007 pending. |
| WI-004 | Completed / HIL pending | [Issue #4 / PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) | **Squash-merged with explicit human approval** as `8e460f1136319567ac6d0646d467c74af9c70e16`, 13/13 exact-head checks including CodeQL; five synthetic loopback S7Comm, reconnect, RST and blackhole cases now native in `master`. HIL pending. |
| WI-005 | Completed | [Issue #5 / PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) | Reproducible npm v3 lockfile merged as `7bee547d`; corrected nodes7 fork archive/SHA-512 SRI merged separately via PR #15. |
| WI-006 | P2 | Data freshness, diagnostics and uncertain writes | Requirements only; do not implement before reliability baseline |
| WI-008 | Completed (quality CI); Issue #7 ongoing | [Issue #7 / merged PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) | Human-approved squash merge `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa` after 19/19 successful PR-head checks. Protected `master` post-merge **18/18 successful checks**, including CodeQL, Ubuntu/Windows static quality, lockfile and protocol integration. ESLint/Prettier negative controls, package dry-run and advisory TypeScript checks active. No real hardware validation. |
| WI-007 | P1 future | [Issue #8: isolated S7-1200 HIL + test-debt tracking](https://github.com/Missel2/node-red-contrib-s7/issues/8) | Hardware absent; `HIL-S7-*` test matrix is pending and required in all new PR descriptions |

| WI-009 | Completed (software CI) | [Issue #16 / PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17) | Explicitly approved squash-merge `cedbd85a38b26437160788f9dc17c352b645de03`; integration harness handshake polling deadline owns timers and four regression cases pass on Ubuntu/Windows Node 22/24. Issue #16 closed. HIL not applicable to test harness. |

## Continuation rules

Review open PRs, CI and issues before starting new work. Test one defect before patching it. Preserve the historic required check name `Baseline must fail stale-read regression`; it now validates ten original-baseline-red **and** current-runtime-green lifecycle controls after merged PR #9. Confirm the actual job semantics for each exact commit. Passing mock checks do not establish real S7 compatibility.

Never automatically merge, publish packages or access a production PLC.
