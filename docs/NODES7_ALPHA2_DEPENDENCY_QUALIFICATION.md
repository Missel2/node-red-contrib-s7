# Public nodes7 alpha.2 → Contrib source dependency qualification

**Status 2026-11-15:** source-only **Draft [PR #53](https://github.com/Missel2/node-red-contrib-s7/pull/53)**, NOT merged, NOT published as a new wrapper version, NOT deployed. It changes the **next Contrib source candidate's runtime dependency** only. The already published immutable `@missel2/node-red-contrib-s7@0.1.0-alpha.1` retains `@missel2/nodes7@0.1.0-alpha.1`; its npm bytes cannot be retroactively changed.

## Independent public-npm input evidence (completed)

- **Published library:** `@missel2/nodes7@0.1.0-alpha.2` (npm dist-tag `alpha`; `latest` remains `0.0.0-stage`).
- **Library publishing source:** protected `Missel2/nodes7` commit `8c20db1db83ebc687cef280f589f22052825e909`, [successful manually approved publish #43751615794](https://github.com/Missel2/nodes7/actions/runs/43751615794); exact npm registry tarball from `https://registry.npmjs.org/@missel2/nodes7/-/nodes7-0.1.0-alpha.2.tgz`.
- **Cross-platform independent readback:** [public consumer CI #43753322544](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43753322544), Ubuntu 24.04 and Windows 2025 Node 22: independent npm packument GET, tarball GET, source SHA-1 and SHA-256 match, full registry SHA-512 verified by hashing actually downloaded bytes, package identity/license/production dependency and both dist-tags verified. Exact JSON-only evidence archived in CI. The earlier metadata error from querying the truncated `install-v1` packument was corrected to a full public packument GET; no library artifact changed.
- **Actual 61,443-byte tarball:** SHA-1 `99aae7b1a1969e252239ff09e9760d514df75a5e`, SHA-256 `11327c208ad99dae5eca2fd4a6fd9a83e17637b8eb4ad1f2018c6ba98bd6c81e`, SHA-512 SRI:
  `sha512-4Lmejz+WT5YOLHBXfdSForyHltgct5A9J1indi0Q/sxZKpGIY2omRrjSMRU6fKeW6YDAb+jwAjjEz7hQE/Z9pQ==`.
- **Provenance limit:** the npm public publish log explicitly recorded a signed GitHub Actions provenance statement in the [Sigstore transparency log #3908748303](https://search.sigstore.dev/?logIndex=3908748303). The public packument exposes no `dist.attestations.provenance.url` in this readback; this proof establishes byte identity and SRI, **not independent verification of the Sigstore signature or SLSA trust policy**.

## Source-only proposed Contrib pin

| Boundary | Exact value |
| --- | --- |
| Protected Contrib baseline | `37022913204283dcd9098079480e448d28f02757` |
| Manifest name/version | `@missel2/node-red-contrib-s7@0.1.0-alpha.1` **source only**, no new npm publish |
| Legacy CommonJS dependency key | `@st-one-io/nodes7` (unchanged import compatibility) |
| New npm alias | `npm:@missel2/nodes7@0.1.0-alpha.2` |
| Root lock identity | `node_modules/@st-one-io/nodes7`: name `@missel2/nodes7`, version `0.1.0-alpha.2`, exact npm registry tarball URL and SHA-512 above |
| Transitive production transport | `iso-on-tcp@0.1.0` remains locked (manifest range `^0.1.0`) |
| Installed Node-RED CI host | Official **unaltered upstream Node-RED 5.0.9**, isolated `test/runtime-lab` manifest/lock unchanged |
| npm publisher, token, tags | No new Contrib version selected; **no registry writes, stage, approval or dist-tag changes** |

## Required exact-head source qualification

- [ ] Require both public npm registry readback jobs to complete on **final PR head**, matching independent SHA-256, SHA-512 and `alpha/latest` tags. Preserve earlier source evidence and record new exact-head CI separately.
- [ ] `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` must reproduce the committed **real** production lock exactly (both operating systems). Reject incomplete/resolved-from-GitHub lock data and npm alias drift. `npm ci` must install the exact npm alias and export the expected `S7Endpoint`.
- [ ] Run Windows 2025 and Ubuntu 24.04, Node 22/24: wrapper unit/lifecycle, installed Node-RED 5.0.9 `locked` and `consumer` modes, synthetic real S7Comm wire protocol, fault/timeout/reconnect, Catch/Complete ownership and no ambiguous write replay. Preserve byte-for-byte unmodified Node-RED test-only lock. The physical hardware cases below remain pending regardless of software pass.
- [ ] Run GPL/license/SBOM and `npm pack` composition checks (source candidate only), CodeQL and all **9/9 protected required checks**, reviews, active ruleset and unchanged final PR Head SHA.
- [ ] Request **separate human squash-merge permission** for this Contrib dependency PR. Then check actual protected master and its fresh post-merge CI. No automatic merge.
- [ ] Consider a new Contrib prerelease **version** in a later **separate review** after the source-only pin is merged and qualified. The existing public Contrib `alpha.1` cannot be republished under the same version, even if source `package.json` is still `alpha.1`.

## Behavioral and risk limits

New `nodes7 alpha.2` fixes S7ANY boundary handling and changes an important multi-PDU write failure mode: data previously omitted without a complete write may now be sent for the full caller-requested range. This is a protocol correctness fix but can change PLC memory effects. A timeout or lost acknowledgment may still leave the write outcome unknown; **never automatically replay ambiguous writes**. The wrapper's opt-in boundedWrites profile remains opt-in and does not make the nodes7 internal queue universally bounded. No real Siemens hardware, actual industrial PLC process, firmware/PUT-GET program or production safety behavior has been tested by this PR.

**Hardware applicability:** HIL-S7-001 (connect), HIL-S7-002 (reads), HIL-S7-003 (allowlisted write/readback), HIL-S7-004/005 (reconnect/faults), HIL-S7-006 (lost-ACK/no retry), HIL-S7-007 (Node-RED flow lifecycle). **All PENDING_HARDWARE.** Tests are hosted software/loopback only. Future CPU writes require isolated authorized scratch-DB and operator approval.

**Rollback:** before source merge close the draft PR; after source merge a separately reviewed revert restoring the previous exact alias/lock and rerunning all CI; after a future public Contrib prerelease use another immutable version rather than overwriting a published package.

**Disclosure:** synthetic public test data only; no operational addresses, organization/site/asset IDs, credentials, real controller traces or private infrastructure in this change. AI-assisted implementation and evidence collection under human maintainer decisions.
