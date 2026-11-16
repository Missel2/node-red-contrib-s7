# Contrib alpha.2: manual npm publication via GitHub Actions

**Status 2026-11-16:** source-only alpha.2 merged in [PR #54](https://github.com/Missel2/node-red-contrib-s7/pull/54). The independent manual publisher is proposed in [PR #55](https://github.com/Missel2/node-red-contrib-s7/pull/55), not yet merged or dispatched. A source merge cannot publish to npm. Published Contrib alpha.1 remains unchanged.

## One-time GitHub/npm setup

1. GitHub repository Settings → Environments: create **npm-release**, restrict deployment branches to protected **master**. Required reviewers are optional, but add another click.
2. npmjs.com → package **@missel2/node-red-contrib-s7** → Settings → Trusted Publishers → GitHub Actions. Select user **Missel2**, repository **node-red-contrib-s7**, workflow filename **npm-publish-alpha2-manual.yml**, environment **npm-release**. Allow npm publish, but not npm dist-tag. This is independent from the Trusted Publisher configured for @missel2/nodes7.
3. Do not create or supply an npm token, password or OTP to CI. Publishing uses GitHub Actions short-lived OIDC only. Inspect npm Staged Packages for any existing unpublished alpha.2 candidate; a public registry lookup cannot reveal staged state.
4. Source-only PR #55 requires a human-authorized squash merge followed by full post-merge GitHub Actions. Neither merging nor a successful CI check authorizes publication.

## One deliberate dispatch

GitHub → repository Actions → **npm publish Contrib alpha2 (manual)** → Run workflow → branch **master** → operation **verify** (default, no npm write) or **publish** (public npm alpha.2).

No push, pull request, tag or schedule automatically publishes. A publish operation checks protected master exact SHA, active ruleset, all required CI, exact manifest and lock, public-version absence, GPL metadata, and byte-for-byte identical npm archives from GitHub-hosted Windows and Linux. The final publisher rebuilds the local archive, compares both SHA-256 and SHA-512 against two independent builds, and uses pinned npm 11.15.0 with provenance.

The public command uses the explicit relative archive spec:

    npm publish ./publish-evidence/missel2-node-red-contrib-s7-0.1.0-alpha.2.tgz --tag=alpha --access=public --provenance --ignore-scripts --registry=https://registry.npmjs.org/

The leading **./** matters: without it npm can misinterpret the tarball argument. The workflow performs an exact dry-run first; this does not establish Trusted Publisher authorization.

## Post-publication and rollback

Independently inspect the public npm package, alpha tag, unchanged latest placeholder, downloaded tarball SHA-256/SHA-512, provenance, and actual unmodified Node-RED installations on Windows/Linux. A failed job may still have published successfully; inspect public npm registry and staged candidates before any retry. A released npm version cannot simply be overwritten; publish a reviewed successor instead.

No live PLC, port 102, production Node-RED installation, GitOps deployment or physical Siemens HIL activity is involved. HIL-S7-001..007 remain PENDING_HARDWARE. The library alpha.2 multi-PDU write fix changes actual bytes written versus the older truncation bug, and ambiguous lost write acknowledgments must never be automatically replayed.

References: [candidate release evidence](ALPHA2_RELEASE_CANDIDATE.md), [dependency evidence](NODES7_ALPHA2_DEPENDENCY_QUALIFICATION.md), [manual admission tests](../test/release/manual-alpha2-release-guard.test.cjs).

AI-assisted source implementation; separate human decisions for merges and npm publication.
