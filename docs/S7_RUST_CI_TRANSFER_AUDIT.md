# Rust 1.4.0 CI review and cross-engine test transfer (2026-11-16)

**Purpose:** compare actual CI gates, detect shared S7Comm behavior violations, and preserve a regression backlog that cannot silently turn untested issues into PASS. This document is public/synthetic only. No physical PLC, vendor simulator, production network or npm publishing was used. HIL-S7-001/002/003/004/005/006/007 **PENDING_HARDWARE**.

## What the Rust project's own seven GitHub Actions workflows verify

Reference: [oriolrius/node-red-contrib-s7-rust @ v1.4.0](https://github.com/oriolrius/node-red-contrib-s7-rust/tree/v1.4.0/.github/workflows), release source `d896a37864004ef2d1b7b6554a5f8d765847d392`.

| Workflow | Meaningful tests actually present upstream | Our transfer decision |
| --- | --- | --- |
| [CI](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/ci.yml) | Rust fmt/clippy/test; Node-RED 4 under Node 20/22; Node-RED 5 under Node 22/24; native release binaries; glibc/musl and Node-RED smoke tests | Re-test **published** NAPI binary under glibc/Node 22 and musl/Node 24. Our external S7Comm proof currently pins Node-RED 5.0.9/Node 22; Node-RED 4 and remaining matrix are **PENDING** |
| [Fuzz](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/fuzz.yml) | Six libFuzzer targets: s7_reply, s7_tag_value, s7_block_clock, s7plus_pdu, s7plus_value, s7plus_misc; 60s/target PR, 600s/target weekly, crash input artifacts | **Transferred initial deterministic external protocol mutations**: 4 COTP reply faults + 4 post-handshake READ_VAR mutations, each tested in independent Node-RED processes against both engine packages. Not equivalent to randomized libFuzzer, not a claim of complete parser fuzzing |
| [Security](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/security.yml) | gitleaks, optional GitGuardian (may skip without key), RustSec cargo audit, npm audit, PR dependency-review | Maintain JS direct-dependency/host ownership separation; RustSec/Clippy are Rust-source-owned and not replaceable by testing the published binary |
| [CodeQL](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/codeql.yml) | JS/TS, Rust, GitHub Actions with security-and-quality queries | We already use applicable JS/TS, Python and Actions CodeQL; Rust CodeQL remains upstream owned |
| [OpenSSF Scorecard](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/scorecard.yml) | Scheduled supply-chain scorecard + SARIF | Consider independent governance measure; no functional S7 correctness evidence |
| [Rust next stable](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/rust-next.yml) | Weekly optional compiler-upgrade early warning | Upstream Rust source maintenance, not a cross-engine contract |
| [Release](https://github.com/oriolrius/node-red-contrib-s7-rust/blob/v1.4.0/.github/workflows/release.yml) | Tests, release-note checks, Linux binaries, smoke containers, trusted npm OIDC publishing | Independently load real public v1.4.0 NAPI glibc/musl; **never** invoke publishing, tags or production installation in cross-engine CI |

See [upstream v1.4.0 CI run](https://github.com/oriolrius/node-red-contrib-s7-rust/actions/runs/43397503309) and [weekly fuzz run](https://github.com/oriolrius/node-red-contrib-s7-rust/actions/runs/43711529824). Their success cannot establish our distinct fault contracts.

## Exact common behavioral results (initial qualified runs)

Installed packages: source-packed `@missel2/node-red-contrib-s7@0.1.0-alpha.2` pinned to published `@missel2/nodes7@0.1.0-alpha.2`, and unmodified public `node-red-contrib-s7-rust@1.4.0` with real native Linux-x64 NAPI. **Every test uses only localhost/synthetic PLC data**. Source SHA, package versions, fault injection and evidence appear in retained Action artifacts.

| Test case | JS alpha.2 | Rust v1.4.0 | Interpretation |
| --- | --- | --- | --- |
| Baseline classic S7Comm values and TCP cleanup | PASS | PASS | Basic positive control, not HIL |
| Three odd-length 1-byte WRITE_VAR items | **FAIL**, partial byte write 0x07 | PASS | [nodes7#38](https://github.com/Missel2/nodes7/issues/38) |
| Lost write ACK *after actual execution* | PASS, no replay | **FAIL**, one silent replay, success reported | [issue #56](https://github.com/Missel2/node-red-contrib-s7/issues/56); non-idempotent P0 |
| Blackholed COTP followed by flow unload | PASS | **FAIL**, 2 further requests in 5.4s, zero end sockets | Bounded stop-latency concern, not established permanent leak |
| 40 separated odd 21-byte byte reads | PASS | PASS | Check actual PDU split for 240/480/960 before universal claims |
| Overlapping large + split read | PASS | PASS | One fixture only, verify real wire read segment addresses later |
| Short TPKT / non-TPKT / declared-long TPKT / invalid COTP CC | PASS all 4 | PASS all 4 | Four separate forked processes per candidate; malformed byte injection verified, no false online |
| Real READ_VAR three missing/error items with nonzero declared item lengths | PASS | PASS | Historic [plcpeople#143](https://github.com/plcpeople/nodeS7/issues/143) symptom; not all malformed item combinations |
| Real truncated S7 AckData reply | PASS | PASS | No crash or false-good response; Rust may transparently retry read |
| Real S7 reply with **header data length 0x7fff** but short TPKT | **FAIL**: emitted fresh values without valid follow-on response | PASS | [nodes7#39](https://github.com/Missel2/nodes7/issues/39); header length validation |
| Real S7 reply with **wrong 16-bit PDU reference** | PASS | **FAIL**: accepted correct-looking data from mismatched transaction | [assessment #59](https://github.com/Missel2/node-red-contrib-s7/issues/59); request/reference correlation |
| Public Rust NAPI load, glibc Node 22 / musl Node 24 | N/A | See CI job | Native loading only, not Node-RED/SPS operation |

**Do not automatically count a candidate as PASS on a case absent from its tests.** A single malformed READ_VAR may be rejected but other variants remain untested; a semantic FAIL is not proof that a real Siemens CPU would send the malformed frame. The accepted wrong-PDU reference requires further testing of stale responses after disconnect and reference wrap. A failed header length check is a packet validation issue, not necessarily an incorrect readback when the undamaged data bytes are intact.

## Further tests still missing (must stay explicitly PENDING)

1. **P0 wrong-address and large writes:** 24-bit S7ANY alias, crossing end-of-address spans and multi-PDU writeArea partial/truncation; real serialised byte/offset oracle and negative controls, not mock-only.
2. **P0 late, reordered and adversarial replies:** stale read after disconnected/reconnected socket; wrong PDU ref on valid-looking but **different data values**; reference wrap and 1/10/100 parallel requests; TPKT split/coalesced frames; error item offset/padding variants.
3. **P0 crash and security:** short/long arbitrary decoder inputs with deterministic seeded variation and separate process crash detection; real libFuzzer equivalent is not yet implemented for our JS parser.
4. **P1 stress:** reconnect storm, partial COTP, timer and listener counts at start/during/after unload, 100+ cycles and resource trends; bounded causal recovery.
5. **P1 data formats:** BOOL arrays, INT/DINT/REAL/LREAL, STRING/CHAR/WSTRING/DT/DTL edge and endian/length contracts with independent expected byte tables. Capability differences must be N/A, not PASS.
6. **Platform:** source CI Windows/Linux remains our JS requirement, while Rust Windows is not supported. Published native binaries in both libc variants, Node-RED 4+5 and Node 20/22/24 need separately labeled coverage. Native crash cannot be contained by a Node-RED Catch node; an isolated child process must capture exit status.
7. **S7CommPlus:** TLS certificate verification, symbolic reads and subscriptions are Rust-only; cannot be compared directly to the classic JS stack. Upstream PLCSIM logs are not independent CI evidence.

The [293-issue source snapshot](s7-historical-issue-snapshot.json) records sources from seven repositories but does not certify a full GitHub fork graph and is never an automated claim of 293 passing tests. Actual source-to-contract mappings and gaps are in [S7_HISTORICAL_REGRESSION_AUDIT.md](S7_HISTORICAL_REGRESSION_AUDIT.md).

**Governance:** This PR is intentionally red while real safety/protocol failures persist; do not merge it, weaken test assertions, publish npm or touch physical hardware to make CI green. Repairs belong in separate reviewed source PRs with original-red/candidate-green and negative-control demonstrations.
