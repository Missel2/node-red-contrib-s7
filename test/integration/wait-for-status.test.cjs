'use strict';
// Issue #16: a timed-out Node-RED/S7 wire harness must never leave
// an orphan polling task or referenced timer behind. HIL: not applicable
// to the test harness itself; HIL-S7-001/002/003/007 remain pending.
const test = require('node:test');
const assert = require('node:assert/strict');
const {setTimeout: delay} = require('node:timers/promises');
const waitForStatus = require('./wait-for-status.cjs');

test('offline handshake rejects on deadline and stops all future status polling', async () => {
    let reads = 0;
    const started = Date.now();
    await assert.rejects(
        waitForStatus(() => { reads++; return 'offline'; }, 'online', 60, 5),
        /HARNESS_TIMEOUT real wrapper S7 handshake/
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 40 && elapsed < 1500, 'timeout should be bounded, not 12-minute CI');
    const readsAtTimeout = reads;
    await delay(75);
    assert.equal(reads, readsAtTimeout, 'no detached loop may poll after rejection');
    assert.ok(readsAtTimeout >= 2, 'test must exercise polling, not immediate failure');
});

test('online handshake succeeds without waiting for deadline', async () => {
    let reads = 0;
    await waitForStatus(() => (++reads === 3 ? 'online' : 'connecting'), 'online', 250, 2);
    assert.equal(reads, 3);
});

test('already-online status does not create a timer', async () => {
    let reads = 0;
    await waitForStatus(() => {reads++;return 'online';}, 'online', 250, 2);
    assert.equal(reads, 1);
});

test('invalid deadlines and polling periods fail closed without scheduling', async () => {
    for (const [timeout,interval] of [[0,5],[-1,5],[20,0],[20,-1]]) {
        await assert.rejects(waitForStatus(() => 'connecting','online',timeout,interval), /positive/);
    }
});
