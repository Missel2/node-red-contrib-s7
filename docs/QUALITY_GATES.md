# Static quality gates (Issue #7)

**Scope:** CI/development only. This work does not modify `red/s7.js`, `src/tools.js`, the S7 protocol dependency or real hardware.

## Required checks

- Ubuntu 24.04 and Windows 2025 (Node 22): exact `npm ci --prefix tools/quality --ignore-scripts --no-audit --no-fund` against the separate committed lockfile.
- `npm run lint`: ESLint correctness rules for JavaScript in runtime, tools and tests; does not enforce legacy indentation, quotes or `var` conversion.
- `npm run format:check`: new JS/JSON files and changed files whose baseline version already matched Prettier must pass. Pre-existing unformatted files are reported as `LEGACY_FORMAT_DEBT` and can be reworked separately; a format exception never suppresses ESLint.
- `npm run quality:negative-control`: inject an undefined JavaScript symbol and malformed formatting in memory; verify both produce failures while correct examples pass.

The job `Package dependency smoke (Ubuntu, Node 22)` already belongs to the protected-master required checks. It is now **dependent on both static-quality matrix jobs** and fails if that matrix is not fully successful. This ensures lint and format failures actually block merges without requiring an immediate GitHub ruleset administrative update. The new static-quality check names can also be added directly in repository rules, if desired.

## Diagnostic checks, deliberately non-blocking

`node tools/quality/node_modules/typescript/bin/tsc --project tools/quality/tsconfig.json --pretty false` analyzes existing JavaScript under `//@ts-check`. The historical diagnostics are stored in CI logs and uploaded as an artifact; until triaged, this is **advisory and does not establish type safety**. Security CodeQL checks still run independently and are not made required by this PR; adding them to `protect-master` needs a repository ruleset change.

## Lockfile and merge sequencing

- [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) and [PR #15](https://github.com/Missel2/node-red-contrib-s7/pull/15) are explicitly authorized, merged and independently CI-tested on protected master. PR #14 now starts from that **actual** master source, retaining the SHA512-locked nodes7 fork and the original/repaired COTP tests.
- `tools/quality/package-lock.json` was generated from npm registry data by a disposable GitHub-hosted Node 22 workflow. The bootstrap workflow has been removed after recording it. It is verified by ordinary CI `npm ci` on both OSes.
- [PR #10](https://github.com/Missel2/node-red-contrib-s7/pull/10) is already merged and supplies native protocol fixtures. The existing protected `Package dependency smoke` now requires `wire-protocol`, `pinned-nodes7-integration`, **and** `static-quality` on both hosted operating systems. Do not merge PR #14 without a new explicit maintainer approval.

## Boundaries

No runtime behavior or PLC output changes. All future physical tests HIL-S7-001 through HIL-S7-007 remain `PENDING_HARDWARE`; static quality setup is **HIL: not applicable**. A green lint job does not prove correct S7 transport semantics, vendor firmware compatibility, security certification or absence of bugs.

Rollback is reverting this separate CI PR without changing the independent lockfile repair in #12.

## Exact-base selector and post-merge quality proof (2026-11-09)

- Current `master` is `e4f9f6d154c059986517bcfa35ef34d81bcd6c92`, with fixed nodes7 and all five S7Comm protocol files checked in. PR #14 branches off that master via a two-parent history; comparing the wrong historical Git merge-base falsely selected eight unrelated existing protocol files. The `check-changed-format.cjs` checker now uses `GITHUB_EVENT_PATH`'s **immutable `pull_request.base.sha`**, refuses bad SHA/non-ancestor inputs and diffs actual changed source against that base. This allows pre-existing unformatted code to remain documented debt without silently treating future new files as exempt.
- After correcting a Prettier formatting error inside the checker itself, candidate source SHA `294943df5717adac05cab540bf6d092eb83fb712` passed [Verification 42612030118](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42612030118) and [NPM lockfile reproducibility 42612029945](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42612029945), **19/19 GitHub checks success**, including JavaScript/TypeScript, Actions and Python CodeQL. Protected package smoke now gates `wire-protocol`, `pinned-nodes7-integration`, and `static-quality` on both hosted OSes.
- No runtime source changes were made. TypeScript diagnostics are deliberately advisory; `tsc` exit status is not a strict pass. Human authorization to merge this PR has **not** been granted; any updated doc commit needs a fresh exact-head validation.

## Release packaging check — no publication (2026-11-09)

- `npm pack --dry-run --json` is executed in the already protected `Package dependency smoke (Ubuntu, Node 22)` job. `tools/quality/check-package-files.cjs` verifies the actual archive manifest contains `LICENSE`, `package.json`, `red/s7.js`, `red/s7.html`, `red/locales/en-US/s7.json` and `src/tools.js`, **and excludes every `tools/quality/` file**.
- The small `.npmignore` applies only to `tools/quality/`: the isolation/lockfile/linter/test utility remains available from Git, but not in a future package tarball. Other historically shipped docs/tests were not reformatted, moved or silently excluded by this PR.
- The verifier executes a **deliberately bad manifest injection** containing `tools/quality/package-lock.json` and must reject it; this is a real negative control, not a logging-only warning.
- On source commit `cfa1eaeff67a88d4cbd3a3d32ecdfdc4fedf98df`, hosted [Verification 42613182501](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42613182501) completed successfully; the actual protected package-smoke log contains `PACKAGE_MANIFEST_PASS: Node-RED runtime present, CI quality tools excluded, negative control red`. [NPM lock workflow 42613182472](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42613182472) was successful; **19/19 check runs** success including CodeQL, all cross-platform lint, real S7Comm/wrapper and COTP tests.
- **No package was published or deployed.** This does not constitute a release-readiness determination: original docs, tests and other CI metadata may still be in package artifacts and deserve a dedicated later packaging policy review. No hardware/Siemens compatibility claim.
- Following docs-only changes require **fresh exact-head checks**. PR #14 remains a DRAFT pending independent human merge permission.


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
