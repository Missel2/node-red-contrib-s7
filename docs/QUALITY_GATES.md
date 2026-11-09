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
