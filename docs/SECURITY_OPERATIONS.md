# Security operations and Dependabot verification (PR #11)

**Current evidence (2026-11-10):** security policy PR #11 merged into protected `master` `f1679ba0670a0511bf0689f917cfd9cc3f307c25` and four Dependabot scopes were processed by GitHub. Actual upstream Node-RED dependency advisories remain and are not automatically remediated. GitHub Security feature toggles require separate administrative verification.

## Host dependency responsibility decision — 2026-11-10

[Security policy/Dependabot PR #11](https://github.com/Missel2/node-red-contrib-s7/pull/11)
was approved and merged into protected master
`f1679ba0670a0511bf0689f917cfd9cc3f307c25`; all 26/26
post-merge check runs passed. The four update scopes were discovered by
GitHub, but a successful updater run did **not** eliminate Node-RED's
transitive security findings.

By explicit maintainer decision, we will **not** patch the Node-RED host or
its bundled dependencies through downstream overrides in this extension,
including the isolated installed-runtime lab. [PR #38](https://github.com/Missel2/node-red-contrib-s7/pull/38)
was **closed without merging**, despite green software CI. Its exploratory
candidate (38 findings) was not representative of an unmodified Node-RED
installation; protected master continues to use the unmodified Node-RED
5.0.9 lab lock with the originally observed 41 advisory findings. Audit
counts vary by lock and date; no claim is made about exploitability of all
deployments. Ownership and user-facing guidance are in
[SECURITY.md](../SECURITY.md#node-red-host-versus-contrib-security).

The proper operational response is to record the exact host dependency path
and advisory conditions, link to [Node-RED's upstream security policy](https://github.com/node-red/node-red/security/policy),
avoid suppressions and false-green claims, and evaluate only **official
upstream releases** as a whole when testing later host versions. Issues
concerning our own S7/nodes7 source are handled independently in this fork.
No private-reporting feature status can be inferred from this document.


## Version-update scopes

| Scope | Manifest | Weekly window (Europe/Berlin) | Handling |
| --- | --- | --- | --- |
| Root npm | `package.json` and `package-lock.json` | Monday 07:00 | Minor/patch grouped, major separate |
| Isolated CI quality npm | `tools/quality/package.json` and its lock | Monday 07:30 | Separate minor/patch grouping; no runtime coupling |
| Installed Node-RED test-lab npm | `test/runtime-lab/package.json` and its lock | Monday 07:45 | Separate minor/patch grouping; manual compatibility review |
| GitHub Actions | `.github/workflows` | Monday 07:15 | Minor/patch grouped, major separate |

Up to five open version-update PRs per configured entry. Actual execution may be delayed by GitHub scheduling. All proposed changes are reviewed by a human, must pass the protected `master` rules and relevant Windows/Linux CI, and **must not be auto-merged**. The `@st-one-io/nodes7` source is pinned to a specific `Missel2/nodes7` codeload Git commit and SHA512 integrity; its update/security posture needs an explicit source review, regenerated lockfile, red/green fault tests and separately authorized integration. Do not treat registry Dependabot PRs as covering this pin automatically.

## GitHub settings that the repository files cannot verify

After an authorized merge, the repository owner should inspect **Settings → Advanced Security** (navigation labels may vary) and record the actual status of private vulnerability reporting, Dependabot alerts, Dependabot security-update PRs, secret scanning and push protection. A policy file and an update schedule do **not** establish that those settings are enabled. If private vulnerability reporting is unavailable, select and publish a verified confidential contact channel before inviting sensitive submissions; never invent an email address or post exploit details publicly.

Inspect the GitHub **Security → Dependency graph/Dependabot** view after the first scheduled run, verifying which manifests are actually discovered, any update errors, grouping, labels and review policies. Validate root npm, CI quality tools, the installed runtime lab and Actions independently. In particular, check the fixed GitHub-archive nodes7 source manually.

## Known test-only dependency security-update blocker (2026-11-10)

The exact protected master after PR #24, `2735621f217ae6372ed689d9a8943cd85c7bed00`, completed its nine mandatory software CI/CodeQL contexts successfully. The independently triggered [Dependabot npm security job #42871743289](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42871743289) failed: overall **23/24** checks were green, while the bot reported `security_update_not_possible` for transitive `multer`, `minimatch` and `undici` in the isolated Node-RED `5.0.9` test toolchain. For `minimatch`, an available resolution would have **downgraded Node-RED to 4.1.8**. The bot rejected the unsatisfactory result. No update was applied.

This PR proposes a **fourth, reviewable version-update scope** for `/test/runtime-lab`. That scope can surface compatible dependency proposals after GitHub processes an approved configuration; it **does not repair the existing security advisories** or guarantee that the separate security updater can solve transitive constraints. Do not force npm overrides, suppress advisories, downgrade the tested Node-RED version, or claim that a successful YAML validator establishes security.

For each subsequent remediation candidate, record the exact affected dependency edge, advisory and patched version, version resolution, source/lockfile changes, license/provenance, and independent hosted Windows/Linux × Node 22/24 installed-runtime tests in both locked and consumer modes. Preserve zero post-stop retries, zero live peers and zero unknown-write replay. Obtain a separate maintainer squash-merge decision. Hardware and production qualification remain separate.

## Automated checks and limits

The hosted `Static quality` jobs run `tools/quality/verify-security-maintenance.cjs` after installing the existing locked quality toolchain. The checker parses YAML through pinned Prettier, confirms four independent ecosystem/directory entries, actual locked npm manifests, independent weekly windows, PR limits and minor/patch groups, and runs deliberate missing-scope, bad-directory, wrong-window and malformed-YAML negative controls. It also asserts that the policy does not claim private reporting is already enabled and preserves the production PLC warning. This check is aggregated into the existing **required** `Package dependency smoke (Ubuntu, Node 22)` gate along with synthetic S7Comm and fixed-fork integration on Windows/Linux.

**Boundary:** A passing local YAML parser is not GitHub's Dependabot server-side validation and is not evidence that alerts, reports or security fixes are enabled. Advisory TypeScript diagnostics are still nonblocking. S7-1200 hardware test cases HIL-S7-001…007 remain PENDING_HARDWARE. No release, installation or physical PLC activity is authorized by this PR.

## Change and acceptance procedure

For any Dependabot PR: identify old/new package versions or action SHAs; scrutinize manifest and integrity changes; confirm compatibility with Node-RED, Node.js and the pinned S7 protocol fork; inspect license and security changes; run all required checks on the exact head; check comments/CodeQL/ruleset; and obtain separate human merge authorization. Dependabot automation itself must not publish packages or deploy to OT systems.

**Historical implementation source evidence (pre-runtime-lab master):** [Verification run 42685891575](https://github.com/Missel2/node-red-contrib-s7/actions/runs/42685891575) on `2f437f4f7d34824619d17ffbc65dec58c85cca4b` returned 17/17 successful exact-source checks with both `SECURITY_CONFIG_PASS` messages. This documentation commit is a new revision and requires its own exact-head CI before any merge decision.
