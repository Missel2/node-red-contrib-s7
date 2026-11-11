> **Implementation follow-up (unmerged):** [PR #41](https://github.com/Missel2/node-red-contrib-s7/pull/41) proposes the first opt-in wrapper-side single-write admission and owned close handling, based on protected `master` `bc7efd2d38a123f68a2c3654b6c40286b681e7a9`. Until an exact-head CI/review and explicit human squash-merge, this is *candidate code only*. The proposed outcome-metadata schema and truly bounded nodes7 job queue are still separate future stages. See [operator/technical behavior](WRITE_ADMISSION_OPT_IN.md). All physical HIL remains pending.

# Proposed write-outcome and bounded-admission contract (Issue #19)

> **Status: PROPOSED; NOT IMPLEMENTED OR ACCEPTED AS A RUNTIME CONTRACT.**
> This is the next design/test milestone after approved PR #23. It is not a
> promise of bounded write queues, a new public message API or hardware safety.
> Human review and a separate implementation PR are required for each phase.

## Evidence and ownership — baseline 2026-11-11

Protected wrapper `master`: `6859f4f59de372db729da7575f0f0b36fcb5f296`; pinned nodes7:
`95d5c511b2073b9d306ffe47fef186a7738f2254`.
Node-RED host: **unmodified upstream 5.0.9**, never overridden or patched
to hide upstream security advisories. Sources, not old continuation text:

- `red/s7.js`: `S7Out.onNewMsg` validates the variable/matching values
  and then invokes `node.endpoint.writeVar(writeObj)`.
  `S7Endpoint.writeVar` forwards the `itemGroup.writeItems()` promise:
  resolve calls `done()`, rejection calls `done(error)`. PR #23 makes
  *pre-send* validation errors correlated to the original input in Catch.
  There is **no wrapper-level pending-write capacity or cancel owner** today.
- `nodes7/src/s7itemGroup.js#writeItems` may turn a multi-variable write
  into **multiple** `writeVars` calls and awaits `Promise.all`. One
  failure cannot prove that every other request was rejected or rolled back.
- `nodes7/src/s7connection.js#sendRaw` appends to `_jobQueue`.
  `maxJobs` limits the **simultaneous active jobs**, not this queue's
  length. `clearQueue()` rejects not-yet-processed jobs; a rejection
  propagated to this wrapper does not reveal which telegrams crossed the
  transport boundary.
- Installed software-loopback PR #24/#23 checks establish **one observed
  write, one suppressed write ACK, `ERR_TIMEOUT`, no automatic replay** and
  a later readback of the synthetic applied value. A loss of response
  does **not** establish non-application.

**Ownership:** Wrapper controls admission, one-shot Node-RED completion,
Catch attribution and opt-in message metadata. The maintained nodes7 fork
owns PDU/job scheduling, any true *global* transport queue bound and a
future explicit `not-sent` signal. Fixes in nodes7 require an independently
approved nodes7 PR and a **separate** reviewed wrapper dependency-pin PR.

## Outcome taxonomy (proposed, conservative)

| Candidate state | Evidence needed | Caller action / safety |
| --- | --- | --- |
| `rejected_before_dispatch` | Wrapper validation, endpoint closing, or admission-capacity rejection **before invoking `writeItems`**; no S7 request was handed off | Catch with original input; safe to conclude wrapper did not submit this command; never say physical PLC changed |
| `acknowledged` | All required successful S7 WRITE_VAR responses observed through `writeItems` resolution | Completion once; protocol-acknowledged, **not** proof of durable PLC/process effects or an external readback |
| `protocol_rejected` | Specific negative S7 reply matched to the **entire single request** and proven not to have applied data | Catch; do not generalize this state to a multi-PDU write without per-part evidence |
| `unknown` | A command was handed to `writeItems` and a timeout, disconnect, interrupted job, missing ACK, partial batch response or ambiguous transport error follows | Catch with uncertainty explicitly described; **no implicit retry**; only a deliberately authorized read/reconciliation can determine observed state |

Conservative fallback: **after entering `writeItems`, classify every
unproven error as `unknown`, including `ERR_NOT_CONNECTED` if no
independent pre-send proof exists.** No error-code-only guess may promote
`unknown` into `rejected_before_dispatch`. For multi-PDU writes, a
known rejected *part* can coexist with other successfully applied parts:
report `unknown` with `partialPossible=true`, not a global failure.
Never claim atomic PLC writes or exactly-once side effects from Node-RED
completion callbacks.

The current implementation returns raw errors, **not these states**;
this table is an explicit target for subsequent opt-in work.

## Proposed admission and cancellation boundary

First implementation stage: **opt-in** per configured **S7 endpoint**,
shared by its `s7 out` child nodes. Propose `maxPendingWrites=1`,
`maxQueuedWrites=0` as a conservative initial profile for a newly
enabled limit. A pending slot is reserved **before** calling
`writeItems` and released on the first terminal resolution/rejection;
a blocked input gets a synchronous `rejected_before_dispatch` Catch.
No buffered/reordered writes, no secret queue, no silent drop.
These numbers are **design candidates**, not already supported
configuration options and not a change to existing flow defaults.

Until a separately reviewed compatibility/migration decision, the
feature is disabled by default and **legacy flow throughput and
`payload`/`topic` remain unchanged**. Count individual *messages* at
the endpoint; one message may still require multiple S7 PDUs. A limit
implemented in an individual output node would not bound two output nodes
sharing the same configured endpoint.

A wrapper bound reduces user-originated write pressure only. It **cannot**
establish a complete transport budget: reads, control operations,
multiple PDUs and independent callers can still enqueue into
`nodes7.S7Connection._jobQueue`. Do not advertise “globally bounded S7
jobs” until nodes7 exposes a tested bounded, typed admission API and
this wrapper has pinned that approved fork. Future proposed transport
capacity must cover **queued + active**, preserve fairness and reject
excess requests explicitly, not evict already-dispatched writes.

**On stop/redeploy:** reject wrapper-owned **not-yet-submitted** work
without sending it. Already submitted work cannot be safely canceled
at the wrapper level: close may terminate the transport while PLC-side
application remains unknown. Preserve at-most-one Node-RED completion
per accepted message; no late success to a destroyed flow, no
reconnect-driven replay or re-enqueue. If final completion attribution
requires an owned operation lifetime, define it and test it before
changing live behavior. Canceling a JavaScript promise does not undo an
S7 packet or a PLC side effect.

## Opt-in diagnostics — candidate v1 shape, not shipped

If reviewed later, consider an **opt-in** namespaced original-message
field such as `msg._s7WriteV1`:

```json
{
  "version": 1,
  "operationId": "local-opaque-id",
  "outcome": "unknown",
  "stage": "submitted_unconfirmed",
  "code": "ERR_TIMEOUT",
  "partialPossible": true
}
```

These are **illustrative** names and values; neither the namespace nor
the message schema is accepted or implemented here. The absence of a
verified library **on-wire submission** event requires wording such as
`submitted_unconfirmed`; `sentToPLC` would be unjustified. Metadata
must be attached only with explicit per-node opt-in, including error
Catch messages, without replacing `msg.payload`, `msg.topic`, user
`_msgid`, or silently overwriting an existing user-owned property.
No PLC address, plant topology, payload, secrets or unbounded raw error
trace in diagnostics; error codes and bounded ephemeral counters only.
Default legacy `done(error)` / Catch behavior stays unchanged.

A schema version, example flow, English/German help/locales and
compatibility/rollback statement are mandatory in its implementation PR.
Do not break existing Node-RED flows with a changed default message shape.

## Tests as acceptance gates — explicit baseline versus future candidate

| Scenario | Baseline fact / current evidence | Future implementation gate |
| --- | --- | --- |
| Invalid variable, member, array | Merged PR #23: one tagged Catch, zero Complete/wire writes | Preserve 8/8 installed Node-RED strict cases and unit negative controls |
| Successful `writeItems` resolution | Wrapper calls `done()` once on mocked reply | Preserve protocol-level success; do not call “durable PLC confirmation” |
| Applied synthetic write, ACK lost | Software peer observed one request and `ERR_TIMEOUT`; no replay; readback sees change | Opt-in `unknown` metadata and no automatic retry across reconnect |
| Three distinct writes kept unresolved | **New baseline characterization:** wrapper presently admits all three, no shared cap | Same-test **red on current / green on candidate** with endpoint-wide bound, no queued sends after close |
| Close while an accepted write is pending | **New baseline characterization:** callback may settle after output close | No late success event on a removed flow, explicit owner and documented terminal outcome |
| Multi-PDU mixed success/failure | Code splits packets via `Promise.all`, no rollback guarantee | Inject partial responses: `unknown` / `partialPossible`, never assert all-or-nothing |
| Unlimited protocol queue | Current `sendRaw` push lacks a capacity check | Separate nodes7 red/green PDU tests and approved immutable pin update |
| Stress/fairness | Unmeasured; do not invent a safe throughput ceiling | Set finite budget and record queued/active peaks before cleanup; prove close drains and no starvation |

The new wrapper characterization tests deliberately document currently
unbounded/late-completion behavior as **known gaps**; their green CI is
**not evidence those gaps have been fixed**. Future remediation must
replace these baseline expectations with an explicit same-test
red-on-current/green-on-candidate comparison, including a negative
control that would fail if the proposed limit were removed.

## Ordered implementation milestones (separate PRs)

1. **This PR:** review the proposed contract and add deterministic
   no-hardware wrapper characterizations. Zero runtime/API changes.
2. Wrapper-only opt-in endpoint-wide admission **without a queue**,
   with a bounded slot, explicit rejection and close ownership.
   Test old behavior as red-on-current, new behavior green on candidate,
   and retained default legacy semantics. No hidden retries.
3. Optional outcome diagnostics v1 in an independently reviewed PR.
   Validate actual installed Node-RED Catch/Complete events (both
   install modes × two OS × two Node versions); do not guess wire state.
4. Independently address global PDU/job queue bounds within nodes7,
   cross-repo evidence and pin governance. Only then evaluate
   supported `maxQueuedWrites > 0`, fairness and more throughput.
5. Hardware/HIL only after named Siemens S7-1200, firmware, isolated
   scratch DB and separate explicit operator authorization.

**HIL:** HIL-S7-003 (safe write/readback), HIL-S7-006 (lost ACK) and
HIL-S7-007 (redeploy/pending write) all **PENDING_HARDWARE**.
These are software design and isolated unit-characterization tests.
No npm publication, deployment, machine I/O or automatic merge.
