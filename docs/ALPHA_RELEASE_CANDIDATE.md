# Alpha candidate: package and release evidence

**Status: unmerged candidate only.** No registry publication, release tag, container build, production installation or real-controller access is authorized by this document.

## Identity and compatibility

- Proposed npm name: `@missel2/node-red-contrib-s7`, version `0.1.0-alpha.1`, distribution tag `alpha` (never `latest` for this candidate).
- This is an independently maintained GPL-3.0-or-later fork of the original ST-One node package; preserve upstream credits and license.
- Tested software environment: unmodified Node-RED 5.0.9, Ubuntu 24.04 / Windows 2025, Node.js 22 / 24 in hosted CI. **No other platform, CPU firmware, production environment or write behavior is asserted compatible.**
- The Node-RED node types remain `s7 endpoint`, `s7 in`, `s7 out`, `s7 control`; an original S7 node package and this fork **must not be enabled together in one Node-RED runtime** due to type collisions.
- The maintained protocol fork is pinned by commit to a GitHub tarball dependency. Downstream consumers need access to that source at install time. Releasing an independent registry package for the protocol fork is a separate supply-chain decision.
- npm account ownership of the proposed user scope and the package identity must be confirmed by the maintainer. The intended metadata is not evidence that this package exists on npm.

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

This branch does **not** add an npm publish, npm stage, dist-tag, tag-triggered release or environment/deployment workflow. A future distinct release PR must add reviewable OIDC trusted publishing (prefer staged publishing with human approval), provenance and SBOM evidence. Prepare the external npm account/scope settings only as a separate human decision. Prevent inadvertent `latest` tagging.

No hardware access follows from successful software CI. Future physical read-only results must be explicitly authorized, recorded in a private evidence store and summarized publicly only after independent sanitization. Write tests remain a distinct, separately approved safety boundary.

Before first publication, reconcile [public disclosure policy](PUBLIC_DISCLOSURE_POLICY.md) and complete the private historical review. The policy is proposed in a separate pending PR; do not treat it as merged.
