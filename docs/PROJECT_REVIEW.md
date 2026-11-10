# Repository review — 2026-11-09

**Verified repository snapshot: 2026-11-09; baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`.** PR #14 (static quality), #17 (test-harness deadline), #15 (fixed nodes7 pin), #10 (wire fixtures), #12 (lockfile) and #9 (stale reads) are merged. Security/Dependabot PR #11 remains open. This is software evidence, not a published fork release or physical Siemens qualification.


## Scope and limits

This is an AI-assisted engineering review, not independent security certification
or proof that every execution path is correct. It inspected source structure and
selected lifecycle/queue/write/parser paths, manifests/locks, hosted workflows,
current issues/PRs/branches, protection rules and contributor documentation.
Historical evidence was compared with actual Git state. Hardware, a full Node-RED
runtime, long-duration load and every parser branch were not executed in this review.

## Findings and ownership

| Area | Observed evidence | Action / qualification gap |
| --- | --- | --- |
| Transport ownership | nodes7 #13 merged; wrapper pins `2cf864e38be447c2709348a25eb0524d67f5cf2d` | Preserve software regressions; long-run and packet-boundary work in nodes7 #16 |
| Rejected queue admission | `sendRaw` rejects after destroy but still appends work; reproduced locally | nodes7 #14 / PR #18; isolated one-line candidate, not merged |
| Wrapper lifecycle | 15 wrapper contracts + 4 deadline tests passed locally on Linux Node v24.22.1 | Full installed Node-RED/editor lifecycle still wrapper #18 |
| Writes | `writeVar` forwards promise results; success roundtrip exists | Unknown acknowledgement, admission bounds and completion contracts in wrapper #19; no duplicate-write defect asserted |
| Encoding and dates | Parser/item suites and fixed UTC-03 fixture convention exist | Independent boundary vectors in nodes7 #16; explicit DT/DTL contract in #17 |
| Supply chain | Both locks are v3; nodes7 retains old dev tooling; existing Dependabot PRs #2–#9 | nodes7 #15, existing wrapper PR #11; no sweeping update |
| CI/protection (2026-11-09 snapshot) | Active `protect-master`; nodes7 8 required contexts, wrapper 6; protected aggregate gates wire/static matrices | Historical state only; the 2026-11-10 governance update below supersedes this row |
| Distribution | Inherited upstream package names/versions; wrapper pins a source archive | Distinct release identity and actual tarball install in shared #21; no publication |
| Community entry | Contradictory unmerged status, missing contributor entry, duplicate wrapper PR templates | This documentation PR refreshes entry points, quickstart and template |
| Hardware | No named CPU/firmware results | Shared #8; all HIL cases pending |

## Exact baseline checks

GitHub check-run snapshots at the baseline SHAs were inspected through the public
API. nodes7 had 12 successful Verification/CodeQL jobs plus three successful
Dependabot checks; wrapper had 18 successful jobs, including CodeQL analyses,
Windows/Linux wire/lock/static checks and advisory types. Advisory type success
means diagnostics were captured, not that types are error-free. No pending new PR
head inherits these results. Protection settings were read, not modified.

## Dependency audit snapshot

`npm audit --json` on nodes7's unchanged v3 lock, npm 11.9.0, 2026-11-09:
37 affected package entries (5 critical, 23 high, 6 moderate, 3 low). This count
includes transitive/metavulnerability propagation and is not 37 independent exploits.
`npm audit --omit=dev --json` reported zero known production findings. Neither result
proves absence of vulnerabilities; reachability and advisory disposition remain #15.
No `npm audit fix`, lock rewrite or dependency upgrade was performed.

## Priority and acceptance

The [shared roadmap](https://github.com/Missel2/node-red-contrib-s7/issues/21) is the canonical ordered checklist. Release work
must attach an evidence manifest tying **both** source SHAs to package digests,
lock hashes, precise test environments, known advisory decisions and hardware state.
An expiring Actions artifact is not permanent proof; retain a concise verified
summary and hashes with release evidence. Avoid new dashboards duplicating this index.

## Governance update — 2026-11-10

GitHub settings were checked again after the maintainer's manual changes. The wrapper's
active `protect-master` ruleset (ID `26751662`) now enforces **nine** required
GitHub Actions contexts: four Windows/Linux Node 22/24 wrapper contracts,
`Baseline must fail stale-read regression`, `Package dependency smoke (Ubuntu, Node 22)`,
and three CodeQL analyses: `Analyze (javascript-typescript)`, `Analyze (python)`
and `Analyze (actions)`. The ruleset requires up-to-date checks, resolved review
threads, linear history and squash-only PR merges; no bypass actor is configured.
The repository disables merge-commit/rebase/auto-merge and enables squash merging.
The nodes7 repository retains eight required contexts. These are independently
verified configuration facts, not evidence that a deliberately failed required
check has been blocked.

The unchanged wrapper `master` SHA `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`
had 18/18 successful check runs, including all nine required contexts. For the
separate documentation PR #22, earlier head `e0f33001d372edea93773f76cf2dc581bf56ec95`
passed 17/17, including the three required CodeQL analyses, before this
review follow-up. A newly updated head must earn fresh exact-head CI.

## Installed runtime qualification in progress — 2026-11-10

[Wrapper PR #24](https://github.com/Missel2/node-red-contrib-s7/pull/24)
implements the installed Node-RED 5.0.9 / packed-tarball lab for issue #18.
Its head `7f3895aec2ef9a941a01c979e1b2d9b0e31ce506` passed 23/23
checks on hosted Ubuntu/Windows Node 22/24, but the existing immutable nodes7
pin still exhibits an unwanted COTP retry and one live peer after a flow stop.
That is an explicitly **characterized known failure**, not a strict positive
teardown pass. nodes7 PR #21 is merged but not yet repinned downstream; nodes7
PR #18 remains an independent unmerged queue fix. After PR #22 is approved and
squash-merged, PR #24 must be reconciled to the new `master`, repinned only
through a separately reviewed dependency change, and retested with strict
post-stop zero-retry/zero-peer assertions. Hardware test cases remain
`PENDING_HARDWARE`.
