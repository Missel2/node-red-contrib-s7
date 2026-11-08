# Verification ledger

**Updated:** 2026-11-08. A green status check applies only to its exact SHA and assertion; see current section before historical entries.

## Current P1 quality CI candidate (2026-11-08)

- [PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) is **not merged**; its base is the open [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) rather than `master`.
- Candidate `a8d381e5b506b34e99bb55f2f8b897237369b848`: [Verification 42483462367](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42483462367) **successful**; Ubuntu and Windows Node 22 ESLint, changed-file Prettier, both deliberate red/green controls, the existing four wrapper jobs, negative baseline and protected package-smoke dependency all passed.
- [NPM lockfile workflow 42483462378](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42483462378) **successful** under both Ubuntu and Windows. The separate quality tools lockfile was generated in [temporary bootstrap 42482743401](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42482743401), inspected and checked in; the bootstrap workflow is removed.
- JavaScript type diagnostics are **not passing strict typecheck**: the legacy `red/s7.js` Node-RED instance/transport mixin properties produce multiple TS2339 errors. The advisory job writes an artifact but deliberately does not fail the protected gate. No type-safety certification is claimed.
- CodeQL was **not reverified** on this stacked PR head because its base is not `master`. A new CodeQL run and protected checks are required after PR #12 is merged and PR #14 is retargeted.
- This section records the named earlier CI head; verify again after any documentation-only commit before requesting merge approval. HIL: **not applicable to static tooling**; all future HIL-S7-001 through HIL-S7-007 remain PENDING_HARDWARE.

### Historical ledger below

The existing rows below contain older dated milestones and some historical PR states. Use the live GitHub PR and CI state, plus the current section above, for continuation decisions.

