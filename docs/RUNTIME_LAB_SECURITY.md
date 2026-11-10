# Installed Node-RED test-lab dependency security (Issue #27)

This page records a **partial test-toolchain mitigation**, not a secure-release or
hardware-qualification claim. The lab is private, excluded from the distributed
npm tarball, and uses the real installed Node-RED runtime for hosted tests.
The production `node-red-contrib-s7` dependency and its immutable nodes7 pin
are independent of the lab's npm lockfile.

## Exact baseline and two isolated solver experiments

The previously approved `master` at
[`f1679ba0670a0511bf0689f917cfd9cc3f307c25`](https://github.com/Missel2/node-red-contrib-s7/commit/f1679ba0670a0511bf0689f917cfd9cc3f307c25)
pins `node-red@5.0.9` in `test/runtime-lab/package.json`.
Two disposable hosted Ubuntu 24.04, Node `22.23.4`, npm `10.9.9` experiments
in [research PR #37](https://github.com/Missel2/node-red-contrib-s7/pull/37)
were run against that exact baseline, using `npm install --package-lock-only`,
`npm ci --ignore-scripts`, and `npm audit --json`.

| Evidence | Ordinary compatible refresh | Scoped override experiment |
| --- | --- | --- |
| Node-RED runtime | 5.0.9 | 5.0.9 |
| `multer` under Node-RED | 2.4.0 | **2.5.0** |
| npm CLI bundled in Node-RED | 11.21.1 | **11.21.2** |
| npm-bundled `undici` | 6.29.0 | **6.29.1** |
| npm-bundled `minimatch` | 10.2.5 | **10.2.5 — still vulnerable** |
| npm audit advisories | 41 (6 high, 35 moderate) | 38 (4 high, 34 moderate) |
| npm install | PASS | PASS |
| npm audit (exit 1) | FAIL — advisories present | FAIL — advisories remain |

The experiment also tried an override for npm-bundled `minimatch@11.0.1`.
It **had no effect on the installed bundled version** and is **not** retained
in this partial remediation. Any reported security reduction is a measured
difference in the **isolated lab** and must not be extrapolated to the real
product or another Node-RED version.

## Exact dependency paths and reviewed changes

`@node-red/editor-api@5.0.9` and `@node-red/nodes@5.0.9` both demand
`multer@2.4.0`. Narrowly scoped overrides select `multer@2.5.0`
for those two packages. This addresses
[GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m)
(CVE-2026-113872) for the selected lab installation.

`@node-red/registry@5.0.9` requires the exact `npm@11.21.1`;
a scoped override to `npm@11.21.2` selects its upstream-published bundle
including `undici@6.29.1`. This addresses the audited `undici@6.29.0`
advisories, including
[GHSA-2m5v-pch6-74hx](https://github.com/advisories/GHSA-2m5v-pch6-74hx).
A bundled package's lock entry has `inBundle: true`, so its provenance is
verified through the enclosing npm tarball's SHA-512 integrity rather than
claiming a separate registry SRI for the nested copy.

However `npm@11.21.2` continues to bundle `minimatch@10.2.5`.
That is still affected by
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
(patched in `11.0.1`). Multiple nested npm packages require `minimatch@^10`;
a blanket major-version override is not an independently validated fix.
The audit still reports 38 advisories, including other high-severity findings.
**Issue #27 must remain OPEN.**

## Candidate acceptance and safety boundaries

The candidate pins only the two known `multer` consumers and
`@node-red/registry`'s npm bundle. The guard
`test/runtime-lab/security-pins.test.cjs` verifies the unchanged Node-RED
runtime, narrow overrides, exact lock entries and SRI provenance; it also
provides negative tests for reverted or broadened dependencies and prints
the outstanding `minimatch` finding.

The existing hosted CI must **independently** prove the candidate source SHA:
Ubuntu 24.04 and Windows 2025, Node 22 and 24, locked and consumer installs,
zero post-stop retry, zero live peer sockets before cleanup, no write replay
after lost ACK, CodeQL and all nine protected checks. The earlier Ubuntu-only
solver experiments do not fulfill that matrix.

This change does not update the shipped package, publish npm artifacts,
enable GitHub Security settings, resolve all advisories, grant a release,
qualify Siemens S7 hardware, or authorize physical OT/hardware access.
Hardware cases HIL-S7-001…007 remain PENDING_HARDWARE. A squash merge requires
a separate explicit human decision after complete exact-head review.
