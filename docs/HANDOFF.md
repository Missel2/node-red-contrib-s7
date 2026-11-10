# Current development handoff

## Latest security-maintenance continuation — 2026-11-10

Protected wrapper `master` is `2735621f217ae6372ed689d9a8943cd85c7bed00`, after the explicitly authorized installed Node-RED lab PR #24 squash. Its nine required Windows/Linux, CodeQL and runtime test contexts passed, while a separately triggered Dependabot security updater failed on transitive `minimatch`, `multer` and `undici` in the Node-RED 5.0.9 test lab (**23/24 overall**). This is real open security-update debt, **not** a failed S7 runtime assertion; do not silently downgrade to Node-RED 4.x to make the bot green.

Existing [security PR #11](https://github.com/Missel2/node-red-contrib-s7/pull/11) is being merged forward against that master on its own branch, preserving the protected installed-runtime CI, approved nodes7 pin and source history. Its proposed Dependabot policy covers four separate weekly manifest scopes: root npm, CI quality npm, installed runtime-lab npm and GitHub Actions. Static-quality CI validates the four schedules, manifests, grouping and deliberate broken-config negative controls on Windows/Linux. This proposal **does not** fix advisories, activate GitHub Security toggles, permit auto-merge or publish packages.

Next: finish exact-head PR #11 CI and CodeQL, recheck required status contexts and review threads, then request a separate explicit squash-merge decision. Independently evaluate compatible fixes for the test-only transitive dependencies without overriding or disabling vulnerabilities. Real Siemens HIL-S7-001…007, release compatibility and production safety remain unverified. No physical PLC access, deployment, npm publication or timed development is authorized.

**All subsequent 2026-11-09/earlier 2026-11-10 continuation notes below are historical and do not supersede this verified snapshot.**


**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


Start with [WORK_INDEX](WORK_INDEX.md), [PROJECT_REVIEW](PROJECT_REVIEW.md) and
[shared issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21). Do not resume an old unmerged-PR instruction
from the historical notes below without checking GitHub.

## Continuation update — 2026-11-10 (after approved library pin)

The first dated heading above is a historical snapshot, not live operating state.
The maintainer has separately approved squash-merges for documentation PR #22,
nodes7 PRs #21 and #18, and wrapper source-pin PR #26. Confirmed wrapper
protected `master` at handoff: `aa9f340251ff25bff08d37029e73c9ff09c92dee`; it now pins the approved
nodes7 `95d5c511b2073b9d306ffe47fef186a7738f2254` with an
SHA-512-locked npm v3 lockfile. The nine required checks include all three
CodeQL languages; exact-master post-merge checks for #26 were 18/18 green.
No npm release or physical Siemens CPU qualification is implied.

1. Continue the existing [installed Node-RED lab PR #24](https://github.com/Missel2/node-red-contrib-s7/pull/24) on a branch. Keep the strict
   installed-runtime assertions requiring `postRemoval.verdict=passed`,
   `extraRequests=0`, `livePeers=0` before cleanup in both locked and consumer
   installs, and `replayedWrites=0` after lost ACK. Previous results were
   successful on earlier *unmerged composite* heads; **fresh exact-head CI
   and archived JSON evidence must qualify the reconciled branch separately**.
   Do not merge without a new explicit maintainer decision.
2. Validate installed Node-RED 5.0.9 on hosted Ubuntu 24.04 and Windows 2025,
   Node.js 22 and 24: all four runtime jobs and eight installed-mode results,
   package digest/provenance, mandatory package-smoke dependencies, CodeQL,
   HIL debt and open review discussions. Do not confuse software-loopback with
   Siemens hardware qualification.
3. Then address [security/Dependabot PR #11](https://github.com/Missel2/node-red-contrib-s7/pull/11) and the separate
   unknown-write outcome / freshness issues [#19](https://github.com/Missel2/node-red-contrib-s7/issues/19)
   and [#20](https://github.com/Missel2/node-red-contrib-s7/issues/20) by isolated
   reviewed PRs. Do not create overlapping work or automatically publish.

The explicit-stop rule is **no automatic reconnect on command/flow removal**,
regardless of auto-reconnect setting. A network-induced loss may reconnect only
under configured automatic reconnect; unknown writes must never be replayed.
All HIL-S7-001…007 remain PENDING_HARDWARE. No publication, deployment,
hardware access, automatic timed development or merge authorization is implied.

Earlier continuation notes remain available in Git history and the revision-labelled [evidence ledger](EVIDENCE.md).
