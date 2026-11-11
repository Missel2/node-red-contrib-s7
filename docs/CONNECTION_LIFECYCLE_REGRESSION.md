# Connection lifecycle: historical regression lead

**Evidence class:** historical engineering report; not independently sufficient proof of the correctness of any particular patch. This document contains no site or customer identifiers.

An earlier field report described a suspected transport lifecycle fault: if an ISO-on-TCP/COTP handshake fails or is interrupted, an in-progress connection may remain outside normal active-session teardown. Subsequent reconnect attempts may then accumulate resources. Any past deployment experience is not a substitute for a reproducible baseline/candidate test on the actual maintained source.

## Separate technical scopes

- **Node-RED wrapper:** poll timer cleanup, close completion, late callbacks and stale read publication after disconnection.
- **Classic S7Comm protocol dependency:** pending/active transport ownership, COTP handshake cancellation, timeout, socket destruction and listener cleanup.
- **Other S7 protocol implementations:** distinct dependencies and protocol behavior; do not merge unrelated patches without an explicit architecture review.

## Public minimum acceptance evidence

1. Reproduce a named failure on a specific source baseline using disposable local fixtures and publish only the synthetic reproduction.
2. Inject interrupted/stalled handshakes, TCP resets and repeat reconnect cycles before the session becomes active.
3. Measure application-managed sockets, listeners, errors, timers and process resources **before fixture cleanup**; TIME_WAIT alone does not prove a socket leak.
4. Run the same assertion on baseline and fixed candidate; link exact commit and CI job.
5. Verify normal synthetic S7Comm read/write and no automatic replay of ambiguous physical writes.
6. Keep complete site-specific operational evidence in a separate private system; publish only manually sanitized, non-identifying hardware summaries.

Use [the test strategy](TEST_STRATEGY.md) and [public disclosure policy](PUBLIC_DISCLOSURE_POLICY.md) for detailed boundaries. No public CI worker may connect to real controllers.
