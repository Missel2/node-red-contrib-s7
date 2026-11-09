**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.

Current navigation: [work index](WORK_INDEX.md), [review](PROJECT_REVIEW.md).
Historical sections below retain the status of their named revision; they do not override this snapshot.

---

# Verification ledger

## Latest verified product / CI baseline (2026-11-09)

- Protected `master` `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` contains independently approved and squash-merged PRs #9 (stale-read), #12 (v3 immutable npm lock), #10 (actual S7Comm/TCP software fixtures) and #15 (fixed nodes7 transport). **15/15 post-merge checks successful**, including native CodeQL. The wrapper now uses the fixed immutable GitHub archive `2cf864e38be447c2709348a25eb0524d67f5cf2d` with SHA-512 SRI. [COTP issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) was closed **only for the verified software leak defect**. HIL-S7-001…007 remain PENDING_HARDWARE. No publish or plant deploy.
- **New static-quality draft [PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14)** was independently rebased by merging current protected master into the PR branch and retargeting to master, without changing runtime `red/s7.js`, `src/tools.js`, the fixed dependency or protocol-fixture test sources. Implementation head `294943df5717adac05cab540bf6d092eb83fb712`: hosted [Verification 42612030118](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42612030118) and [npm lockfile 42612029945](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42612029945) passed; **19/19 GitHub check runs green**, including code scanning in JS/TS, Python, Actions, both Ubuntu/Windows Node 22 ESLint+Prettier+negative controls and all existing protocol/lock/Node-RED contracts. Protected `Package dependency smoke` now strictly requires `wire-protocol`, `pinned-nodes7-integration` **and** `static-quality` matrices, without changing the six existing required check names.
- **Tested defect in new tooling:** the initial quality run incorrectly compared multi-parent PR head to an older inferred Git merge-base and reported eight unchanged S7Comm test files as new formatting failures. Corrected checker to use the **exact `pull_request.base.sha` provided by GitHub**; it now asserts ancestry and checks only files truly changed relative to protected master. A subsequent code-only formatting failure inside this new script was fixed. The successful final code head reports the expected file selection with no mass reformat and passes strict negative controls. Earlier failed CI runs are not hidden or waived.
- **Type checking is advisory only:** `tsc --checkJs` reports inherited Node-RED mixin/property typing debt; the job stores real diagnostics but does not claim strict type checking passed. CodeQL is independent. Hosted software protocol tests are not Siemens firmware/PLCSIM/HIL.
- **This evidence update creates a new draft PR head; re-run exact-head CI before requesting a separate explicit approval.** No auto-merge.

---

Historical entries below record prior states of unmerged PRs at their original dates; they are not current status.


**Updated:** 2026-11-07. A green status check is evidence only for its named assertion and the exact commit tested.

