# First npm staging decision — @missel2/node-red-contrib-s7

**Historical approval checklist — first alpha staged and released on 2026-11-11.** The fields below reflect the original *pre-authorization* proposal and were deliberately left blank at that time; they are not the current npm status. For the completed actual source SHA, archived hash, stage ID, publisher approval and independent post-release verification, see [the immutable alpha.1 release record](ALPHA1_RELEASE_EVIDENCE.md). This record never grants permission for new releases, dist-tag changes, deployment or real PLC access.

## Immutable evidence baseline

- Source inspected before this documentation proposal: protected `master` `f7da551c770aee7074f94233e55bc04445ff4bec`; this is **not** automatically the final tarball candidate after a documentation PR merges.
- Merged integration: [PR #46](https://github.com/Missel2/node-red-contrib-s7/pull/46). `package.json` requires `"@st-one-io/nodes7": "npm:@missel2/nodes7@0.1.0-alpha.1"` for compatibility with current `require` sites.
- The committed npm lock identifies `@missel2/nodes7@0.1.0-alpha.1` and `sha512-07lzsDrfxQ5P15iM/+rjxNVbo0gyIGWjKivXfgU/tEUQs1qO+A0upy6690qy85mG7mEiNpek1xqhRVASvb9ktw==`. Verify it again against the actual registry response before staging.
- On `f7da551c770aee7074f94233e55bc04445ff4bec`, GitHub reported 27/27 successful commit check runs (including CodeQL, lock reproducibility, unmodified installed Node-RED on Ubuntu/Windows Node 22/24 and [read-only preflight](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43025921248)). This record does **not** inherit those check results for any new commit.
- `@missel2/nodes7` alpha was previously published separately. Do not install via its documented `latest` placeholder; use exactly the pinned alpha version.
- Real Siemens S7-1200 HIL tests remain **PENDING_HARDWARE**. Software-loopback results are not Siemens firmware or operational safety certification.

## Pre-stage review — all entries must be independently observed

1. Identify the **final protected master commit SHA after the approved documentation/release PR**. Re-run all required status checks, independent CodeQL, `npm ci` cross-platform and the standalone release preflight **on that exact SHA**. Record URLs, conclusions, absence of skipped/failed/pending checks and unresolved review threads.
2. In a controlled environment review the precise `npm pack --ignore-scripts` output, path allowlist, `README.md`, `LICENSE`, source credits, maintainer rights and public disclosure policy. Inspect historical public artifacts separately; current-tree checks cannot undo a previous disclosure.
3. Compare the actual tarball's SHA-256 and SHA-512, package name/version/`alpha` tag, package manifest, lock, SPDX/CycloneDX SBOM, runtime-only files and the `@missel2/nodes7` npm registry alias/integrity. Do not mistake metadata/license presence for a full legal or vulnerability audit.
4. Confirm that installed unmodified upstream Node-RED and synthetic TCP/S7Comm checks cover the *packed* candidate in locked and consumer modes on both hosted operating systems. Do not enable upstream and fork node types simultaneously in one runtime.
5. Independently confirm npm account/scope ownership, 2FA, the candidate version's registry status, and the chosen stage-only authorization path. **No credentials, registry write operations or environment details belong in public CI artifacts.**
6. Record a separate, affirmative human decision that names **package, version, exact source SHA and archive digest** and explicitly permits *first npm staging only*. Approval to develop or merge code does not authorize staging.

## After a distinct staging approval

- Stage only the approved immutable artifact with `alpha` (never `latest`) and public scoped-package visibility; prefer a separately reviewed stage-only trusted publisher/OIDC workflow once the npm package identity exists.
- For a package that does not yet exist, npm stages a **publicly visible `0.0.0-stage` placeholder**. The staged candidate bytes are not installable until later 2FA approval. This is a public side effect even before final publishing.
- Read back the resulting stage ID, package name, version, dist-tag, SHASUM and downloaded archive; compare to the approved artifact and record any mismatch as a **STOP**. Reject an incorrect stage rather than approving it.
- Require another **independent** maintainer decision for `npm stage approve` (2FA). No blanket publication authorization follows from staging. After actual publication, verify registry `alpha`, exact integrity, installed Node-RED consumer behavior and release notes. Do not silently move `latest`.
- Record both the irreversible public-release implications and remaining hardware/security limitations.

## Original decision slots (historical, intentionally blank at creation)

| Gate | Record |
| --- | --- |
| Final source SHA | Not selected |
| Final packed artifact SHA-256 / SHA-512 | Not selected |
| Exact-head CI, CodeQL, preflight URLs | Not yet revalidated after this proposal |
| Owner/license/disclosure decision | Pending manual assessment |
| Human approval for first npm stage | **NOT GRANTED** |
| Stage ID / stage archive proof | None |
| Human approval for publication | **NOT GRANTED** |
| Hardware qualification | PENDING_HARDWARE |

## Scope and handoff

This is a documentation-only change; `package.json`, root/lab locks, `red/`, `src/`, tests, workflows and repository rules remain unchanged. HIL: not applicable to this documentation edit; HIL-S7-* physical test debt remains open. No npm stage/publish, tag or deployment occurred as part of this work.

Further work after the stage gate: [shared release roadmap #21](https://github.com/Missel2/node-red-contrib-s7/issues/21), [nodes7 queue/recovery qualification #16](https://github.com/Missel2/nodes7/issues/16), and [S7 data freshness #20](https://github.com/Missel2/node-red-contrib-s7/issues/20).

Official references: [npm staged publishing](https://docs.npmjs.com/staged-publishing/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/).
