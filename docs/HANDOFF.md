
# Development handoff

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
