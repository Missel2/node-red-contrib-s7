# Next coupled S7 alpha: review gates, not a release decision

**Status: proposed only · 2026-11-13.** Both independent npm artifacts
`@missel2/nodes7@0.1.0-alpha.1` and
`@missel2/node-red-contrib-s7@0.1.0-alpha.1` remain **published and
immutable**. The Contrib `master` manifest and lock still reference the
former through `@st-one-io/nodes7` using an exact npm alias plus SHA-512
integrity. The unqualified `latest` tag still points at the earlier
`0.0.0-stage` placeholder according to the alpha.1 release evidence.
This document does **not** create any tag, package version, release artifact,
GitHub release, workflow trigger or staging authorization.

The illustrative version name `0.1.0-alpha.2` below is a **proposal,
not an approved version selection**. Source SHAs and tarball digests must
be resolved again at every actual release boundary.

## Observed source and test boundaries

| Layer | Recorded state | Evidence limit |
| --- | --- | --- |
| nodes7 protected `master` | `b4a0a5dd846988e8b687e6c0b53b454ffbc206da`, human-approved P0 [#31](https://github.com/Missel2/nodes7/pull/31) squash merged | CI passed on that commit; not published to npm |
| nodes7 [Issue #32](https://github.com/Missel2/nodes7/issues/32) | [Draft PR #33](https://github.com/Missel2/nodes7/pull/33) contains an independently test-first S7ANY address-bound candidate | Still **DRAFT / NOT MERGED**; CI on a branch is not master evidence |
| Contrib protected `master` | `37022913204283dcd9098079480e448d28f02757` | Package version and exact npm alias are still alpha.1 |
| Immutable npm artifacts | Both alpha.1 originally released on 2026-11-11; see [archive evidence](ALPHA1_RELEASE_EVIDENCE.md) | Older artifacts do not automatically inherit later nodes7 source fixes |
| Node-RED host | Independently maintained, upstream Node-RED 5.0.9 used by installed-runtime CI | No downstream patches or overrides to the Node-RED host |
| Siemens S7-1200 | HIL-S7-001..007 pending | No physical CPU/firmware/OT qualification |

## Ordered, independent human-controlled gates

### A. Qualify nodes7 source BEFORE considering a new library version

1. Review Draft [nodes7 PR #33](https://github.com/Missel2/nodes7/pull/33) for
   exact head, original-red/candidate-green evidence, syntax, unit, protocol,
   negative-control mutation, 8 strict required contexts, CodeQL, reviews,
   active ruleset, and release-compatibility risk. Address any discovered bug
   *on that PR*, then require a **separate explicit human squash approval**.
2. After an authorized merge, verify the resulting actual protected nodes7
   `master` SHA, complete post-merge CI and unmodified package identity.
   Check other merged-but-unreleased features: optional queue capacity
   (`maxQueuedJobs`), optional fail-closed `abortOnTimeout`,
   read/write boundary behavior and conservative partial-write outcomes.
   The opt-in defaults and ambiguous-write semantics must be documented.
3. Review remaining [protocol Issue #16](https://github.com/Missel2/nodes7/issues/16)
   and any independently open release blockers. A green #33 alone is not a
   declaration that every packet-padding, timer/counter or security issue is
   resolved.
4. Only if judged release-ready, select the exact **new version** (for example
   nodes7 `0.1.0-alpha.2`) in a narrowly scoped **separate** source/package
   identity PR. Review compatibility notes for newly rejected invalid offsets,
   for the formerly silent incomplete multi-PDU writes and for opt-in transport
   options. An existing stable process could observe different memory effects.

### B. Qualify and authorize the nodes7 npm artifact

5. On a precisely selected source SHA, run hosted Windows/Linux regression,
   synthetic TCP/COTP/S7Comm faults, CodeQL, `npm ci`, exact `npm pack
   --ignore-scripts` archive inspection, file allowlist, license and source
   attribution checks, SPDX/CycloneDX SBOM, lock integrity and public
   disclosure review **before** a registry write. Record actual archive
   SHA-256/SHA-512, Node/npm versions, workflow URLs and known limits.
6. A maintainer separately approves **staging** for one exact
   package/version/source SHA/digest; staged publishing has public effects
   and cannot be assumed private. Read back the stage identity and immutable
   digest. Require a **second separate 2FA-backed human approval** before
   publication. Do not move `latest` or reuse a released version. A current
   publishable candidate and a green preflight do not grant either approval.
7. After any authorized publication, independently verify registry metadata,
   the downloaded tarball and integrity, `alpha` and `latest` tag targets,
   clean installs on Windows/Linux, no install-script side effects and the
   actual library behavior from the downloaded artifact. A source `master`
   green check is not a published-tarball consumer pass.

### C. Upgrade and qualify Contrib only AFTER the library artifact exists

8. Open a **separate** Contrib dependency PR. Change only the reviewed
   `package.json` `@st-one-io/nodes7` npm alias to the now-published exact
   `@missel2/nodes7@<authorized-version>`, and regenerate the **real**
   `package-lock.json` from the npm registry. Pin its actual SHA-512.
   Never point the wrapper to a guessed, nonexistent or branch-local package.
9. Prove full Node-RED node registration, existing S7 endpoint/in/out/control
   contracts, opt-in `boundedWrites` unchanged by default, Catch/Complete
   ownership and write-error ambiguity. Repeat Windows/Linux Node 22/24
   installed **unmodified upstream Node-RED 5.0.9** runtime, software
   S7Comm wire/teardown, stale-read, manual-stop/reconnect and cross-package
   negative controls. Do not install upstream and fork node types together.
   Do not modify Node-RED host dependencies to suppress upstream advisories.
10. Only after the pinned Contrib PR has separate human merge approval and
    its **actual protected master** CI succeeds, consider a new Contrib
    prerelease version/pack candidate. Review its exact license files,
    archive/SBOM, release notes and new version number independently.
    Contrib staging and eventual public approval each need another
    separate explicit human authorization and byte-level post-publication
    checks. The nodes7 approval does not authorize the Contrib release.

## Release review ledger (intentionally blank)

| Gate | Status / immutable evidence |
| --- | --- |
| nodes7 PR #33 merge authorization | **NOT GRANTED** |
| nodes7 final source/master SHA | Not selected; current verified master is older than draft #33 |
| nodes7 version and proposed archive digest | Not selected / not built |
| nodes7 stage authorization and Stage ID | **NOT GRANTED** / none |
| nodes7 public version verification | Not performed for a next version |
| Contrib dependency-alias PR and lock SHA-512 | Not created for a next version |
| Contrib version/packed artifact SHA-256/SHA-512 | Not selected |
| Contrib stage authorization | **NOT GRANTED** |
| Contrib public approval | **NOT GRANTED** |
| Real Siemens S7-1200 HIL | **PENDING_HARDWARE** |

**STOP if:** the head/base changed, an exact required check is missing,
skipped, pending or failing, a CodeQL/review blocker remains, npm registry
integrity differs from reviewed bytes, an unmodified host runtime is not
tested, output semantics are ambiguous/undisclosed, or a public disclosure
assessment is missing. Rollback for an unreleased candidate is to abandon its
branch/PR; for an already published immutable npm version, use a separately
approved later version and re-pin consumers, never assume a registry release
can be silently rewritten. Never blindly replay ambiguous PLC writes.

**Scope:** Documentation-only release planning; HIL not applicable to this
documentation change. Physical HIL-S7-* technical debt remains pending.
No npm stage/publish, GitHub release, dist-tag change, package manifest,
lockfile, source runtime, CI, deployment or physical hardware operation is
authorized or performed by this plan. Material AI-assisted documentation,
human maintainer retains all release and safety decisions.
