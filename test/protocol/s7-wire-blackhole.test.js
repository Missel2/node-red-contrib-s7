'use strict';
// Real nodes7 classic COTP transport with a TCP peer that never replies.
// HIL-S7-001/-005: PENDING_HARDWARE; no physical CPU or production routes.
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { S7Endpoint } = require('@st-one-io/nodes7');

const EVIDENCE_FILE = path.resolve(__dirname, '../../test-reports/s7-blackhole-evidence.json');
const RUNS = 3;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function bounded(promise, ms, label) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('HARNESS_TIMEOUT: ' + label)), ms);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}

function instrumentedClientSocketCount(port) {
    // Node internal active-handle inventory: supplemental diagnostic only.
    // It may omit sockets / be platform-dependent; never call it a leak proof.
    if (typeof process._getActiveHandles !== 'function') return null;
    return process._getActiveHandles().filter(handle =>
        handle instanceof net.Socket && handle.remotePort === port && !handle.destroyed
    ).length;
}

async function runBlackholeAttempt(index) {
    const sockets = new Set();
    let accepted = 0;
    let bytesReceived = 0;
    let firstFour = [];
    const server = net.createServer(socket => {
        accepted++;
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('data', bytes => {
            bytesReceived += bytes.length;
            if (firstFour.length < 4) firstFour.push(...bytes.subarray(0, 4 - firstFour.length));
            // Deliberately NEVER reply to the initial RFC1006/COTP request.
            // Keep this connection open throughout the client's own watchdog.
        });
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    const endpoint = new S7Endpoint({
        host: '127.0.0.1', port, rack: 0, slot: 1,
        autoReconnect: 0, s7ConnOpts: { timeout: 1600 }
    });
    const events = { connects: 0, errors: [] };
    endpoint.on('connect', () => events.connects++);
    endpoint.on('error', error => events.errors.push(String(error)));
    const attempt = {
        index, listener: '127.0.0.1', scenario: 'TCP accepted; COTP reply blackholed',
        hardware: false
    };
    try {
        const start = Date.now();
        let outcome;
        try {
            await bounded(endpoint.connect(), 14500, 'blackholed COTP connection');
            outcome = { resolved: true };
        } catch (error) {
            outcome = {
                resolved: false,
                clientError: String(error),
                clientErrorCode: error.code || null,
                fromHarness: /HARNESS_TIMEOUT/.test(String(error))
            };
        }
        attempt.durationMs = Date.now() - start;
        attempt.acceptedSockets = accepted;
        attempt.receivedTpkt = firstFour.length === 4 &&
            firstFour[0] === 3 && firstFour[1] === 0;
        attempt.bytesReceived = bytesReceived;
        attempt.endpointConnected = endpoint.isConnected;
        attempt.connectedEvents = events.connects;
        attempt.failure = outcome;
        attempt.peerSocketsStillOpenAfterClientFailure =
            [...sockets].filter(s => !s.destroyed).length;
        attempt.visibleClientSocketsAfterClientFailure =
            instrumentedClientSocketCount(port);

        assert.equal(outcome.resolved, false, 'no COTP reply may produce a successful connection');
        assert.equal(outcome.fromHarness, false,
            'a harness timeout is a test FAILURE, not a client-originated rejection');
        assert.equal(accepted, 1, 'test must accept a real TCP connection');
        assert.equal(attempt.receivedTpkt, true, 'actual RFC1006 request must arrive');
        assert.equal(endpoint.isConnected, false);
        assert.equal(events.connects, 0, 'must not falsely report S7 connection');
        assert.ok(attempt.durationMs < 14500, 'client watchdog must bound blackholed setup');
        return attempt;
    } finally {
        try {
            await bounded(endpoint.disconnect(), 2000, 'client cleanup');
            attempt.explicitDisconnectResolved = true;
        } catch (error) {
            attempt.clientCleanupError = String(error);
            attempt.explicitDisconnectResolved = false;
        }
        // Give underlying async TCP close notifications a chance to run.
        // These are diagnostic observations, not a pass/fail leak-free claim.
        await sleep(200);
        attempt.peerSocketsStillOpenAfterExplicitDisconnect =
            [...sockets].filter(socket => !socket.destroyed).length;
        attempt.visibleClientSocketsAfterExplicitDisconnect =
            instrumentedClientSocketCount(port);
        // The fixture deliberately forces a close only AFTER recording whether
        // nodes7 closed the session on its own.
        for (const socket of sockets) socket.destroy();
        let serverClosed = false;
        try {
            await bounded(new Promise((resolve, reject) =>
                server.close(error => error ? reject(error) : resolve())
            ), 4000, 'blackhole listener cleanup');
            serverClosed = true;
        } finally {
            attempt.fixtureServerClosed = serverClosed;
        }
    }
}

test('real nodes7 COTP blackhole is bounded across three repeated attempts', { timeout: 72000 }, async t => {
    fs.mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
    const evidence = {
        fixture: 'Node.js net.Server; actual @st-one-io/nodes7@1.1.2',
        fault: 'TCP accepted but all COTP replies withheld',
        runsExpected: RUNS, hardware: false, observations: [],
        note: 'Peer sockets and Node active handles are diagnostics, not proof of leak freedom'
    };
    t.after(() => {
        fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
    });
    for (let n = 1; n <= RUNS; n++) {
        const result = await runBlackholeAttempt(n);
        evidence.observations.push(result);
        assert.equal(result.fixtureServerClosed, true,
            'each temporary server must close before starting a new attempt');
    }
    assert.equal(evidence.observations.length, RUNS);
    assert.ok(evidence.observations.every(o => !o.failure.fromHarness));
    t.diagnostic('All three blackholed connections rejected by the dependency; ' +
        'inspect s7-blackhole-evidence.json for peer sockets still open after its watchdog');
});
