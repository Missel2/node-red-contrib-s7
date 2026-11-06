# Repository administration checklist

**Status checked:** 2026-11-06. These are GitHub UI settings, not modifications that this repository file automatically enforces.

## Observed at initial setup

- GitHub Actions is enabled and PR-triggered workflow runs were observed.
- The default branch is `master`. It was reported as **not protected** at the fork baseline.
- GitHub Issues is **disabled** (attempt to create the first engineering issue returned HTTP 410).
- No npm publishing or OT deployment workflow has been added.
- This assistant's available GitHub integration cannot change repository feature flags or branch-protection rulesets.

## Required one-time action for the human maintainer

1. **Enable Issues:** Repository → Settings → General → Features → Issues. Then transfer WI-002, WI-003 and WI-004 from [WORK_INDEX.md](WORK_INDEX.md) into Issues. Check for duplicates first.
2. **Protect master:** Repository → Settings → Rules → Rulesets (or Branch protection) → target `master`. Require pull requests and the validated CI checks from `.github/workflows/verification.yml`; disallow force pushes and deletion. Confirm the rule is active with a safe test PR.
3. **Set review policy suitable for a solo maintainer:** PRs created through the Missel2 account cannot be formally approved by the same account as an independent reviewer. Do not configure a required GitHub approving review without a second eligible reviewer, or the sole-maintainer workflow may deadlock. The human owner should still make an explicit merge decision after reviewing the PR and CI. A second independent reviewer can be introduced later.
4. **Keep workflows least-privileged:** The first workflow requests `contents: read`, uses no production secrets and neither publishes packages nor accesses PLC networks.
5. **Avoid auto-publishing:** Do not enable unattended npm package publishing or production OT deployments merely because a pull request passes CI.

## Suggested required checks

The current workflow job names (confirm in the GitHub Rules UI, as names may change):
- `Wrapper contract (ubuntu-24.04, Node 22)`
- `Wrapper contract (ubuntu-24.04, Node 24)`
- `Wrapper contract (windows-2025, Node 22)`
- `Wrapper contract (windows-2025, Node 24)`
- `Baseline must fail stale-read regression`
- `Package dependency smoke (Ubuntu, Node 22)`

These checks verify the wrapper and package smoke gates only. They do **not** yet establish S7 wire-protocol simulation, packet-error handling in nodes7 or Siemens hardware compatibility.

## Ongoing gate improvements

- Generate a correct npm lockfile and enforce `npm ci` before qualifying a release.
- Add disposable S7 wire-protocol fixtures, fault injection and redacted logs on public hosted runners.
- Add dependency advisory triage and security disclosure workflows without exposing plant data.
- Consider branch rule adjustments only after reviewing CI behavior and avoiding single-maintainer review deadlocks.
