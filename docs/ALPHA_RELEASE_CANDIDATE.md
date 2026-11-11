# Alpha candidate: package and release evidence

**Status (2026-11-11):** wrapper packaging [PR #43](https://github.com/Missel2/node-red-contrib-s7/pull/43), read-only preflight [PR #44](https://github.com/Missel2/node-red-contrib-s7/pull/44) and the published nodes7 npm-alias integration [PR #46](https://github.com/Missel2/node-red-contrib-s7/pull/46) are **all merged**. Protected `master` `f7da551c770aee7074f94233e55bc04445ff4bec` had **27/27 successful GitHub check runs**. These are source-revision-specific software results; the wrapper has **not been staged or published**. Neither this document nor [release preflight](RELEASE_PREFLIGHT.md) nor the [manual decision gate](RELEASE_STAGE_DECISION.md) grants any registry, release, deployment or hardware operation.

## Identity and compatibility

- Proposed npm name: `@missel2/node-red-contrib-s7`, version `0.1.0-alpha.1`, distribution tag `alpha` (never `latest` for this candidate).
- This is an independently maintained GPL-3.0-or-later fork of the original ST-One node package; preserve upstream credits and license.
- Tested software environment: unmodified Node-RED 5.0.9, Ubuntu 24.04 / Windows 2025, Node.js 22 / 24 in hosted CI. **No other platform, CPU firmware, production environment or write behavior is asserted compatible.**
- The Node-RED node types remain `s7 endpoint`, `s7 in`, `s7 out`, `s7 control`; an original S7 node package and this fork **must not be enabled together in one Node-RED runtime** due to type collisions.
- The candidate now installs the exact independent `@missel2/nodes7@0.1.0-alpha.1` npm release through the legacy `@st-one-io/nodes7` alias, with a SHA-512 lockfile pin, preserving current import paths. This replaces the historical GitHub archive dependency. Clean/consumer installation and unmodified Node-RED 5.0.9 runtime tests passed cross-platform CI on the merged integration; any new release-candidate commit must pass again before a staging decision.
- `@missel2/nodes7@0.1.0-alpha.1` is published under npm's `alpha` tag. Its `latest` tag still resolves to the public `0.0.0-stage` placeholder; this PR does not modify any npm dist-tags. The separate wrapper package `@missel2/node-red-contrib-s7@0.1.0-alpha.1` remains unpublished and independently gated.

## Package boundary and qualification

The npm `files` allowlist permits only `red/`, `src/` plus npm's mandatory metadata/README/license entries. Tests, documentation archives, internal tooling, workflow configuration, fixtures and runtime-lab dependencies must not be bundled.

The preflight must:
1. Build with `npm pack --ignore-scripts` from the exact tested commit.
2. Verify the returned filename, package name/version, allowed file paths and SHA-512 integrity.
3. Install that exact tarball into the unmodified disposable Node-RED runtime **in both locked and normal consumer modes**; compare the protocol dependency source and integration behavior.
4. Pass cross-platform S7Comm synthetic wire/timeout/reconnect tests, original-red/candidate-green, static quality and CodeQL.
5. Archive non-identifying tarball SHA-256, lock hash, source SHA, Node/OS matrix, test result and a dependency/license list. Do not upload non-synthetic operational data.
6. Independently review the package contents, manifest, README, provenance metadata and public source history for disclosure risks **before any publish action**. The public CI check does not replace a private pre-push disclosure review.

## Human release gate

Current `master` does **not** contain an npm publish, npm stage, dist-tag, tag-triggered release or deployment workflow. Merged PR #44 provides **read-only** SBOM/archive evidence. A **later distinct**, separately approved release workflow may add OIDC trusted publishing with stage-only permission; npm provenance applies only to an actual supported trusted publication. Verify npm account ownership and handle first-package bootstrap explicitly: trusted publisher registration may require the package to exist first; do not assume that this candidate or its metadata creates an npm package. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/). Prepare the external npm account/scope settings only as a separate human decision. Prevent inadvertent `latest` tagging.

No hardware access follows from successful software CI. Future physical read-only results must be explicitly authorized, recorded in a private evidence store and summarized publicly only after independent sanitization. Write tests remain a distinct, separately approved safety boundary.

Before the first stage, independently approve the exact post-merge release commit, review archive/SBOM/hashes and registry identity, then record an explicit staging authorization using the [decision record](RELEASE_STAGE_DECISION.md). A staging approval does not approve publication; npm's separate stage approval requires 2FA.

The [public disclosure policy](PUBLIC_DISCLOSURE_POLICY.md) was merged in PR #42 on 2026-11-11. Its current-tree coverage does **not** erase historical public Git objects, PR metadata or third-party caches. Complete the confidential historical exposure assessment and owner risk decision separately before any publication.
