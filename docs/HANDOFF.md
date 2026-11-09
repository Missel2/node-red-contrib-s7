
# Development handoff

> **Current status, 2026-11-09:** PR #12 was explicitly approved and merged at `7bee547d164fd94d3ecec1eee472fb860ba4a31c`; PR #10 is still unmerged (new CI-verified branch head `e5693ec9d4760632047f5c94f8a3556e6ce07e60`); draft PR #15 now targets protected `master` directly and pins the fixed nodes7 fork. The subsequent historical notes below record earlier stages when PR #12 was still open. No additional merge permission.


**Updated:** 2026-11-07. Confirm GitHub branch/CI state before further work.

## Baseline

- PR #6 [merged](https://github.com/Missel2/node-red-contrib-s7/pull/6) into `master` at `e79c15107731e0387d1b3679f2409aef043e87f5`; post-merge [CI 42377654001](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42377654001) 6/6 success. That green CI confirmed **five known failing desired-behavior checks** on the unmodified runtime; no bug fix.
- Issue #3 follow-up branch `fix/issue-3-session-owned-read-lifecycle` contains the candidate lifecycle fix and a test-gate conversion. **Do not claim this fix verified until a green CI run on the exact head SHA.**
- No new dependency/protocol implementation. Lockfile still stale (#5); independent S7 wire fixture still outstanding (#4); separate pending COTP transport teardown (#2).

## Candidate lifecycle change / limitations

- Pending ItemGroup read ownership retained through disconnect/reconnect; per-connection generation marks late success/rejection stale; old values do not publish.
- Stop/close cancels polling timer and makes close callback complete even if disconnect rejects; repeated read requests coalesce. Keep disabled cycle interval through reconnect.
- **Known limitation:** an `@st-one-io/nodes7` read promise that never settles still blocks subsequent reads on the same item group. True transport abort/recreation belongs to an independent, test-first dependency strategy; do not silently overlap operations.
- Existing required check `Baseline must fail stale-read regression` is retained for branch ruleset continuity. It now checks seven assertions **red against frozen original master `e79c151` AND green against proposed corrected wrapper**. Five were characterized in PR #6, five are added as negative controls here (including disabled polling, post-close events and a transient transport-error retry without a disconnect). `npm test` must now run positive corrected lifecycle checks.
- Only mock Node-RED/transport tests have run, no actual wire, Siemens simulator or physical S7-1200 tests.

## Future hardware testing

- [Issue #8](https://github.com/Missel2/node-red-contrib-s7/issues/8), [HIL matrix](HIL_TEST_MATRIX.md): HIL-S7-004/005/007 **PENDING_HARDWARE**. No physical CPU or test-runner available; no real PLC interaction permitted.
- Only trusted, approved hardware tests on isolated runner with explicit safety checks, and separate approval for physical writes.

## Next

1. Inspect actual branch head, current CI (all six jobs) and the patch; fix failures without weakening negative control or regression expectations.
2. Provide human review and merge decision for the scoped Issue #3 fix PR; **no unattended merge**.
3. Then continue #4 (wire fixture), #5 (reproducible lockfile) and #2 (pending handshake teardown) separately.

## No-go boundaries

Do not auto-merge, publish to npm, deploy to production OT or use real PLCs without explicit authorization.


- Issue #5: [draft PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) regenerates inherited stale npm lockfile v1 (package 3.0.0) via GitHub Actions artifact `npm-lockfile-node22` [run 42415922024](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42415922024) into a real `lockfileVersion: 3` for package 3.1.3. The first run intentionally failed `git diff --exit-code` because the lockfile was not yet committed, while npm-ci and dependency import steps passed; the artifact contains exact registry integrity metadata for `@st-one-io/nodes7@1.1.2` and `iso-on-tcp@0.1.0`. Final PR adds this lock, upgrades the existing required package-smoke job to `npm ci`, and runs lock regeneration/clean install on Ubuntu and Windows. Verify exact-head CI before claiming reproducibility or merging. No npm publish.


- Issue #5 exact dependency-tree evidence: [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) code `b646572` passed [CI 42416075677](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075677) (6/6), [Ubuntu/Windows lock and npm-ci matrix 42416075682](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416075682) (2/2) and [CodeQL 42416072293](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42416072293) (2/2). Real lockfile v3 with registry SHA512 integrity metadata; `@st-one-io/nodes7@1.1.2`, `iso-on-tcp@0.1.0`. Npm audit inventories showed zero current known vulnerabilities on both OSes; scan remains informational. Docs-only head update requires new CI. No merge or release performed.


## 2026-11-09 — new stacked library integration (not merged)

- **Only** [nodes7 PR #13](https://github.com/Missel2/nodes7/pull/13) was authorized for merge and is now on `Missel2/nodes7/master` at `2cf864e38be447c2709348a25eb0524d67f5cf2d`.
- [wrapper draft PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) is intentionally **stacked on PR #12 branch** `build/issue-5-reproducible-npm-lockfile` (base `b6afbd8a82fa9e5432f899cec9be7672883f4e6a`) to retain a clean v3 lockfile foundation without merging someone else's PR or duplicating dependency work. Its branch is `feat/pinned-nodes7-cotp-integration-20261109`.
- Proposed exact runtime dep `@st-one-io/nodes7` is a real immutable GitHub HTTPS tarball SHA `2cf864e38be447c2709348a25eb0524d67f5cf2d` with committed SHA-512 integrity in npm lock. No use of npm registry's old upstream tarball or SSH. The package name remains from upstream; independent fork provenance is documented.
- New *required* Windows/Ubuntu Node 22 actual-installed-dependency tests check exact lock+runtime fingerprint, Node-RED wrapper closed during pending real COTP and independently parsed real COTP CC with post-cancel native callback. Required existing `Package dependency smoke (Ubuntu, Node 22)` now transitively gates **both OS integration jobs**. Initial implementation head `141866b1945139ede258f20bc3dd19f5e207bb18` passed Verification `42565515970` and lock workflow `42565515961`; all 10 checks green. Raw artifacts Windows `13651555478`, Ubuntu `13650728003` show 0/0 live sockets, 1/1 decoded CC/late native callback, Node-RED close exactly once.
- This handoff/documentation commit changes the branch head; recheck exact-head CI before any review/approval. PR #15 stays **draft/unmerged**, and PR #12 is **also unmerged**. PR #10 S7Comm wire tests and PR #14 static checks are still separate staged work, not inherited automatically through the PR #12 stack.
- Before merging wrapper integration: obtain independent human approvals for each prerequisite; reconcile/restack branch on updated protected master, rerun full wrapper+wire+security/CodeQL checks, review API compatibility, prove exact commit and source integrity, and request **new explicit authorization** for PR #15.
- HIL-S7-001/002/003/004/005/007: **PENDING_HARDWARE**, no real CPU/OT tests. No auto-merge, npm publication, production traffic or unapproved hardware access.


## 2026-11-09 continuation — direct wrapper S7Comm proof staged (no additional merges)

- [PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) now includes an immutable PR #10 fixture replay matrix (test SHA `877eed6cdb835f66bc59bf9348880dfb022d9bdf`), plus a new *actual wrapper* `red/s7.js` DB read/write/readback case. The real wire test uses installed HTTPS+SHA-512 verified nodes7 `2cf864e38be447c2709348a25eb0524d67f5cf2d`, not the stock registry version.
- Implementation head `60515ee1057d991ff4293da2f2dcce275b700d0d` passed [Verification 42571944637](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42571944637) (10/10 jobs) and [lockfile 42571944644](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42571944644) (2/2 jobs). Both Windows and Ubuntu passed **5 independent protocol tests + 1 actual wrapper DB1 test + 3 pinned COTP/Node-RED close tests**. Raw artifacts 13653272579 and 13653453252 were inspected; values 12.5/-123/3.25 -> 12.5/-123/19.75, close once, no visible client handle.
- PR #10 and PR #12 remain OPEN and not authorized for merge. PR #15 remains a **draft stacked on PR #12**, not on protected wrapper master; the extra fixture comes from an immutable PR #10 SHA and does not duplicate its sources in this branch. **Final documentation and verifier-strengthening commit requires new exact-head CI**; do not reuse prior green SHA.
- Follow-up after explicit approval of each prerequisite: merge PR #12 with fresh base ruleset/CI checks, reconcile PR #10 and its code scanning, restack PR #15 against protected latest master, rerun installed-fork wire tests, CodeQL and license/packaging before requesting a separate approval of PR #15. HIL remains pending. No auto-merge, npm publish, OT deployments or hardware testing.


## 2026-11-09 security gate at stacked integration PR #15 (latest)

- The repository has CodeQL **Default Setup**. A temporary advanced-mode SARIF uploader failed with a configuration conflict on integration head `5053c81` (not a vulnerability verdict). Corrected by running a **local-only SARIF analysis** (no server-side upload) with a CI gate that requires actual CodeQL 2.1 SARIF and rejects high/critical findings. Implementation head `7cd62fb615da3d71319fc0169d867865ee0feef8` passed [local CodeQL 42573154401](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42573154401): 1 SARIF file, **0 findings**, 0 high/critical. Verification `42573154194` and Lockfile `42573154419` also green: 13/13 check-runs.
- `docs/EVIDENCE.md` contains exact implementation head, security conflict cause, fix and protocol tests. The documentation head resulting from this update **must still pass its own complete checks** before being called merge-review-ready.
- For final restack on `master`, coordinate with the separately owned PR #11 security changes and let **Default Setup** scan the resulting PR. Remove/retire this temporary local CodeQL workflow when verified scanning on target master is available. Never enable parallel SARIF upload with active Default Setup. PR #15 and prerequisite PR #12/#10 **remain unmerged and individually approval-gated**.

## 2026-11-09 — current state after authorized PR #12 merge and PR #10 sync

- **Lockfile prerequisite completed:** wrapper [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) was expressly approved and squash-merged to protected `master` as `7bee547d164fd94d3ecec1eee472fb860ba4a31c`. The original registry-based npm lockfile and `npm ci` baseline are now on master.
- **PR #15 is now a DRAFT directly against protected `master`**, not stacked on the obsolete PR #12 branch. Its own `package.json` and `package-lock.json` propose a SHA-512-verified HTTPS tarball of the repaired `nodes7` fork, commit `2cf864e38be447c2709348a25eb0524d67f5cf2d`. This fork change has **not** been merged into the wrapper.
- **PR #10 remains OPEN and UNMERGED**, but its branch was synchronized with the approved lockfile master; its new head `e5693ec9d4760632047f5c94f8a3556e6ce07e60` passed **13/13 checks** with immutable synthetic S7Comm tests and actual `npm ci` on Windows/Linux. Those tests' blob contents are unchanged. The PR #15 verification workflow now fetches the **new exact fixture SHA** `e5693ec9d4760632047f5c94f8a3556e6ce07e60` and verifies the checkout's SHA before staging only the test sources on disposable runners.
- The new PR #15 head created by this documentation/workflow change requires a new CI run. No CodeQL or wire evidence from an earlier head substitutes for final exact-head checks. Do not merge PR #10 or PR #15 without new separate explicit approval. No npm publish, OT deployment, or hardware tests. HIL-S7-* remains `PENDING_HARDWARE`.


## 2026-11-09 — native GitHub CodeQL Default Setup verified; temporary local scan removed

- After PR #12 was explicitly approved and squash-merged and draft PR #15 was retargeted onto protected `master`, GitHub's existing CodeQL **Default Setup** scanned this *actual* integration PR successfully. Head `dbf4ddfe28cfad8aff4dd517d65bcda8d47a92d4` had **16/16 successful checks**: CodeQL `Analyze (actions)`, `Analyze (javascript-typescript)`, CodeQL PR security result, temporary local SARIF job, two Windows/Linux real S7Comm replay and real wrapper DB read/write, two earlier COTP integration jobs, four wrapper-contract jobs, lifecycle negative gate, both locked install jobs and protected smoke.
- The temporary `.github/workflows/codeql-pinned-integration.yml` and `scripts/ci/check-local-codeql-sarif.cjs` are now **removed** from the draft PR to prevent maintaining duplicate static-analysis configurations. This removal does **not** disable GitHub Default Setup. The historical local scan and its previous SARIF upload conflict remain documented above for auditability; do not misrepresent an earlier failed advanced upload as a security finding.
- **This cleanup changes the PR head.** Rerun all current required Windows/Linux, npm lockfile and GitHub Default Setup CodeQL checks on its new exact SHA. Do not merge PR #15 automatically; it is still DRAFT. PR #10 remains OPEN, unmerged; future changes to its test source require updating the immutable pin and retesting the integration. Physical HIL remains PENDING_HARDWARE.
