'use strict';
// Deadline-owned status polling for disposable S7 wire test harness only.
// Unlike Promise.race against an unbounded async loop, this function has
// no work left in flight after either fulfillment or rejection.
// HIL: not applicable to harness scheduling; hardware cases remain pending.
const {performance} = require('node:perf_hooks');

module.exports = async function waitForStatus(getStatus, expected, timeoutMs, intervalMs=25) {
    if (typeof getStatus !== 'function') throw new TypeError('getStatus must be a function');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
        !Number.isFinite(intervalMs) || intervalMs <= 0) {
        throw new RangeError('timeout and interval must be positive finite numbers');
    }
    const deadline = performance.now() + timeoutMs;
    for (;;) {
        if (getStatus() === expected) return;
        const remaining = deadline - performance.now();
        if (remaining <= 0) throw new Error('HARNESS_TIMEOUT real wrapper S7 handshake');
        await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, remaining)));
    }
};
