# Historical S7 / nodes7 issue-to-test audit (2026-11-16)

This is a **source-traced, synthetic-only engineering audit**, not a claim that all historical defects have been exercised, that every reported issue is a defect, or that either implementation is qualified for physical Siemens equipment.

## Source census and boundaries

[Issue snapshot](s7-historical-issue-snapshot.json): **293 issue records** from seven selected public repositories, including both open and closed issues (pull requests excluded):

| GitHub repository | Issues found | Relationship |
| --- | ---: | --- |
| [plcpeople/nodes7](https://github.com/plcpeople/nodeS7/issues) | 112 | Original historic nodes7 implementation; different architecture |
| [st-one-io/nodes7](https://github.com/st-one-io/nodes7/issues) | 13 | Modern JavaScript library upstream |
| [oriolrius/nodes7](https://github.com/oriolrius/nodes7/issues) | 0 | Independent patched fork |
| [Missel2/nodes7](https://github.com/Missel2/nodes7/issues) | 10 | Our test/published transport |
| [st-one-io/node-red-contrib-s7](https://github.com/st-one-io/node-red-contrib-s7/issues) | 141 | Original JavaScript Node-RED wrapper |
| [oriolrius/node-red-contrib-s7](https://github.com/oriolrius/node-red-contrib-s7/issues) | 1 | Third-party JavaScript wrapper fork |
| [Missel2/node-red-contrib-s7](https://github.com/Missel2/node-red-contrib-s7/issues) | 16 | Our Node-RED wrapper and compare CI |

This is **not a census of every fork, commit, external forum, dependency advisory or historic unfiled bug**. The public original nodes7 repository reports over 100 forks and the wrapper over 60; a full fork graph crawl and independent patch comparison remains open. Repository issue counts include questions, compatibility requests, duplicate reports and suggestions; no issue title is evidence of a reproducible defect. The machine-readable snapshot is immutable archival triage: its title-derived categories are **unverified**, and every issue remains NOT_TESTED_BY_THIS_INVENTORY until matched to an actual test and exact package version.

## High-risk test-family decisions

Definitions: **PASS** means executed under a named synthetic setup and version; **FAIL** means a reproducible violation of a stated synthetic behavior contract; **PENDING** means no equivalent run. N/A denotes genuinely incompatible APIs or platforms, never an automatic pass.

| ID | Source report(s) | Why relevant / required oracle | JS alpha.2 | Rust 1.4.0 | Priority / next |
| --- | --- | --- | --- | --- | --- |
| W01 | [st-one-io/nodes7#16](https://github.com/st-one-io/nodes7/issues/16), [#8](https://github.com/st-one-io/nodes7/issues/8), [our nodes7#38](https://github.com/Missel2/nodes7/issues/38) | Three odd-length BYTE write items, exact bytes and per-item failure. One-item write positive control, no false all-success | **FAIL**: one wire WRITE_VAR, first byte applied, latter two unchanged, error 0x07 | **PASS** in same fixture | **P0**: validate serializer fill byte and no partial-success claim |
| W02 | [Missel2/nodes7#29](https://github.com/Missel2/nodes7/issues/29), [st-one-io/nodes7#3](https://github.com/st-one-io/nodes7/issues/3) | Splitting writeArea across multiple PDUs, exact destination address, full byte payload and no silent truncation | **PENDING** for generic writeArea and downstream wrapper | **PENDING** comparable large-write behavior | **P0**: safe exact-byte/offset wire oracle; may have different APIs |
| W03 | Rust discovered in [PR #58](https://github.com/Missel2/node-red-contrib-s7/pull/58) | Fixture applies write, ACK deliberately omitted. Exactly one WRITE_VAR per user command; no misleading success/replay | **PASS** on master installed-runtime synthetic suite | **FAIL**: two WRITE_VAR, one automatic replay, success reported | **P0** for non-idempotent command semantics |
| R01 | [st-one-io/nodes7#17](https://github.com/st-one-io/nodes7/issues/17), [wrapper#134](https://github.com/st-one-io/node-red-contrib-s7/issues/134) | 40 separated odd 21-byte arrays through real S7Comm fixture; exact 840 bytes | **PASS** observed | **PASS** observed | **P1**: explicitly capture negotiated PDU sizes and verify response boundary packing for 240/480/960 |
| R02 | [st-one-io/nodes7#20](https://github.com/st-one-io/nodes7/issues/20) | Overlapping 925-byte/18-byte reads; exact initial subrange after sentinels and complete tag bytes | **PASS** observed | **PASS** observed | **P0** latent: verify first item truly split and add 240/480/960 independent oracle |
| R03 | [Missel2/nodes7#32](https://github.com/Missel2/nodes7/issues/32) | Out-of-range 24-bit S7ANY address or crossing span must reject **before any wire request**, not alias a low address | **PENDING** | **PENDING** | **P0**: independent address oracle, pre-send negative controls |
| R04 | [plcpeople/nodes7#143](https://github.com/plcpeople/nodeS7/issues/143), [#107](https://github.com/plcpeople/nodeS7/issues/107) | Malformed/short PLC error item; no RangeError, process crash or false-good read | **PENDING** | **PENDING** | **P0**: fault-injected TPKT/error-response fuzz, child-process crash detection |
| R05 | [plcpeople/nodes7#76](https://github.com/plcpeople/nodeS7/issues/76), [#45](https://github.com/plcpeople/nodeS7/issues/45) | Concurrent reads; each independent callback settles exactly once, no stale or mixed read generations | **PENDING** | **PENDING** | **P1**: matched burst test, transport-reference oracles |
| R06 | [plcpeople/nodes7#91](https://github.com/plcpeople/nodeS7/issues/91), [wrapper changelog](https://github.com/st-one-io/node-red-contrib-s7/blob/master/CHANGELOG.md) | PDU request-reference collision under concurrent read+write | **PENDING** | **PENDING** | **P1**: parallel operation and strict response correlation |
| R07 | [plcpeople/nodes7#40](https://github.com/plcpeople/nodeS7/issues/40), [#26](https://github.com/plcpeople/nodeS7/issues/26) | TPKT fragmentation/coalescence, no out-of-bounds frame or oversize declared PDU | Existing JS synthetic wire tests; not full common engine matrix | **PENDING** shared | **P1**: common frame mutation suite |
| R08 | [st-one-io/nodes7#4](https://github.com/st-one-io/nodes7/issues/4), [plcpeople/nodes7#22](https://github.com/plcpeople/nodeS7/issues/22) | STRING/CHAR, arrays, Unicode and length/encoding edge cases | **PENDING** shared | **PENDING** | **P1**: common datatype oracle |
| R09 | [st-one-io/nodes7#11](https://github.com/st-one-io/nodes7/issues/11), [wrapper#131](https://github.com/st-one-io/node-red-contrib-s7/issues/131) | LREAL/64-bit datatypes, unsupported/converted data must not silently become incorrect | **PENDING** | **PENDING** | **P2**: capability matrix first, then exact hex-oracle |
| C01 | [oriolrius/wrapper#1](https://github.com/oriolrius/node-red-contrib-s7/issues/1), [st-one-io/wrapper#102](https://github.com/st-one-io/node-red-contrib-s7/issues/102) | Offline reconnect storms, duplicate peer sockets and resource growth over time | Existing JS lifecycle checks, long soak **PENDING** | Short blackhole failure observed, long soak **PENDING** | **P1**: 100+ failure cycles and RSS/fd trends |
| C02 | [st-one-io/nodes7#13](https://github.com/st-one-io/nodes7/issues/13), [wrapper#143](https://github.com/st-one-io/node-red-contrib-s7/issues/143), [plcpeople#94](https://github.com/plcpeople/nodeS7/issues/94) | Late ECONNRESET / unhandled error event, no Node-RED process crash | **PENDING** shared | **PENDING** | **P0**: isolated process with child exit proof |
| C03 | [st-one-io/nodes7#12](https://github.com/st-one-io/nodes7/issues/12), [plcpeople#113](https://github.com/plcpeople/nodeS7/issues/113) | Reconnect listener growth; bounded handlers and no MaxListeners warning | Existing JS unit checks; not common | **N/A** same EventEmitter contract, but native resource counts **PENDING** | **P1** |
| C04 | [plcpeople/nodes7#132](https://github.com/plcpeople/nodeS7/issues/132), [wrapper#118](https://github.com/st-one-io/node-red-contrib-s7/issues/118) | Hung operations, bounded completion, cleanup without late success | **PASS** for selected JS installed-runtime cases | **PASS** held READ_VAR during flow unload | **P1**: broader pending write and partial handshake |
| C05 | Rust discovered in [PR #58](https://github.com/Missel2/node-red-contrib-s7/pull/58) | Flow removed during COTP blackhole; no post-unload connect attempts | **PASS** synthetic installed-runtime check, 0 attempts in 5.25 s | **FAIL**: 2 extra COTP requests in 5.4 s, zero final sockets, also reproduced in independent Node-RED host | **P1** lifecycle; NOT a verified persistent leak |
| C06 | [plcpeople/nodes7#116](https://github.com/plcpeople/nodeS7/issues/116), [wrapper#40](https://github.com/st-one-io/node-red-contrib-s7/issues/40) | Close callback and logs/timers must stop after removal | JS-specific lifecycle checks exist | Native close asynchronous behavior requires separate checks | **P1** |
| U01 | [st-one-io/wrapper#154](https://github.com/st-one-io/node-red-contrib-s7/issues/154) | Real PLC firmware interoperability | **PENDING_HARDWARE** | **PENDING_HARDWARE** | Not a CI simulator pass |
| U02 | [st-one-io/wrapper#132](https://github.com/st-one-io/node-red-contrib-s7/issues/132) | S7CommPlus/optimized data and TLS | **N/A** for current classic-only JS | Rust capability, **not** common S7Comm test | Separate simulator/licensed HIL decision |

**Scope interpretation:** A confirmed public bug report in the original plcpeople implementation is not proof that the independently rewritten st-one-io JavaScript fork or the Rust implementation contains it. Historical issue state (open/closed) does not determine the present package behavior. The common external oracle is the authority for each specific version, fixture, and requested wire behavior.

## Relevance review: the two Rust failures

### Lost write ACK: safety gate, P0 for non-idempotent control writes

[Repro run](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43851140290) confirmed that the fixture applied a WRITE_VAR, the relay dropped the positive ACK, and **two real WRITE_VAR packets** were transmitted for one Node-RED input message. Rust eventually reported success. This is significant for single-command/coils/edge-triggering PLC logic, even when writing the same value twice: one successful write cannot be assumed idempotent at the application level. Simple static setpoints may tolerate it, but the library cannot decide that for the caller.

Source lead: the Rust client's shared retry loop repeats retryable I/O requests, and the write entry point calls the same loop. A safer design only retries before a command is known to be dispatched; after ambiguous I/O, the write outcome is UNKNOWN and no unsolicited replay is allowed. Test also needs an independent mutation negative control and a comparison of transparent read retries.

### COTP after removal: lifecycle gate, P1/P2 based on workload

[Independent blackhole run](https://github.com/Missel2/node-red-contrib-s7/actions/runs/43851140290) recorded **two new COTP requests after Node-RED flow unload**, both in the multi-fault job and a newly started, otherwise empty runtime job. No sockets remained by the end of the 5.4-second observation. The native close path queues a stop signal for a worker potentially occupied in a bounded retry. This violates an immediate-stop expectation, but **does not prove a perpetual leak, unstoppable supervisor, unlimited reconnect storm or unsafe PLC write**. Characterize total stop time, configured attempts/timeouts, socket occupancy and memory trend before grading industrial severity beyond the concrete contract.

## Next executable slices, in order

1. **P0 write integrity**: fix/verify JavaScript multi-item padding in a *separate nodes7 PR* with wire hex and exact-byte negative control, plus upstream Rust write ambiguity without modifying this evidence branch.
2. **P0 wrong-address/incorrect data**: add a shared S7ANY 24-bit range validator and overlapping split case **with recorded negotiated PDU and actual READ_VAR segment addresses**.
3. **P0 crash isolation**: malformed packets, short COTP, read error items, late reset and typed-array edge cases, each run in its own process so a crash cannot falsely pass.
4. **P1 sustained behavior**: deterministic reconnect bursts, timer/listener/socket growth, concurrent read/write callbacks, duplicate response correlation and complete cleanup.
5. **Asymmetric capabilities and hardware**: separate S7CommPlus/optimized DB tests and an explicitly authorized Siemens hardware test matrix. Do not fold these into a classic-S7Comm score.

## Release/governance boundary

The selected-source issue snapshot is archival evidence only. [Parity PR #58](https://github.com/Missel2/node-red-contrib-s7/pull/58) is intentionally RED because real defects have been reproduced. It **must remain unmerged** while checks fail; do not weaken expectations to turn it green. Existing protected master, release PR #55 and npm artifacts remain unchanged. No production plant paths, secrets, licensed PLCSIM or real controller were accessed. HIL-S7-001 through 007 remain **PENDING_HARDWARE**.
