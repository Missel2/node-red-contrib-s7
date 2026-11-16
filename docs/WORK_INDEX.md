**2026-11-16 current source-only Contrib alpha.2 candidate:** [Draft PR #54](https://github.com/Missel2/node-red-contrib-s7/pull/54), protected master baseline `8ca11b75a5e3bf46202dbb1ea42b9fda23fbd369` after approved #53 merge with **32/32 post-merge checks, 9/9 required**. Candidate changes Contrib root package/lock version from **already-published immutable alpha.1** to distinct `0.1.0-alpha.2`; the independently published, SHA-512-verified `nodes7@0.1.0-alpha.2` alias remains exact. Test-first [initial negative release preflight #43817618927](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43817618927) reproduced old-version failure. Read-only CI checks Ubuntu/Windows source SHA, exact npm `pack` bytes and SBOM, npm collision absence, public consumers and installed unmodified Node-RED 5.0.9; final exact-head checks not yet frozen. NO merge, npm publish, stage, deploy, host patch or physical PLC/HIL writes. The next human decision is **source-only squash merge** after all required checks. See [candidate gates](ALPHA2_RELEASE_CANDIDATE.md). All HIL-S7-001..007 remain PENDING_HARDWARE.

**2026-11-15 source-only npm dependency qualification ([Draft PR #53](https://github.com/Missel2/node-red-contrib-s7/pull/53)):** independent public `@missel2/nodes7@0.1.0-alpha.2` registry+tarball GET passed on Ubuntu/Windows ([run #43753322544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43753322544)): exact canonical SHA-256 `11327c208ad99dae5eca2fd4a6fd9a83e17637b8eb4ad1f2018c6ba98bd6c81e`, SHA-512 SRI verified from public bytes; `alpha=alpha.2`, `latest=0.0.0-stage`. Proposed source-only Contrib npm alias/lock repin to alpha.2 with unchanged Contrib package version `0.1.0-alpha.1` (already published wrapper alpha.1 is immutable and still contains nodes7 alpha.1). Fresh exact-head Linux/Windows, full installed Node-RED 5.0.9, CodeQL, lockfile and 9/9 protected required gates must all pass before **separate maintainer squash-merge approval**; no merge, npm publication, Node-RED host changes or hardware access. See [qualification evidence](NODES7_ALPHA2_DEPENDENCY_QUALIFICATION.md). HIL-S7-001..007 remain PENDING_HARDWARE.

**2026-11-11 active candidate:** [PR #41](https://github.com/Missel2/node-red-contrib-s7/pull/41) is a **draft / not merged** opt-in one-pending-write-per-endpoint implementation for open [Issue #19](https://github.com/Missel2/node-red-contrib-s7/issues/19). Source baseline `bc7efd2d38a123f68a2c3654b6c40286b681e7a9` remains protected master; same-test baseline-red/candidate-green, installed Node-RED, CodeQL, Windows/Linux and active nine required checks must qualify the final PR head. The defaults and nodes7 pin remain unchanged. Diagnostics and global nodes7 queue capacity are not part of PR #41. [Operator contract](WRITE_ADMISSION_OPT_IN.md). HIL-S7-003/006/007 PENDING_HARDWARE.

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
| WI-011: bounded writes and outcomes | [Issue #19](https://github.com/Missel2/node-red-contrib-s7/issues/19); [proposed contract](WRITE_OUTCOMES_AND_ADMISSION.md) | PR #23 merged: pre-send error Catch; new baseline tests characterize **unbounded pending writes** and late callback; next: opt-in endpoint admission, explicit unknown outcomes, then separate nodes7 queue cap; HIL pending |
| WI-006: freshness and diagnostics | [Issue #20](https://github.com/Missel2/node-red-contrib-s7/issues/20) | Opt-in schema, unchanged default payload/topic, no false freshness |
| WI-007: physical S7-1200 | [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8) | PENDING_HARDWARE |
| WI-013: upstream Node-RED security boundary | Merged PR #11; [closed-unmerged PR #38](https://github.com/Missel2/node-red-contrib-s7/pull/38); [historical issue #27](https://github.com/Missel2/node-red-contrib-s7/issues/27) | Four review-only Dependabot scopes exist; host advisories disclosed and referred upstream, **no downstream Node-RED overrides**, preserve unmodified host CI; validate our own S7/nodes7 dependencies separately |
| WI-012: community release qualification | [Shared issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21) | Identity, compatibility, package evidence and explicit release decision |

## Continuation

Check live branches, PRs, review threads and exact-commit CI before changing status.
A merged library change does not update the wrapper's immutable dependency pin.
Keep at most three implementation workstreams active. Never replace pending or
expired evidence with assumed success. No automatic merge, release or hardware access.
