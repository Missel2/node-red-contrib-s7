# Current development handoff

**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


Start with [WORK_INDEX](WORK_INDEX.md), [PROJECT_REVIEW](PROJECT_REVIEW.md) and
[shared issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21). Do not resume an old unmerged-PR instruction
from the historical notes below without checking GitHub.

## Continuation update — 2026-11-10

The earlier 2026-11-09 baseline above is an immutable historical snapshot.
Since then, the maintainer enabled nine **required** wrapper checks (including
CodeQL JavaScript/TypeScript, Python and Actions), squash-only, linear history
and strict up-to-date PR checks in the active `protect-master` ruleset. There
are no bypass actors or automatic merges. Reconfirm the settings at each merge.

1. Complete existing [documentation PR #22](https://github.com/Missel2/node-red-contrib-s7/pull/22):
   verify its **new** exact head, all nine required checks, CodeQL and review
   threads after this update. It fixes the Windows case-colliding PR template
   paths; human approval remains mandatory before squash merge.
2. Reconcile [installed runtime lab PR #24](https://github.com/Missel2/node-red-contrib-s7/pull/24)
   after #22 is squash-merged. The prior PR #24 head
   `7f3895aec2ef9a941a01c979e1b2d9b0e31ce506` passed 23/23 hosted checks:
   real Node-RED 5.0.9/tarball use on Windows/Linux Node 22/24. **These checks
   deliberately characterize a known post-stop COTP retry and one live peer
   from the old nodes7 pin**, not a fixed teardown. Do not mark the installed
   lifecycle strictly qualified before a separately reviewed exact-SHA nodes7
   repin and fresh zero-retry/zero-live-peer hosted proof.
3. In the sibling [nodes7 PR #18](https://github.com/Missel2/nodes7/pull/18),
   resolve its conflict with `master` (which now includes approved #21),
   reverify its queue-after-destroy regression and required checks, then seek
   a separate maintainer merge decision. The wrapper's library pin remains
   `2cf864e38be447c2709348a25eb0524d67f5cf2d` until separately changed.
4. Continue existing wrapper security/Dependabot PR #11 and nodes7 security
   issue #15 without creating overlapping PRs; subsequent write outcomes are
   tracked in wrapper issue #19.

No merge, publication, deployment or physical PLC access is authorized by this
handoff. HIL-S7-001 through -007 remain PENDING_HARDWARE. After any commit,
check exact-head CI and review threads; historical green checks do not transfer.

Earlier continuation notes remain available in Git history and the revision-labelled [evidence ledger](EVIDENCE.md).
