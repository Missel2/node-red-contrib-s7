'use strict';
// Cross-PR integration safety gate: fixture sources are borrowed at an exact
// reviewed PR #10 commit for CI only; this file is owned by PR #15.
// HIL-S7-001/002/003/005 PENDING_HARDWARE. No real PLC test/writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '../../test-reports');
const expectedNames = [
    's7-wire-evidence.json',
    's7-restart-evidence.json',
    's7-fault-evidence.json',
    's7-rst-evidence.json',
    's7-blackhole-evidence.json'
];
for (const name of expectedNames) {
    const filename = path.join(dir, name);
    assert.ok(fs.existsSync(filename), 'Expected successful S7Comm case must emit an evidence file: '+name);
    const record = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(record.hardware, false, 'hardware is not allowed in hosted CI: '+name);
}
const blackhole = JSON.parse(fs.readFileSync(path.join(dir, 's7-blackhole-evidence.json'),'utf8'));
assert.equal(blackhole.runsExpected,3);
assert.equal(blackhole.observations?.length,3);
for (const [i,cycle] of blackhole.observations.entries()) {
    assert.equal(cycle.index,i+1);
    assert.equal(cycle.acceptedSockets,1,'blackhole must establish one real TCP stream');
    assert.equal(cycle.receivedTpkt,true,'actual RFC1006 request must be received');
    assert.ok(cycle.bytesReceived >= 22,'complete 22-byte COTP request needed');
    assert.equal(cycle.endpointConnected,false);
    assert.equal(cycle.connectedEvents,0);
    assert.equal(cycle.failure?.resolved,false);
    assert.equal(cycle.failure?.fromHarness,false,'harness timeout is NOT valid failure');
    assert.equal(cycle.failure?.clientErrorCode,'ERR_TIMEOUT',
        'native 10-second transport watchdog must reject with ERR_TIMEOUT');
    assert.ok(cycle.durationMs>=9000&&cycle.durationMs<14500,
        'blackholed setup must end on the genuine client watchdog, not premature test teardown');
    if(cycle.visibleClientSocketsAfterClientFailure !== null)
        assert.equal(cycle.visibleClientSocketsAfterClientFailure,0,
            'native watchdog must destroy client TCP socket even before explicit disconnect');
    // The peer-side close event can be delivered a later event-loop turn:
    // do not infer a persistent leak solely from an immediate post-rejection count.
    assert.equal(cycle.explicitDisconnectResolved,true);
    assert.equal(cycle.fixtureServerClosed,true);
    assert.equal(cycle.peerSocketsStillOpenAfterExplicitDisconnect,0,
        'fixed fork must close blackholed COTP peer before fixture destroys it');
    if(cycle.visibleClientSocketsAfterExplicitDisconnect !== null)
        assert.equal(cycle.visibleClientSocketsAfterExplicitDisconnect,0,
            'no visible client TCP handle may remain before fixture cleanup');
}
const restart = JSON.parse(fs.readFileSync(path.join(dir, 's7-restart-evidence.json'),'utf8'));
assert.equal(restart.cycles?.length,2,'both actual server restart cycles must pass');
for(const cycle of restart.cycles){
    assert.equal(cycle.disconnected,true);
    assert.equal(cycle.reconnected,true);
    assert.equal(cycle.resetValueObserved,3.25,'real post-reconnect values must be fresh');
}
const rst = JSON.parse(fs.readFileSync(path.join(dir, 's7-rst-evidence.json'),'utf8'));
assert.equal(rst.resetSent,true,'actual TCP RST must have been sent');
assert.equal(rst.connectEvents,0,'never report success after TCP RST');
assert.equal(rst.connectRejected,true,'TCP RST must reject');
assert.equal(rst.harnessTimedOut,false,'harness timeout is not rejection');
const fault = JSON.parse(fs.readFileSync(path.join(dir, 's7-fault-evidence.json'),'utf8'));
assert.equal(fault.hardware,false);
assert.equal(fault.receivedTpkt,true);
assert.equal(fault.connectRejected,true);
console.log('PINNED_S7COMM_REPLAY_PASS: real DB read/write, 2 restarts, RST, COTP abort, 3 blackholes; no physical PLC');