| Item | Status | Evidence / limitations |
| --- | --- | --- |
| Upstream runtime | Preserved in merged PRs #1 and #6 | Current `master` retains the original wrapper; PR #9 proposes an explicit, separate code change, not merged |
| Project governance and credits | Merged in PR #1 | Public AI-assisted workflow, upstream credits, GitHub issue/PR tracking and active required checks on protected `master` |
| Baseline wrapper behavior | CI-verified in PRs #1/#6 and proposed PR #9 | Five baseline Node-RED mock tests, including repeated-trigger coalescing, passed against PR #9 candidate. No real S7 transport. [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520) |
| Stale read after disconnect | Baseline defect reproduced; PR #9 patch proposed | Five confirmed negative cases from PR #6 plus five new controls: ten cases are red on pinned master `e79c151` and green on candidate `64d3d33`. [CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520). Mock-only, not vendor verified |
| Prior experimental wrapper patches | Excluded from PR #1 | Earlier PR branch revisions passed mocked tests; they were removed to enforce one-defect-per-fix work |
| Pending nodes7 handshake cleanup | Source-inspection concern, unproven | [Issue #2](https://github.com/Missel2/node-red-contrib-s7/issues/2) |
| Reconnect and stale-read scenarios | Candidate corrected in PR #9, NOT merged | [PR #9 CI 42378583520](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42378583520): ten desired-behavior assertions individually red on immutable original, green on candidate, on mock fixtures. Transport and hardware limitations remain; see [Issue #3](https://github.com/Missel2/node-red-contrib-s7/issues/3) |
| Actual S7 wire protocol CI | Verified against disposable software server in draft PR #10 | Ubuntu/Windows real nodes7 COTP handshake, DB1 read/write, aborted handshake and two restarts; [CI 42412099544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412099544) 8/8. Not Siemens firmware. |
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


## Issue #3 merged and Issue #4 protocol integration — 2026-11-07

- [PR #9](https://github.com/Missel2/node-red-contrib-s7/pull/9) merged into `master` as `c931dbac4232d3f4481812a65597301548f30739`; its [post-merge CI 42412786650](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412786650) passed all six required jobs. Ten lifecycle regressions must fail on immutable original `e79c151` and pass on the corrected runtime.
- [PR #10 previously verified protocol CI 42412099544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42412099544) passed 8/8 jobs including genuine `@st-one-io/nodes7@1.1.2` with pinned `python-snap7==3.3.1` on Ubuntu/Windows: synthetic DB1 read/write, client-originated COTP abort at ~10 s, two process restarts with explicit ECONNREFUSED retries and fresh reset DB1 reads.
- This merge-reconciliation commit retains the PR #9 source and six mandatory checks while adding two actual-wire jobs. Exact-head CI remains required. No Siemens CPU, firmware or PLC writes tested; HIL-S7-001/-002/-003/-005 PENDING_HARDWARE.


### Issue #4 proposed repeated TCP blackhole fixture (await exact-head CI)

A new genuine `nodes7` test accepts TCP but suppresses COTP response in **three sequential attempts**, testing a bound on the client's own rejection (not the test timeout). It records peer socket open state after the client error plus a best-effort experimental `process._getActiveHandles()` observation, then explicitly cleans up. **Not yet verified; not a leak-free claim.** HIL-S7-001/-005 remain `PENDING_HARDWARE`.


### Issue #4 real TCP blackhole verified at `66997fd` (2026-11-07)

[GitHub CI 42414980669](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414980669) 8/8 pass on `66997fd98087afe7774fc4ed70018cd018d9a9ea`; [CodeQL run 42414976685](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42414976685) 2/2 pass. In 3 attempts per Ubuntu and Windows, the real client sent 22-byte RFC1006 handshake traffic to a peer that never replied, then rejected via its own `ERR_TIMEOUT` after ~10s; the test was not satisfied by a harness timeout. Captured archive data shows **one live peer TCP socket and one client-visible active Socket** immediately after each nodes7 error, in all six attempts. This does not establish a permanent socket leak or distinguish cleanup after `endpoint.disconnect()`. The follow-up test attempts that distinction; results pending CI. HIL-S7-001/-005 pending.


### Issue #2 reproduced incomplete transport cleanup after blackholed handshake (2026-11-07)

- [PR #10 workflow 42415198163](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415198163), code `440368df57418fad98662662e9a1c036bb6e4864`, **8/8 CI checks** on Ubuntu and Windows; [CodeQL 42415194594](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415194594) **2/2** passed.
- **All six software-only trials (3 per OS):** a genuine 22-byte RFC1006/COTP request to a nonresponding TCP listener; `nodes7` reports `ERR_TIMEOUT` after 10.001–10.011s; no false connect; **one peer socket and one client Socket remain open immediately afterward**; `endpoint.disconnect()` resolves but **one peer socket and one client Socket remain open 200ms later**. Hosted CI artifacts include `s7-blackhole-evidence.json`; `process._getActiveHandles()` is an internal diagnostic, not an OS-level general-purpose leak counter.
- The test then forcibly closes the synthetic server-side connection to avoid leaking CI processes. **This means cleanup is not validated.** Issue #2 now has direct real-TCP evidence; fix remains pending; no permanent process-handle growth rate or hardware effect has been measured.
- The next commit makes successful public `disconnect()` a positive test assertion and needs exact-head CI. HIL-S7-001/-005 remain pending.


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


## 2026-11-09: PR #10 branch synchronized after authorized lockfile PR #12 merge

PR #12 was independently approved and squash-merged to protected master as `7bee547d164fd94d3ecec1eee472fb860ba4a31c`. The v3 npm lockfile and Windows/Linux `npm ci` checks are retained. PR #10's five synthetic S7Comm tests remain unchanged and still target original registry-stock `nodes7@1.1.2`; the corrected fork is tested separately in draft PR #15. This PR is unmerged and requires separate approval. No Siemens hardware/OT used.


## 2026-11-09 — confirmed PR #10 merge; directly integrated protocol CI in draft PR #15

- **Approved and merged separately:** [PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) → `8e460f1136319567ac6d0646d467c74af9c70e16`; 13/13 green pre-merge checks including CodeQL, exact original head `e5693ec9d4760632047f5c94f8a3556e6ce07e60`, both review threads resolved. The five local TCP/S7Comm protocol tests using hosted `python-snap7==3.3.1` and controlled DB1 writes are now tracked in protected `master`.
- **Draft, not approved:** [PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) integrates the separately human-merged [nodes7 COTP fix](https://github.com/Missel2/nodes7/pull/13) at full immutable commit `2cf864e38be447c2709348a25eb0524d67f5cf2d`. The installed package key stays `@st-one-io/nodes7`, sourced from HTTPS archive `https://codeload.github.com/Missel2/nodes7/tar.gz/2cf864e38be447c2709348a25eb0524d67f5cf2d`, npm v3 lockfile SHA-512 `sha512-UzB7DpAU6SSRjVwg2DP+tJEnnS70ojGttiDuXEgA7URgnFcTU7MioAU5XcsfEg135g1vdUNNvEj61VwPyyG+0g==`; `iso-on-tcp@0.1.0` stays pinned.
- **Simplified direct test ownership:** PR #15 previously fetched test fixtures from an unmerged PR #10 commit to hosted runner directory `.wire-fixture`. Now PR #10 is merged, the extra checkout, temporary file copies and second wire-fixture matrix are **removed**. The original protected `S7 wire tests` OS matrix runs checked-in five tests unchanged **plus** `test/integration/nodes7-wrapper-s7comm-wire.test.cjs` (real `red/s7.js` under minimal Node-RED API harness, genuine COTP/S7Comm DB1 read/write/readback) and `scripts/ci/verify-s7-wire-replay.cjs` (three blackholes, reconnect freshness, TCP RST and pre-cleanup socket checks).
- Separate required `Pinned nodes7 integration` OS matrix asserts source/lock provenance, real Node-RED `close` before COTP completes and actual parsed COTP CC followed by its late native callback; the existing protected `Package dependency smoke` now **requires both OS matrices to pass**.
- Previous [PR #15 checks](https://github.com/Missel2/node-red-contrib-s7/pull/15/checks) on `2779a845369752a24d6cf6da3d266832791427a4` were 15/15 green including CodeQL **before** the in-tree merger. This is historical evidence only. **Fresh exact-head workflow and CodeQL results are required on the new combined commit**.
- Tests are hosted synthetic loopback only, **not a full Node-RED runtime or Siemens firmware**. HIL-S7-001/-002/-003/-004/-005/-007 remain `PENDING_HARDWARE`. No npm publish, real PLC or production OT, and no automatic merge of PR #15.

## Quality-gate packaging safeguard (2026-11-09)

Draft PR #14 implementation SHA `cfa1eaeff67a88d4cbd3a3d32ecdfdc4fedf98df` passed [Verification 42613182501](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42613182501) and [NPM lockfile 42613182472](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42613182472), with **19/19 check runs successful**, including all three native CodeQL analyses. The original `npm pack --dry-run` inspection had shown it would ship `tools/quality/` even though that is dev-only CI infrastructure. This PR now excludes only that directory via `.npmignore`, and the protected package-smoke runs a strict runtime-manifest assertion plus an intentional invalid-manifest negative control. The log reports `PACKAGE_MANIFEST_PASS`: runtime files present, quality toolchain excluded, deliberate bad manifest rejected. No npm release or physical PLC/HIL testing. This paragraph records that *implementation head*; subsequent documentation commit needs separate exact-head checks.


## 2026-11-09 — PR #14 synchronized with approved PR #17 master

- Protected `master` advanced from `e4f9f6d154c059986517bcfa35ef34d81bcd6c92` to **`cedbd85a38b26437160788f9dc17c352b645de03`** after separately approved [PR #17](https://github.com/Missel2/node-red-contrib-s7/pull/17) fixed an **integration test harness** status-polling timeout, not runtime PLC behavior. [Master CI 42663508468](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663508468) and GitHub code scanning [42663509052](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42663509052) passed on that exact commit; 13/13 visible post-merge checks green. Issue #16 is closed.
- [Draft PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14) retains its existing `ci/quality-gates-before-runtime` branch and its isolated, SHA-integrity-locked `tools/quality` dependencies. This integration merges **the exact approved `master` parent** and preserves the newly committed `test/integration/wait-for-status.cjs`, `wait-for-status.test.cjs`, and `nodes7-wrapper-s7comm-wire.test.cjs` as-is, along with the four-host wrapper-contract deadline test step. Existing PR #14 static quality matrix on Ubuntu/Windows and the required protected `Package dependency smoke` aggregate for `wire-protocol`, `pinned-nodes7-integration` and `static-quality` are retained. No changes to production S7 wrapper/protocol or dependency source.
- PR #14's previous source `94920b28bd16de19345a22f079770d7d9cfd5133` had 19/19 green checks on an older base; **those results do not verify this new integrated commit**. Fresh exact-head Windows/Linux lint, Prettier, deliberate negative controls, npm lockfile, protected package manifest and native CodeQL are required. Advisory TypeScript diagnostics are **not** a zero-error proof.
- The PR remains **DRAFT and UNMERGED** until independent explicit owner approval. No npm publication, product installation, live PLC, HIL tests or production OT. HIL-S7-001…007 remain PENDING_HARDWARE.

## 2026-11-09 — PR #14 revalidated after PR #17 master reconciliation

- Source SHA `c220d9022d889ed9fc525680bd46edb73cb8df5d` (draft [PR #14](https://github.com/Missel2/node-red-contrib-s7/pull/14)) merges protected master `cedbd85a38b26437160788f9dc17c352b645de03` after the independently approved PR #17 deadline-owned S7 test harness. Both `test/integration/wait-for-status.cjs` and its four-case test, real S7Comm wrapper test and four-host wrapper contract deadline step are preserved. No `red/s7.js`, `src/tools.js`, runtime dependency, hardware or production change.
- [Verification 42666015864](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42666015864) and [NPM lock 42666015627](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42666015627) both **SUCCESS**: **19/19 checks green**, including CodeQL (JS/TS, Actions, Python), four Node 22/24 wrapper contract checks, both hosted `S7 wire tests`, both pinned COTP integrations, both static-quality jobs, both lockfile jobs, required package smoke and baseline-red/current-green lifecycle regression.
- Actual Ubuntu and Windows static-quality job logs: `FORMAT_BASE_SHA=cedbd85a38b26437160788f9dc17c352b645de03`; `Changed-file Prettier: 8 enforced, 0 legacy-debt exclusions, 0 failures`; `Quality negative controls: ESLint red/green and Prettier red/green confirmed`. The **advisory `tsc --checkJs` job does not certify type safety**.
- Both OS protocol jobs pass **5/5 S7Comm cases + 1/1 full API-harness DB1 read/write/readback**, and `PINNED_S7COMM_REPLAY_PASS` asserts two server restarts, TCP RST, handshake abort and three 10s blackholes. Both pinned fork COTP jobs pass **3/3**. The existing protected package smoke requires the three full matrices (`wire-protocol`, `pinned-nodes7-integration`, `static-quality`) to succeed; `PACKAGE_MANIFEST_PASS` confirms Node-RED runtime files retained, `tools/quality/` excluded, and a deliberate invalid manifest rejected. It was a **dry-run only; no npm publish**.
- This section records checks at the **implementation commit `c220d9022d889ed9fc525680bd46edb73cb8df5d`**. A further docs-only commit needs its own exact-head CI/CodeQL; never transfer a green check to an untested revision. PR #14 remains DRAFT and UNMERGED pending explicit separate human permission; HIL-S7-001…007 PENDING_HARDWARE, static-quality change `HIL: not applicable`. No deployment, Siemens firmware certification or live PLC tests.
