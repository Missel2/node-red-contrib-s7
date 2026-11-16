# Contrib 0.1.0-alpha.2 — immutable source and packaging candidate

**State (2026-11-16):** [Draft PR #54](https://github.com/Missel2/node-red-contrib-s7/pull/54), source-only, NOT merged and NOT published to npm. The predecessor `@missel2/node-red-contrib-s7@0.1.0-alpha.1` was publicly published on 2026-11-11 and remains **immutable**. The proposed `alpha.2` is a *new* scoped version; its publication, npm tag, GitHub Release, deployment and real-hardware testing each require separate maintainer decisions. Do not reuse the published alpha.1 version.

## Immutable input and selected candidate

| Item | Grounded input / target |
| --- | --- |
| Contrib baseline | protected `master` `8ca11b75a5e3bf46202dbb1ea42b9fda23fbd369` after human-approved #53 squash |
| Proposed Contrib identity | `@missel2/node-red-contrib-s7@0.1.0-alpha.2` (source only) |
| npm publishConfig | `access=public`, `tag=alpha` (metadata; publishing is NOT triggered) |
| Direct legacy dependency alias | `@st-one-io/nodes7 → npm:@missel2/nodes7@0.1.0-alpha.2` |
| Published nodes7 source | protected library source `8c20db1db83ebc687cef280f589f22052825e909`, [approved npm publication #43751615794](https://github.com/Missel2/nodes7/actions/runs/43751615794) |
| Published nodes7 tarball SHA-256 | `11327c208ad99dae5eca2fd4a6fd9a83e17637b8eb4ad1f2018c6ba98bd6c81e` |
| Exact locked nodes7 SHA-512 | `sha512-4Lmejz+WT5YOLHBXfdSForyHltgct5A9J1indi0Q/sxZKpGIY2omRrjSMRU6fKeW6YDAb+jwAjjEz7hQE/Z9pQ==` |
| Additional runtime dependency | `iso-on-tcp@0.1.0` in the production lock, unchanged |
| Node-RED installed-runtime fixture | **unmodified upstream Node-RED 5.0.9** and untouched test-only manifest/lock |
| Existing public Contrib `alpha.1` | unchanged tarball and historical `nodes7@alpha.1` dependency |
| Unqualified npm `latest` | currently reserved for `0.0.0-stage`; do not move it |
| Candidate release archive digest | **Not selected until final exact-head and actual post-merge archived pack proof** |

The published library `alpha.2` was independently downloaded and hashed on Ubuntu and Windows in [public registry consumer CI #43753322544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43753322544), subsequently also verified on protected wrapper master. These are public package-byte proofs, not physical Siemens hardware evidence or complete verification of the npm Sigstore signature bundle.

## Test-first source identity

[Original-red read-only release-preflight run #43817618927](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43817618927) on PR #54's first test-only source `12d912fa4fdf91d3c69b1f9511a28009ca475049` deliberately failed the new immutable-version assertion (`alpha.1` actual versus `alpha.2` expected) while the existing six preflight tests passed. The subsequent source/package/lock/preflight candidate bump is required to turn this same test green. A failing test is not a release blocker once the corrected exact-head CI is green and the original-red evidence remains preserved.

## Required proof before source merge

1. Run exact PR-head release-preflight and negative admission controls; identity, `npm pack --ignore-scripts`, SHA-1/256/512, SPDX/CycloneDX SBOM, GPL licenses, exact package file allowlist, source SHA and lockfile digest. Only safe metadata/JSON is archived — **never the tarball itself**.
2. Run independent npm archive builds on **GitHub-hosted Ubuntu 24.04 and Windows 2025, Node 22.23.4**. Compare source commit, package/lock hashes, exact compressed byte count and SHA-256/SHA-512 integrity in a separate fail-closed job. Differences must be resolved, not excused.
3. Before source merge (PR context only), read the actual public npm registry and prove `0.1.0-alpha.2` does **not** exist; `alpha` still references published wrapper `alpha.1` and `latest` remains `0.0.0-stage`. Registry failures are **unknown**, not proof of absence. Repeat public-version collision check immediately prior to any later publish action.
4. Pass the entire hosted Windows/Linux Node 22/24 matrix against actual installed wrapper tarball and real unmodified upstream Node-RED 5.0.9, synthetic TCP/COTP/S7Comm read/write and lifecycle/fault/recovery, static quality, CodeQL and **all 9/9 strict protected-master checks**. Capture concrete exact-head CI URLs and review threads.
5. Require an explicit human source-only squash-merge approval, then independent actual protected-master post-merge CI and **rebuild/package digest**. A successful PR check is not an actual master release artifact.

## Next distinct npm publication gate (not in this PR)

After source merge and source-owner approval, prepare an independent one-dispatch **manual GitHub Actions** verified-archive publish workflow with no publishing on push, PR, tag, release or schedule. Preferred method: npm OIDC Trusted Publisher for the exact repository and workflow, an `npm-release` GitHub Environment restricted to protected `master`, `id-token: write` ONLY for the guarded publish job, explicit `operation=publish`, package collision checked twice, pinned archive checksum, `--tag=alpha --access=public --provenance --ignore-scripts`, and a path beginning with `./` so npm recognizes the local tarball. The human owner configures npm Trusted Publishing, authorizes the actual public registry write and decides whether to release. **No npm token or publishing credentials are introduced in this candidate.**

After a successful new public publication, independently verify public npm packument/tag, downloaded exact archive SHA-256/SHA-512, provenance bundle trust policy and clean unmodified Node-RED installs on both operating systems. Neither release provenance recorded in a publish log nor a local `npm pack` test substitutes for those post-publication checks.

## Behavior, HIL and rollback boundary

No `red/`, `src/`, production S7 semantics, Node-RED host lock, user-facing flow format or Node-RED node type names change in this source-only version bump. This is packaging/version metadata for an already qualified library dependency. The upstream **nodes7 alpha.2** fixes formerly incomplete multi-PDU writes, which can write more of the caller-requested memory than the earlier silent truncation. Lost acknowledgments can leave an unknown write outcome; no automatic replay is permitted. The wrapper's optional `boundedWrites` profile stays disabled by default.

**HIL applicability:** packaging CI itself cannot exercise real PLCs; HIL-S7-001/002/003/004/005/006/007 remain `PENDING_HARDWARE` for the future integration/release. No CPU, firmware, isolated scratch DB, write authorization or physical network has been exercised here. Do not present green software fixtures as hardware or safety certification.

**Rollback:** before source merge, close PR #54; after source merge, use an independently reviewed revert, then rerun all Windows/Linux checks. Once a distinct npm version is published, never rewrite or silently reuse its bytes — publish a later version after separate human approval.

**Disclosure and authorship:** AI-assisted source packaging and evidence work for maintainer review, synthetic public metadata only, no credentials, private environment/industrial identifiers or hardware captures. Repository history and public descriptions still require a separate owner-side confidentiality review before actual publication.