| Item | Status | Evidence / limitations |
| --- | --- | --- |
| Upstream runtime | Preserved in merged PRs #1 and #6 | Current `master` retains the original wrapper; PR #9 proposes an explicit, separate code change, not merged |
| Project governance and credits | Merged in PR #1 | Public AI-assisted workflow, upstream credits, GitHub issue/PR tracking and active required checks on protected `master` |
| Baseline wrapper behavior | CI-verified in PRs #1/#6 and proposed PR #9 | Five baseline Node-RED mock tests, including repeated-trigger coalescing, passed against PR #9 candidate. No real S7 transport. [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520) |
| Stale read after disconnect | Baseline defect reproduced; PR #9 patch proposed | Five confirmed negative cases from PR #6 plus five new controls: ten cases are red on pinned master `e79c151` and green on candidate `64d3d33`. [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520). Mock-only, not vendor verified |
| Prior experimental wrapper patches | Excluded from PR #1 | Earlier PR branch revisions passed mocked tests; they were removed to enforce one-defect-per-fix work |
| Pending nodes7 handshake cleanup | Source-inspection concern, unproven | [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) |
| Reconnect and stale-read scenarios | Candidate corrected in PR #9, NOT merged | [PR #9 CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520): ten desired-behavior assertions individually red on immutable original, green on candidate, on mock fixtures. Transport and hardware limitations remain; see [Issue #3](https://github.com/Missel2/node-red-contrib-s7/issues/3) |
| Actual S7 wire protocol CI | Not tested | [Issue #4](https://github.com/Missel2/node-red-contrib-s7/issues/4) |
| Reproducible package install | Not tested | Inherited lockfile v1 lists different package/dependency versions; smoke job temporarily installs without it. [Issue #5](https://github.com/Missel2/node-red-contrib-s7/issues/5) |
| Siemens CPU/firmware support | Not verified | No PLC or Siemens simulator tests on this branch. [HIL-S7 test matrix](HIL_TEST_MATRIX.md) and [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8) track **future pending** physical CPU tests only |
| Fork npm package | Not released | No publish workflow or release approval |

## Check semantics

- **Wrapper contract (four OS/Node combinations):** baseline AND positive lifecycle regression assertions on the **candidate** wrapper, via mocks.
- **Baseline must fail stale-read regression:** historical protected-branch check name preserved deliberately. On PR #9 it verifies **ten assertion failures on pinned original `e79c151` AND ten passes on candidate code**; green means red-before/green-after was proven on mocks. On current master before this PR is merged, it still checks only baseline expected failures. After a merge, its semantics will change without breaking the configured required check name.
- **Package dependency smoke:** install and `npm pack --dry-run`, without a coherent lockfile. It is not a reproducible release test.

Record every later test's actual commit SHA, OS, command, workflow URL, fixture version and whether it was run; never state “green CI” without naming its coverage.


### Issue #3 characterization follow-up (2026-11-07; hosted CI verified on commit `1fbd93d`)

- Draft PR #6 expands the expected-failure harness to **five** individually named lifecycle defects: stale successful status, stale rejection, overlapping reads after reconnect, obsolete value publication, and active polling timer on close.
- Positive coalescing of repeated triggers during one unresolved read is added to the passing mocked baseline suite.
- **HIL pending:** HIL-S7-004, HIL-S7-005 and HIL-S7-007; no physical Siemens CPU tested. See [HIL_TEST_MATRIX.md](HIL_TEST_MATRIX.md). These findings are mocks, not protocol or hardware tests.
- Confirmed all five individually named assertions fail as expected (five TAP logs in the baseline-negative-control job) on [GitHub Actions run 42375597004](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42375597004), commit `1fbd93da39e7f52fc8b9581b417f7ada7a7c328b`. All six required checks passed. The tests are negative characterizations, **not successful behavior regressions or hardware verification**.


### Issue #3 candidate fix (2026-11-07; candidate CI verified on `64d3d33`, final head pending)

- Candidate branch `fix/issue-3-session-owned-read-lifecycle` changes read lifecycle ownership by session generation and invalidates stale read callbacks. A pending read stays exclusive to the ItemGroup until settled, so on reconnect no overlapping read is started. Timers stop on disconnect/close; close completion errors are observable.
- Ten named lifecycle tests must PASS on corrected code. The protected required check **retains its historical name** but verifies each assertion fails on the pinned, original `e79c151` runtime and passes on the current candidate.
- `npm test` must run passing baseline and lifecycle tests on Windows/Linux Node 22/24. This is mocked behavior only.
- [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520) passed all six required jobs on candidate `64d3d33a67d99e3eb6e89691f01e025624a0cb15`. Recheck CI on any later documentation/test-only head before merging.
- **Unverified:** real S7 wire/session teardown and socket counts; HIL-S7-004/005/007 pending; an endlessly unresolved ItemGroup read may still block recovery. Do not claim vendor firmware compatibility.

- [Initial proposed fix CI 42378264839](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378264839) passed 6/6 on `d16c65a34dae53fe5ddcac808a46851e3d1ed0ec`; each of the seven desired-behavior tests failed on original `e79c151` and passed on the corrected runtime, plus five positive baseline tests on Windows/Linux.
- Follow-up added three more red-before/green-after edge cases: disabled polling through reconnect, late connect/read after close and transient transport error without disconnect. [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520) verified all ten controls on commit `64d3d33`.

- Compatibility refinement: a transport `error` alone does not imply `disconnect`. Preserve polling, discard the pending result and coalesce one fresh retry; verified on candidate commit `64d3d33` via a failing original baseline control. No claim of actual wire behavior.


### Issue #5 npm lockfile source and proposed reproducibility gate (2026-11-07)

- Baseline mismatch: inherited `package-lock.json` was v1 and described `node-red-contrib-s7@3.0.0`, while package manifest is `3.1.3` with exact `@st-one-io/nodes7@1.1.2`. The normal CI used `npm install --no-package-lock`, not reproducible `npm ci`.
- [GitHub runner 42415922024](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415922024) on the #12 generator commit ran `npm install --package-lock-only --ignore-scripts`, `npm ci --ignore-scripts`, `npm ls --all`, nodes7 import and `npm pack --dry-run` successfully; it then **intentionally failed `git diff --exit-code`** because a newly generated lock was not yet committed. A real `package-lock.json` from the artifact is now proposed, with npm-provided SHA512 hashes for nodes7 1.1.2 and iso-on-tcp 0.1.0. No hashes were invented or manually substituted.
- New exact-head CI must prove the unchanged generated lock resolves **deterministically on both Ubuntu and Windows**, and six required checks (especially the renamed semantics of `Baseline must fail stale-read regression`) remain green. The added npm audit step is informational until findings are triaged; this is **not a security release claim**.


### Issue #5 reproducible dependency tree, validated on both platforms (2026-11-07)

[PR #12 code commit `b646572748f1d451ff1221eb0165c2bb7cecbeb3`](https://github.com/Missel2/node-red-contrib-s7/pull/12) passed the exact commit's [six protected CI jobs 42416075677](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075677), [two npm lockfile jobs 42416075682](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075682) (Ubuntu 24.04 and Windows 2025, Node 22), and [both CodeQL jobs 42416072293](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416072293).

- Real registry-created npm lockfile v3 for `node-red-contrib-s7@3.1.3`, `@st-one-io/nodes7@1.1.2` and `iso-on-tcp@0.1.0`. SHA512 integrity fields are from npm registry resolution, **not manually invented**.
- Both OS jobs ran `npm install --package-lock-only` without changing the committed lock (`git diff --exit-code` succeeded), `npm ci --ignore-scripts`, `npm ls --all`, import of `S7Endpoint`, and `npm pack --dry-run`.
- Artifacts: Linux lockfile SHA256 `13a543f3260cffca1a1d0113bd991e9a1bbf30eb84defe7796c9d10dafd0ce88` (LF, 949 bytes). Windows artifact was equivalent JSON with CRLF (979 bytes); normalization yields byte-identical content. No divergent dependency resolution.
- Both npm audit inventories returned `total: 0` known advisories (0 info/low/moderate/high/critical). The audit is **currently informational** (`continue-on-error`), not a mandatory vulnerability-free security gate. Zero findings are time-specific and do not establish complete security.
- `Package dependency smoke (Ubuntu, Node 22)` keeps its required check name but now runs real `npm ci` instead of `npm install --no-package-lock`.
- Documentation-only follow-up commit requires its own exact-head CI. No automatic merge, npm publication, live PLC tests, simulator or K8s deployment. HIL not applicable to this dependency-metadata change.
