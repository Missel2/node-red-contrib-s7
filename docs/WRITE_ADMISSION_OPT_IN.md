# Opt-in S7 write admission — one pending message, no wrapper queue

**Status:** implementation candidate on an unmerged feature branch for [Issue #19](https://github.com/Missel2/node-red-contrib-s7/issues/19). This document is not proof of CI success, physical safety, a published package, or a merged feature.

## Operator-facing behavior

On an **S7 Endpoint** configuration node, check **Limit pending writes (1, no queue)** (German: **Schreibaufträge begrenzen (1, keine Warteschlange)**), then deploy the edited flow after the normal review. For every existing endpoint that does **not** enable the checkbox, write admission follows the existing unbounded wrapper behavior. Existing `msg.payload`, `msg.topic`, `msg._msgid`, validation, node types, and the installed nodes7 source pin remain unchanged.

The opt-in profile counts *one outstanding Node-RED write message per configured endpoint*, **not per output node**. Multiple `s7 out` nodes sharing the same configuration compete for the same slot.

| Event | Endpoint behavior | Node-RED completion |
| --- | --- | --- |
| First valid write while free | Reserve one slot before invoking `writeItems` | Await the original promise |
| Second valid write while first unresolved | **Reject before `writeItems`**, with **no queue** | `done(Error)`, code `ERR_S7_WRITE_BUSY`; normal scoped Catch with originating input |
| Earlier `writeItems` resolves | Release the slot | Success `done()` exactly once (protocol-level acknowledgement, not process verification) |
| Earlier `writeItems` rejects | Release the slot | Existing error `done(error)` exactly once; uncertain PLC execution is not represented as known failure |
| S7 output closes while its accepted write remains unresolved | Report uncertainty **once**; retain the occupied slot until the underlying promise actually settles | `done(Error)`, code `ERR_S7_WRITE_CLOSE_UNKNOWN`; suppress later success/error |
| S7 endpoint closes while a write is unresolved | Report uncertainty once before disconnect; no new submission | Same unknown-close error; no late completion |
| New write after endpoint/output close | Reject **before submission** | `ERR_S7_WRITE_CLOSED` |

The `ERR_S7_WRITE_CLOSE_UNKNOWN` error means the command **may already have reached or been applied by the PLC**. It must not be automatically retried merely because a flow was removed, a timeout occurred, or the communication recovered. A Catch node may itself be removed during a complete redeploy, so visibility of that Catch event after teardown cannot be guaranteed. Persist important pre-redeploy diagnostic information outside the disappearing flow if required.

The new error codes are ordinary Node-RED completion errors, **not a versioned write-outcome message schema**. A future opt-in `msg._s7WriteV1` or similar metadata format is not part of this milestone.

## Why this is not a total transport queue limit

The wrapper reserves capacity before calling `nodes7.S7ItemGroup.writeItems()`. One input message can generate several S7 WRITE_VAR PDUs. Independent direct library clients, reads, and other control operations can still queue in `nodes7.S7Connection._jobQueue`. The current `maxJobs` option limits concurrent jobs, **not the queue length**.

Do not advertise global S7 traffic throttling, protocol-level fairness, exactly-once side effects, atomic multi-PDU writes, or a known PLC outcome after a missing acknowledgement. A separate independently reviewed nodes7 API/PR, followed by a new immutable wrapper pin, is required for those contracts.

## Minimal isolated example

The following example is a *configuration fragment*, not a PLC-ready production flow. Use only a disposable loopback S7Comm fixture and a synthetic scratch DB.

```json
{
  "type": "s7 endpoint",
  "name": "Synthetic S7 test endpoint",
  "transport": "iso-on-tcp",
  "address": "127.0.0.1",
  "port": 1102,
  "connmode": "rack-slot",
  "rack": 0,
  "slot": 1,
  "cycletime": 0,
  "timeout": 2000,
  "boundedWrites": true,
  "vartable": [{ "name": "scratch", "addr": "DB1,REAL0" }]
}
```

Connect two `s7 out` nodes to that **same** endpoint, with separate Inject sources and a scoped Catch node observing both. Hold the fixture's first WRITE_VAR acknowledgement and trigger the second write. Expected: one wire-level write from the first input, `ERR_S7_WRITE_BUSY` on the second input in Catch, zero second write packets, and no queued replay after the first promise settles. Normal unknown-variable or array-length validation still rejects before submission.

## Qualification and rollback

- Unit: bounded concurrency across two outputs; burst rejection; successful settlement; timeout/no-replay; synchronous failures; output/endpoint close. Same assertions red on original protected master `bc7efd2d38a123f68a2c3654b6c40286b681e7a9`, green on candidate.
- Installed Node-RED 5.0.9: both install modes on Windows/Linux with Node 22/24; two actual S7 Out nodes, synthetic loopback S7Comm write with missing ACK, scoped Catch and zero extra wire writes.
- Existing legacy unit, actual S7Comm, negative control, static quality, CodeQL, packaging and runtime suites remain mandatory. A green CI run on a PR head is not hardware certification.
- **HIL-S7-003, HIL-S7-006 and HIL-S7-007 are PENDING_HARDWARE.** Do not connect this flow or its test commands to a real PLC.
- Rollback without code changes: uncheck the endpoint option (restores legacy admission); for a code rollback, revert the entire feature PR before release. Disabling the bound increases possible concurrent writes, so disabling it is not a safety fix. Do not automatically replay writes with unknown outcomes.

AI-assisted implementation and review must be disclosed in the PR; all high-impact merge, release, deployment and physical-write decisions remain with the human maintainer.
