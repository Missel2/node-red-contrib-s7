# Alpha release preflight (NO publication)

This checklist documents the **read-only pre-publication gate**, not release authorization. The first `@missel2/node-red-contrib-s7@0.1.0-alpha.1` has since been **published** under `alpha`; exact source/registry/archive and independent post-release evidence are in [the alpha.1 release record](ALPHA1_RELEASE_EVIDENCE.md). The tested package identity was merged on protected `master` in PR #43 at `21a46dda0b6a9a57acfd53f4869a8ed31df710af`.

## Current automated evidence

[Release preflight](../.github/workflows/release-preflight.yml) runs on GitHub-hosted Ubuntu with `contents: read` only. It has no `id-token: write`, stored npm credentials, staging action, publish command, deployment connection or physical controller access.

The workflow (including the merged npm-alias migration in PR #46):

1. Checks out the exact source commit, installs the production dependency tree with scripts disabled, and runs fail-closed release identity and archive tests.
2. Executes `npm pack --ignore-scripts`. Enforces the alpha scope/version, tag, `red/` / `src/` allowlist, required Node-RED editor files, actual archive listing and matching SHA-1 (npm metadata), SHA-256 and SHA-512 checksums.
3. Produces **lockfile-derived** SPDX and CycloneDX SBOMs with `npm sbom --package-lock-only --omit=dev` and verifies that the exact root and production dependencies are listed.
4. Verifies installed production dependency names, versions, declared GPL license identifiers and presence of a license file. This is **metadata and file-presence evidence**, not a legal opinion or substitute for examining corresponding-source obligations.
5. Uploads a concise manifest, `pack.json` and both SBOM documents for review with a short retention period. **The installable npm tarball is never uploaded by this workflow.**

The manifest records source commit, package/archive hashes, SBOM hashes, tool versions, lock hash, licenses and explicit no-publish status. An npm package SBOM generated from the lockfile does not by itself establish that the bytes inside a tarball have been audited. The tarball/metadata comparison and manual inspection are distinct checks. CI pass does not establish security certification, absence of vulnerabilities, complete copyright compliance or physical Siemens CPU support.

The standalone workflow completed successfully on `master` `f7da551c770aee7074f94233e55bc04445ff4bec` ([run 43025921248](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43025921248)) and remains **outside the nine directly required `protect-master` contexts**. Before releasing, require a fresh green preflight on the immutable release candidate and assess whether to make it a required status check in a separate repository-administration decision. This documentation change does not modify branch protection.

For the exact pre-stage decision, gate order, registry placeholder effect and post-stage verification procedure, use [the stage decision record](RELEASE_STAGE_DECISION.md). This is a checklist only; no npm write action is authorized.

## Separate manual gates before *any* npm stage or publish operation

- **Public disclosure:** Review the current source, README, package metadata, archive files, license and SBOM in a controlled environment. Complete the separate owner risk assessment for historical Git objects, issue/PR metadata and third-party copies. Do **not** add confidential indicator words, private allow/deny lists, internal URLs or real network logs to this public repository.
- **Package rights:** Confirm npm account ownership, maintain original author/credit and GPL-3.0-or-later source/license obligations, and inspect all upstream source and dependency notices. A green metadata check is not proof of all obligations.
- **Supply chain:** Confirm that npm serves `@missel2/nodes7@0.1.0-alpha.1` with the exact known SHA-512 tarball integrity, that the lockfile uses the deliberate `@st-one-io/nodes7` npm alias, and that the installed package's actual `package.json` reports `@missel2/nodes7`. Reproduce clean `npm ci` on both hosted platforms, test real Node-RED installed-runtime behavior and synthetic protocol faults; verify the declared `iso-on-tcp` runtime dependency independently. The old GitHub tarball is not the candidate source.
- **Behavioral claims:** Record the exact software testing matrix; do not claim physical CPU verification or hardware read/write safety on the strength of synthetic S7Comm or Node-RED CI.
- **Approval:** Require explicit maintainer approval for merging this preflight PR, and **another independent approval** for first staging and first public release. No automatic publishing, deployment or PLC connection.

## Historical first-stage procedure — executed externally, not by this workflow

npm staged publishing (`npm stage publish`) requires npm CLI 11.15+ and Node.js 22.14+; approval is performed by a maintainer with 2FA. For a never-published package, **staging itself publishes a publicly visible placeholder version `0.0.0-stage`**. Therefore staging must never be treated as a private/no-impact check and requires prior explicit approval.

After the package exists, configure a GitHub Actions **stage-only** trusted publisher in npm's package settings. Use an approved GitHub-hosted workflow with OIDC (`id-token: write`) only in a distinct, deliberately triggered release PR/workflow. No direct `npm publish` grant or npm dist-tag permission is necessary for the initial staging design. With a properly connected public GitHub-hosted trusted publisher, npm can generate provenance on publication. Do not claim signed provenance before it exists.

A staged alpha must be separately reviewed and approved with the maintainer's 2FA. Only that approval makes `0.1.0-alpha.1` public. Pin the `alpha` dist-tag; never use `latest` for this prerelease. Test real package installation only after publication, with isolated disposable Node-RED and synthetic protocol peers.

**Rollback/limitation:** a completed npm publication cannot be undone as though no release occurred. A rejection before stage approval leaves the public placeholder for a first-time package; assess those effects before starting staging.

Official reference: [npm staged publishing](https://docs.npmjs.com/staged-publishing/), [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm SBOM](https://docs.npmjs.com/cli/commands/npm-sbom/).

HIL applicability: not applicable to CI/release evidence only; physical hardware test debt remains unchanged.
