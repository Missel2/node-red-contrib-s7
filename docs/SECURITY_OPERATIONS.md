# Security operations and Dependabot verification (PR #11)

**State (2026-11-09): proposed on [PR #11](https://github.com/Missel2/node-red-contrib-s7/pull/11), not active on protected `master` until approved and merged.** Source baseline `7ef9ef5bbb8827fd56bcddad7260232f9bfbc9aa`. This is an operations checklist, not evidence of currently enabled GitHub security features.

## Version-update scopes

| Scope | Manifest | Weekly window (Europe/Berlin) | Handling |
| --- | --- | --- | --- |
| Root npm | `package.json` and `package-lock.json` | Monday 07:00 | Minor/patch grouped, major separate |
| Isolated CI npm | `tools/quality/package.json` and its lock | Monday 07:30 | Separate minor/patch grouping; no runtime coupling |
| GitHub Actions | `.github/workflows` | Monday 07:15 | Minor/patch grouped, major separate |

Up to five open version-update PRs per configured entry. Actual execution may be delayed by GitHub scheduling. All proposed changes are reviewed by a human, must pass the protected `master` rules and relevant Windows/Linux CI, and **must not be auto-merged**. The `@st-one-io/nodes7` source is pinned to a specific `Missel2/nodes7` codeload Git commit and SHA512 integrity; its update/security posture needs an explicit source review, regenerated lockfile, red/green fault tests and separately authorized integration. Do not treat registry Dependabot PRs as covering this pin automatically.

## GitHub settings that the repository files cannot verify

After an authorized merge, the repository owner should inspect **Settings → Advanced Security** (navigation labels may vary) and record the actual status of private vulnerability reporting, Dependabot alerts, Dependabot security-update PRs, secret scanning and push protection. A policy file and an update schedule do **not** establish that those settings are enabled. If private vulnerability reporting is unavailable, select and publish a verified confidential contact channel before inviting sensitive submissions; never invent an email address or post exploit details publicly.

Inspect the GitHub **Security → Dependency graph/Dependabot** view after the first scheduled run, verifying which manifests are actually discovered, any update errors, grouping, labels and review policies. Validate root npm, isolated tools and Actions independently. In particular, check the fixed GitHub-archive nodes7 source manually.

## Automated checks and limits

The hosted `Static quality` jobs run `tools/quality/verify-security-maintenance.cjs` after installing the existing locked quality toolchain. The checker parses YAML through pinned Prettier, confirms three separate directory/ecosystem entries, schedules, PR limits and minor/patch groups, and runs deliberately broken-scope and malformed-YAML negative controls. It also asserts that the policy does not claim private reporting is already enabled and preserves the production PLC warning. This check is aggregated into the existing **required** `Package dependency smoke (Ubuntu, Node 22)` gate along with synthetic S7Comm and fixed-fork integration on Windows/Linux.

**Boundary:** A passing local YAML parser is not GitHub's Dependabot server-side validation and is not evidence that alerts, reports or security fixes are enabled. Advisory TypeScript diagnostics are still nonblocking. S7-1200 hardware test cases HIL-S7-001…007 remain PENDING_HARDWARE. No release, installation or physical PLC activity is authorized by this PR.

## Change and acceptance procedure

For any Dependabot PR: identify old/new package versions or action SHAs; scrutinize manifest and integrity changes; confirm compatibility with Node-RED, Node.js and the pinned S7 protocol fork; inspect license and security changes; run all required checks on the exact head; check comments/CodeQL/ruleset; and obtain separate human merge authorization. Dependabot automation itself must not publish packages or deploy to OT systems.

**Implementation source evidence:** [Verification run 42685891575](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42685891575) on `2f437f4f7d34824619d17ffbc65dec58c85cca4b` returned 17/17 successful exact-source checks with both `SECURITY_CONFIG_PASS` messages. This documentation commit is a new revision and requires its own exact-head CI before any merge decision.
