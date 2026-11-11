# First independent alpha release — immutable evidence record

**Release status: published on npm on 2026-11-11.** This records already completed actions; it grants **no** authorization for a new npm release, a GitHub Release, any dist-tag change, deployment, real controller access or future hardware writes.

| Identity | Published value |
| --- | --- |
| Package | `@missel2/node-red-contrib-s7` |
| Version | `0.1.0-alpha.1` |
| npm dist-tag | `alpha` |
| Unqualified `latest` | `0.0.0-stage` (public first-stage placeholder, **not this fork's working alpha**) |
| Original staging source SHA | `952f5881f2f83a0923ecdd380d9d59c945d7095d` |
| Stage ID | `fe4cdcda-ccfe-4958-89a5-371458e7312e` |
| Archive SHA-1 | `03085bab0e75a2065398b795cce7c4e881eb79b2` |
| Archive SHA-256 | `310798891f65201267bcfbdfc16a7145f953d36ada89f5f2992746b257a5e40b` |
| Archive SHA-512 integrity | `sha512-uXJpLOQLQ0hlUfWeFF+q4pswN3KWK+kKjzEP/rKn4DQ9P/xDS1uec74qBHWPi6kdJfUfkFRDFzCU2ETm3a8jzA==` |
| Contents | 8 files; 39,672 compressed bytes |
| Production nodes7 dependency | `@st-one-io/nodes7` npm alias → `@missel2/nodes7@0.1.0-alpha.1` |

## Independent evidence chain

1. **Protected source/release preparation:** [PR #43](https://github.com/Missel2/node-red-contrib-s7/pull/43) set the scoped alpha identity; [PR #44](https://github.com/Missel2/node-red-contrib-s7/pull/44) prepared read-only hash/license/SBOM evidence; [PR #46](https://github.com/Missel2/node-red-contrib-s7/pull/46) replaced the GitHub dependency archive with the immutable published nodes7 npm alias.
2. **Pre-publication exact bytes:** [GitHub preflight run 43030099514](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43030099514) recorded the approved archive. Ephemeral Kubernetes Node 22.23.4 / npm 10.9.9 checks reproduced the exact archive SHA-256 after correcting file-mode `0600` vs `0644`. No package source was modified to force a digest match.
3. **Distinct human gates:** npm first stage was explicitly approved; npm assigned the above Stage ID and public `0.0.0-stage` placeholder. The maintainer subsequently authorized and completed the separate npm Stage **Approve** action, as reported in the release discussion. No CI token, npm publishing workflow or automatic dist-tag update was used.
4. **Independent public npm verification:** [PR #48](https://github.com/Missel2/node-red-contrib-s7/pull/48) verifies public registry metadata, exact downloaded tarball SHA-256, SHA-1/SHA-512 integrity, all eight archive assets, `alpha`/`latest` tags, published nodes7 alias SHA-512, and clean installation in a disposable **unmodified upstream Node-RED 5.0.9** consumer on Ubuntu 24.04 and Windows 2025 with Node 22.23.4. [PR-head consumer CI 43087914580](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43087914580) and [verification 43087914451](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43087914451) were green; PR #48 was approved and squash-merged into protected `master` `c3cc560d5aef7fb5046276792e0f0d17606c2032`. The post-merge CI must be assessed separately for that commit; do not reuse earlier green CI as a different commit's proof.
5. **Unmodified npm artifact:** Documentation changes made **after publication** update the GitHub repository only. The immutable `alpha.1` tarball contains the historical README/status text packed at the original commit; we cannot retroactively change its bytes. Correcting the npm tarball would require a **new package version and new authorization**, not overwriting the published artifact.

## Consumer-facing usage and limits

```sh
npm install @missel2/node-red-contrib-s7@0.1.0-alpha.1
```

Use this only in a disposable test environment. The published fork retains Node-RED node types `s7 endpoint`, `s7 in`, `s7 out`, `s7 control` and **must not** be loaded alongside the upstream `node-red-contrib-s7` package in one Node-RED runtime due to duplicate names. The separate Node-RED host remains upstream-managed; its transitive advisories are outside this fork's patch scope. Software loopback/S7Comm and installed-host tests **do not validate physical Siemens S7-1200 hardware, CPU firmware, safety or production suitability**. All HIL-S7-* cases remain `PENDING_HARDWARE`. The opt-in boundedWrites profile is disabled by default and does not imply a globally bounded nodes7 internal queue.

There is **no GitHub Release object** corresponding to this npm alpha at the time this record was prepared. Publishing a GitHub Release or creating an immutable tag requires independent maintainer review, accurate source/tag linkage and approval; **this PR creates neither**.

## Maintenance and next gates

- [Shared roadmap #21](https://github.com/Missel2/node-red-contrib-s7/issues/21): completed initial npm publication, independent consumer evidence and future supply-chain gates.
- [nodes7 fault/queue qualification #16](https://github.com/Missel2/nodes7/issues/16): queue capacity and ambiguous multi-PDU write failure contracts, with fail-before-send admission and no automatic write replay.
- [Contrib freshness #20](https://github.com/Missel2/node-red-contrib-s7/issues/20): opt-in data freshness and diagnostics.
- [Contrib HIL #8](https://github.com/Missel2/node-red-contrib-s7/issues/8): future isolated real CPU read/write test debt.

**Authorship and scope:** Documentation reconciled by AI assistance for human review; no npm credentials, production information, network endpoints, live PLC logs, release trigger, deployment or package change. HIL: not applicable to this documentation PR; real-hardware test debt remains open.
