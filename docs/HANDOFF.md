# Current development handoff

**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


Start with [WORK_INDEX](WORK_INDEX.md), [PROJECT_REVIEW](PROJECT_REVIEW.md) and
[shared issue #21](https://github.com/Missel2/node-red-contrib-s7/issues/21). Do not resume an old unmerged-PR instruction
from the historical notes below without checking GitHub.

1. Inspect nodes7 PR #18's exact-head CI/reviews. Its one-line runtime fix is separate
   from the documentation review and is not yet in the wrapper dependency.
2. Continue wrapper PR #11 and nodes7 #15 dependency triage; reuse existing PRs.
3. Begin the real Node-RED runtime/package contract (#18 in the wrapper) once current
   work is resolved. Write/fault qualification follows the shared dependency order.

No merge or release is authorized by this handoff. HIL remains PENDING_HARDWARE.
The documentation changes in this review require their own exact-head CI.

Earlier continuation notes remain available in Git history and the revision-labelled [evidence ledger](EVIDENCE.md).
