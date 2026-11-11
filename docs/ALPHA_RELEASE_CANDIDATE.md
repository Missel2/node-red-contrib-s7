# Alpha candidate: package and release evidence

**Status: wrapper packaging merged in PR #43; no wrapper npm release. The nodes7 dependency is independently published on npm and this proposed integration PR is not yet merged.** Protected `master` includes the scoped alpha metadata and previously passed 22/22 post-merge checks. This document and the separate [release preflight](RELEASE_PREFLIGHT.md) do not authorize any registry staging, publication, release tag, container build, production installation or real-controller access.

## Identity and compatibility

- Proposed npm name: `@missel2/node-red-contrib-s7`, version `0.1.0-alpha.1`, distribution tag `alpha` (never `latest` for this candidate).
- This is an independently maintained GPL-3.0-or-later fork of the original ST-One node package; preserve upstream credits and license.
- Tested software environment: unmodified Node-RED 5.0.9, Ubuntu 24.04 / Windows 2025, Node.js 22 / 24 in hosted CI. **No other platform, CPU firmware, production environment or write behavior is asserted compatible.**
- The Node-RED node types remain `s7 endpoint`, `s7 in`, `s7 out`, `s7 control`; an original S7 node package and this fork **must not be enabled together in one Node-RED runtime** due to type collisions.
- The candidate now installs the exact independent `@missel2/nodes7@0.1.0-alpha.1` npm release through the legacy `@st-one-io/nodes7` alias, with a SHA-512 lockfile pin, preserving current import paths. This replaces the historical GitHub archive dependency. Consumer installation and actual Node-RED runtime compatibility must pass cross-platform CI on this PR before any wrapper merge or release.
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

This branch does **not** add an npm publish, npm stage, dist-tag, tag-triggered release or environment/deployment workflow. A separate read-only release-preflight PR prepares SBOM and archive evidence. A **later distinct** release PR must add reviewable OIDC trusted publishing with stage-only permission and human approval; npm provenance applies only to an actual supported trusted publication. Verify npm account ownership and handle first-package bootstrap explicitly: trusted publisher registration may require the package to exist first; do not assume that this candidate or its metadata creates an npm package. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/). Prepare the external npm account/scope settings only as a separate human decision. Prevent inadvertent `latest` tagging.

No hardware access follows from successful software CI. Future physical read-only results must be explicitly authorized, recorded in a private evidence store and summarized publicly only after independent sanitization. Write tests remain a distinct, separately approved safety boundary.

The [public disclosure policy](PUBLIC_DISCLOSURE_POLICY.md) was merged in PR #42 on 2026-11-11. Its current-tree coverage does **not** erase historical public Git objects, PR metadata or third-party caches. Complete the confidential historical exposure assessment and owner risk decision separately before any publication.
