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

- This PR is stacked on [PR #12](https://github.com/Missel2/node-red-contrib-s7/pull/12) so the main Node dependencies are installed with `npm ci`.
- `tools/quality/package-lock.json` was generated from npm registry data by a disposable GitHub-hosted Node 22 workflow. The bootstrap workflow has been removed after recording it. It is verified by ordinary CI `npm ci` on both OSes.
- Merge #12 only after explicit maintainer approval, then retarget/revalidate this PR. Follow it with #10 (wire-protocol fixture), reconciling its protected package-smoke dependency with this quality gate.

## Boundaries

No runtime behavior or PLC output changes. All future physical tests HIL-S7-001 through HIL-S7-007 remain `PENDING_HARDWARE`; static quality setup is **HIL: not applicable**. A green lint job does not prove correct S7 transport semantics, vendor firmware compatibility, security certification or absence of bugs.

Rollback is reverting this separate CI PR without changing the independent lockfile repair in #12.
