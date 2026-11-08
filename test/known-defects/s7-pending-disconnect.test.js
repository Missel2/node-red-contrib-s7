'use strict';
// Expected-RED test: defect characterization on actual nodes7@1.1.2, not a fix.
// HIL-S7-001/-005 remain PENDING_HARDWARE; only loopback TCP is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { S7Endpoint } = require('@st-one-io/nodes7');

const OUT = path.resolve(__dirname, '../../test-reports/s7-pending-disconnect-evidence.json');
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function within(promise, ms, label) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('HARNESS_TIMEOUT ' + label)), ms);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}
async function settles(promise, ms) {
    const pending = Symbol('pending');
    return await Promise.race([
        promise.then(() => true, () => true),
        sleep(ms).then(() => pending)
    ]) !== pending;
}

test('pending COTP handshake disconnect must promptly close socket', { timeout: 12000 }, async () => {
    const sockets = new Set();
    let accepted = 0;
    let firstBytes;
    let requestArrived;
    const request = new Promise(resolve => { requestArrived = resolve; });
    const server = net.createServer(socket => {
        accepted++;
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.once('data', data => {
            firstBytes = Buffer.from(data);
            requestArrived();
            // Keep real RFC1006/COTP connection request unanswered.
        });
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    const endpoint = new S7Endpoint({
        host: '127.0.0.1', port, rack: 0, slot: 1, autoReconnect: 0
    });
    let connectedEvents = 0;
    endpoint.on('connect', () => { connectedEvents++; });
    endpoint.on('error', () => {});
    // Handle any later rejection; never allow a pending connect promise to be
    // mistaken for a successful connect.
    const connecting = endpoint.connect().then(() => 'connected', () => 'rejected');
    const evidence = {
        dependency: '@st-one-io/nodes7@1.1.2',
        scenario: 'disconnect while initial COTP confirmation is blackholed',
        hardware: false, expectedBaselineFailure: true
    };
    try {
        await within(request, 3000, 'COTP request not received');
        evidence.accepted = accepted;
        evidence.requestBytes = firstBytes.length;
        evidence.validTPKT = firstBytes.length >= 4 &&
            firstBytes[0] === 3 && firstBytes[1] === 0;
        assert.equal(evidence.validTPKT, true, 'a real RFC1006 request must be received');
        const disconnect = endpoint.disconnect();
        evidence.disconnectSettledWithin600ms = await settles(disconnect, 600);
        const closed = new Promise(resolve => {
            const open = [...sockets].filter(socket => !socket.destroyed);
            if (!open.length) return resolve();
            let remaining = open.length;
            for (const socket of open) {
                socket.once('close', () => {
                    if (--remaining === 0) resolve();
                });
            }
        });
        evidence.peerClosedWithin600ms = await settles(closed, 600);
        evidence.peerSocketsBeforeCleanup = [...sockets].filter(s => !s.destroyed).length;
        evidence.connectedEvents = connectedEvents;
        evidence.endpointConnected = endpoint.isConnected;
        evidence.connectSettledAtObservation = await settles(connecting, 20);
        assert.equal(accepted, 1);
        assert.equal(connectedEvents, 0);
        assert.equal(evidence.disconnectSettledWithin600ms, true,
            'public disconnect() must settle promptly during COTP setup');
        assert.equal(evidence.peerClosedWithin600ms, true,
            'a pending TCP socket must close before the fixture destroys it');
        assert.equal(evidence.peerSocketsBeforeCleanup, 0,
            'the test fixture must not provide the client cleanup');
    } finally {
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
        for (const socket of sockets) socket.destroy();
        await within(new Promise(resolve => server.close(resolve)), 2500, 'listener close');
    }
});
