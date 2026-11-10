# Work index

**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


Shared execution order and release checklist: [ecosystem roadmap issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21).
[Repository review](PROJECT_REVIEW.md) explains findings, evidence and review limits.

| Work | State | Next evidence |
| --- | --- | --- |
| WI-001..005: bootstrap, stale reads, transport integration, wire tests, lock | Merged #1/#9/#15/#10/#12 | Preserve regressions and exact dependency pin |
| WI-008: quality program | [Issue #7](https://github.com/Missel2/node-red-contrib-s7/issues/7); static checks merged #14 | Security PR #11 open; advisory types remain debt |
| WI-009: polling test-harness deadline | Merged #17; #16 closed | Keep four deadline regressions |
| WI-010: installed Node-RED 5.0.9 runtime | Squash-merged PR #24, protected `master` `2735621f` | 8/8 strict locked/consumer software-loopback tests passed on hosted Ubuntu/Windows Node 22/24; Siemens HIL and broader release compatibility pending |
| WI-011: bounded writes and outcomes | [Issue #19](https://github.com/Missel2/node-red-contrib-s7/issues/19) | Lost acknowledgement: one synthetic write, no replay, bounded completion |
| WI-006: freshness and diagnostics | [Issue #20](https://github.com/Missel2/node-red-contrib-s7/issues/20) | Opt-in schema, unchanged default payload/topic, no false freshness |
| WI-007: physical S7-1200 | [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8) | PENDING_HARDWARE |
| WI-013: dependency security maintenance | [PR #11](https://github.com/Missel2/node-red-contrib-s7/pull/11) | Reconcile four review-only Dependabot scopes and policy/CI negative controls; test-only Node-RED transitive `minimatch`, `multer`, `undici` update failure remains open; settings unverified; no merge authorization |
| WI-012: community release qualification | [Shared issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21) | Identity, compatibility, package evidence and explicit release decision |

## Continuation

Check live branches, PRs, review threads and exact-commit CI before changing status.
A merged library change does not update the wrapper's immutable dependency pin.
Keep at most three implementation workstreams active. Never replace pending or
expired evidence with assumed success. No automatic merge, release or hardware access.
