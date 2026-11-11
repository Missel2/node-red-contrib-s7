'use strict';
// These unit tests isolate Node-RED and nodes7. They do NOT test a real S7 socket.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourceFile = process.env.S7_TEST_SOURCE || path.join(__dirname, '../../red/s7.js');
const source = fs.readFileSync(path.resolve(sourceFile), 'utf8');

function pending() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function fixture({ boundedWrites = false } = {}) {
    const types = new Map(), timers = new Set(), errors = [], events = [];
    let group, endpointNode;
    const statuses = new Map();
    class Transport extends EventEmitter {
        constructor() {
            super();
            this.disconnectCount = 0;
            this.disconnectPromise = Promise.resolve();
        }
        disconnect() {
            this.disconnectCount++;
            return this.disconnectPromise;
        }
    }
    class ItemGroup {
        constructor(endpoint) {
            this.endpoint = endpoint;
            this.nextRead = () => Promise.resolve({ tag: 42 });
            group = this;
        }
        setTranslationCB(fn) { this.translate = fn; }
        addItems(keys) { this.keys = keys; }
        readAllItems() { return this.nextRead(); }
        writeItems() { return Promise.resolve(); }
    }
    const RED = {
        _: key => key,
        auth: { needsPermission: () => () => {} },
        httpAdmin: { get: () => {} },
        nodes: {
            registerType: (name, ctor) => types.set(name, ctor),
            getNode: id => id === 'fixture-endpoint' ? endpointNode : null,
            createNode: node => {
                Object.setPrototypeOf(node, EventEmitter.prototype);
                node.error = (err, msg) => errors.push({ err, msg });
                node.warn = () => {};
                node.status = status => statuses.set(node, status);
                node.send = () => {};
            }
        }
    };
    const sandbox = {
        module: { exports: {} },
        require: id => {
            if (id === 'events') return require('node:events');
            if (id === '../src/tools.js') return {};
            if (id === '@st-one-io/nodes7') return { S7Endpoint: Transport, S7ItemGroup: ItemGroup };
            throw Error('Unexpected require ' + id);
        },
        setInterval(fn, ms) {
            const id = { fn, ms };
            timers.add(id);
            return id;
        },
        clearInterval(id) { timers.delete(id); }
    };
    vm.runInNewContext(source, sandbox, { filename: 'red/s7.js' });
    sandbox.module.exports(RED);
    const Endpoint = types.get('s7 endpoint');
    assert.ok(Endpoint);
    const node = new Endpoint({
        transport: 'iso-on-tcp', connmode: 'rack-slot', address: '127.0.0.1',
        port: 1102, rack: 0, slot: 1, timeout: 200, cycletime: 50,
        boundedWrites,
        vartable: [{ name: 'tag', addr: 'DB1,REAL0' }]
    });
    endpointNode = node;
    const Output = types.get('s7 out');
    node.on('__STATUS__', s => events.push(s.status));
    const createOutput = () => new Output({ endpoint: 'fixture-endpoint', variable: '' });
    return { node, transport: node.endpoint, group, timers, errors, events, createOutput, statuses };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const close = node => new Promise(resolve => node.emit('close', resolve));

test('baseline endpoint starts offline with the configured variable mapping', () => {
    const { node, group, timers, errors } = fixture();
    assert.equal(node.getStatus(), 'offline');
    assert.equal(group.translate('tag'), 'DB1,REAL0');
    assert.equal(Array.from(group.keys).join(','), 'tag');
    assert.equal(timers.size, 0);
    assert.equal(errors.length, 0);
});

test('baseline connection produces status and a successful synthetic read', async () => {
    const { node, transport, timers, events } = fixture();
    const all = [], changed = [];
    node.on('__ALL__', values => all.push(values));
    node.on('__CHANGED__', data => changed.push(data));
    transport.emit('connect');
    assert.equal(node.getStatus(), 'online');
    assert.equal(timers.size, 1);
    assert.equal([...timers][0].ms, 50);
    node.doCycle();
    await tick();
    assert.equal(all.length, 1);
    assert.equal(all[0].tag, 42);
    assert.equal(changed.length, 1);
    assert.equal(changed[0].key, 'tag');
    assert.equal(changed[0].value, 42);
    transport.emit('disconnect');
    assert.equal(events.at(-1), 'offline');
    assert.equal(node.getStatus(), 'offline');
});

test('baseline cyclic interval can be changed and disabled', () => {
    const { node, transport, timers } = fixture();
    transport.emit('connect');
    assert.equal(node.updateCycleTime(180), undefined);
    assert.equal(timers.size, 1);
    assert.equal([...timers][0].ms, 180);
    assert.equal(node.updateCycleTime(0), undefined);
    assert.equal(timers.size, 0);
    assert.ok(node.updateCycleTime(-1), 'negative interval is rejected');
});

test('baseline writes invoke the existing mocked item group and completion callback', async () => {
    const { node, group, errors } = fixture();
    const writes = [];
    group.writeItems = (name, value) => {
        writes.push({ name, value });
        return Promise.resolve();
    };
    await new Promise((resolve, reject) =>
        node.writeVar({ name: 'tag', val: 18, done: err => err ? reject(err) : resolve() }));
    assert.deepEqual(writes, [{ name: 'tag', value: 18 }]);
    assert.equal(errors.length, 0);
});

test('repeated triggers during an unresolved read coalesce into one follow-up', async () => {
    // HIL-S7-005: pending real CPU repeated-trigger/reconnect test.
    // This positive baseline is mocked; it is not hardware evidence.
    const { node, transport, group } = fixture();
    const first = pending();
    const observed = [];
    node.on('__ALL__', values => observed.push(values.tag));
    let calls = 0;
    group.nextRead = () => ++calls === 1 ? first.promise : Promise.resolve({ tag: 22 });

    transport.emit('connect');
    node.doCycle();
    node.doCycle();
    node.doCycle();
    assert.equal(calls, 1, 'pending read must prevent overlapping triggers');

    first.resolve({ tag: 11 });
    await tick();
    assert.equal(calls, 2, 'multiple triggers must coalesce to one follow-up');
    assert.deepEqual(observed, [11, 22]);
});

// HIL: not applicable. Validation fails before a request reaches the transport.
for (const { name, message, error } of [
    { name: 'unknown scalar', message: { variable: 'missing', payload: 5 }, error: 's7.error.varunknown' },
    { name: 'unknown array member', message: { variable: ['tag', 'missing'], payload: [5, 6] }, error: 's7.error.varunknown' },
    { name: 'array value mismatch', message: { variable: ['tag'], payload: [] }, error: 's7.error.valmismatch' }
]) {
    test('S7 Out rejects ' + name + ' once through the input completion callback', () => {
        const { group, createOutput, errors, statuses } = fixture();
        let writes = 0;
        group.writeItems = () => { writes++; return Promise.resolve(); };
        const output = createOutput();
        const completions = [];

        output.emit('input', message, () => assert.fail('Invalid write sent output'), err => completions.push(err));

        assert.deepEqual(completions, [error]);
        assert.equal(statuses.get(output).fill, 'yellow');
        assert.equal(writes, 0);
        assert.deepEqual(errors, []);
    });
}

test('S7 Out preserves the originating message through the legacy input shim', () => {
    const { createOutput, errors } = fixture();
    const output = createOutput();
    const message = { variable: 'missing', payload: 5, _msgid: 'fixture-request' };

    output.emit('input', message);

    assert.deepEqual(errors, [{ err: 's7.error.varunknown', msg: message }]);
});

/*
 * Issue #19 contract characterization: these tests describe the *current*
 * callback/admission limitations. They are not a bounded-write implementation.
 * HIL-S7-003/-006/-007 remain PENDING_HARDWARE. No PLC or TCP connection.
 */
test('write outcome baseline: a pending successful acknowledgement completes once', async () => {
    const { group, createOutput } = fixture();
    const gate = pending();
    const requests = [];
    group.writeItems = (name, val) => {
        requests.push({ name, val });
        return gate.promise;
    };
    const output = createOutput();
    const message = { _msgid: 'ack-characterization', topic: 'sample', variable: 'tag', payload: 9 };
    const doneCalls = [];
    output.emit('input', message, () => assert.fail('S7 Out sends no success payload'), err => doneCalls.push(err));

    assert.equal(requests.length, 1);
    assert.deepEqual(doneCalls, [], 'No Complete before writeItems settles');
    gate.resolve();
    await tick();
    assert.deepEqual(doneCalls, [undefined], 'One protocol-level success completion');
    assert.equal(message.payload, 9);
    assert.equal(message.topic, 'sample');
});

test('write outcome baseline: lost acknowledgement remains an error and is not replayed', async () => {
    const { group, transport, createOutput } = fixture();
    const gate = pending();
    let requests = 0;
    group.writeItems = () => { requests++; return gate.promise; };
    const output = createOutput();
    const message = { _msgid: 'unknown-outcome', topic: 'sample', variable: 'tag', payload: 10 };
    const completions = [];
    transport.emit('connect');
    output.emit('input', message, () => assert.fail('S7 Out sends no success payload'), err => completions.push(err));

    assert.equal(requests, 1);
    transport.emit('disconnect');
    transport.emit('connect');
    const timeout = Object.assign(new Error('synthetic lost acknowledgement'), { code: 'ERR_TIMEOUT' });
    gate.reject(timeout);
    await tick();
    assert.deepEqual(completions, [timeout], 'Preserve the exact timeout without a fake not-applied claim');
    assert.equal(requests, 1, 'Transport status changes must not replay a submitted write');
    assert.equal(message.payload, 10);
    assert.equal(message.topic, 'sample');
    // HIL-S7-006: whether the PLC actually applied the write is UNKNOWN.
});

test('write admission BASELINE-RED: three unresolved writes are currently admitted', async () => {
    const { group, createOutput } = fixture();
    const gates = [pending(), pending(), pending()];
    const requests = [], completions = [];
    group.writeItems = (name, val) => {
        requests.push({ name, val });
        return gates[requests.length - 1].promise;
    };
    const output = createOutput();
    for (let i = 0; i < 3; i++) {
        output.emit('input', { _msgid: 'pending-' + i, variable: 'tag', payload: i },
            () => assert.fail('S7 Out sends no success payload'),
            err => completions.push(err));
    }
    assert.equal(requests.length, 3, 'CURRENT GAP: the wrapper does not bound pending writes');
    assert.deepEqual(completions, []);
    assert.throws(
        () => assert.ok(requests.length <= 1, 'Proposed maxPendingWrites=1 is not enforced'),
        { name: 'AssertionError' },
        'The proposed bounded-admission assertion must be RED on the baseline'
    );
    for (const gate of gates) gate.resolve();
    await tick();
    assert.deepEqual(completions, [undefined, undefined, undefined]);
    // After an approved admission fix, replace this baseline expectation with
    // the same-test red-on-current / green-on-candidate bounded assertion.
});

test('write close BASELINE-RED: a pending callback can settle after S7 Out closes', async () => {
    const { group, createOutput } = fixture();
    const gate = pending();
    group.writeItems = () => gate.promise;
    const output = createOutput();
    const completions = [];
    output.emit('input', { variable: 'tag', payload: 11 },
        () => assert.fail('S7 Out sends no success payload'),
        err => completions.push(err));
    let closed = 0;
    output.emit('close', () => closed++);
    assert.equal(closed, 1);
    assert.deepEqual(completions, [], 'Write remains unsettled at close');
    gate.resolve();
    await tick();
    assert.deepEqual(completions, [undefined], 'CURRENT GAP: late success callback after close');
    // HIL-S7-007: future candidate must define close ownership without
    // asserting it can retract an already submitted PLC write.
});


/*
 * Issue #19 opt-in contract. The same assertions must FAIL on the immutable
 * pre-admission wrapper source bc7efd2d and PASS on this candidate.
 * They use only a controlled in-memory ItemGroup (not Siemens hardware).
 * HIL-S7-003/-006/-007 stay PENDING_HARDWARE.
 */
test('write admission CONTRACT: two outputs share one pending slot with no queue', async () => {
    const { group, createOutput } = fixture({ boundedWrites: true });
    const gate = pending();
    const calls = [];
    group.writeItems = (name, value) => {
        calls.push({ name, value });
        return gate.promise;
    };
    const first = createOutput(), second = createOutput();
    const success = [], rejected = [];
    const original = { _msgid: 'first', topic: 'A', variable: 'tag', payload: 1 };
    const excess = { _msgid: 'excess', topic: 'B', variable: 'tag', payload: 2 };
    first.emit('input', original, () => assert.fail('S7 Out never sends a success payload'), error => success.push(error));
    second.emit('input', excess, () => assert.fail('Excess write must never send a payload'), error => rejected.push(error));
    assert.equal(calls.length, 1, 'The two outputs must share the endpoint-wide capacity');
    assert.deepEqual(calls[0], { name: 'tag', value: 1 });
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].code, 'ERR_S7_WRITE_BUSY');
    assert.deepEqual(success, []);
    assert.equal(original.payload, 1);
    assert.equal(excess.topic, 'B', 'Never change user message contents');

    gate.resolve();
    await tick();
    assert.deepEqual(success, [undefined]);
    assert.equal(rejected.length, 1, 'No implicit retry of the rejected message');

    const another = pending();
    group.writeItems = (name, value) => {
        calls.push({ name, value });
        return another.promise;
    };
    const resumed = [];
    second.emit('input', { variable: 'tag', payload: 3 }, () => assert.fail('No success payload'), error => resumed.push(error));
    assert.equal(calls.length, 2, 'A new explicit command is allowed after settlement');
    another.resolve();
    await tick();
    assert.deepEqual(resumed, [undefined]);
});

test('write admission CONTRACT: closing output reports unknown once and holds slot', async () => {
    const { group, createOutput } = fixture({ boundedWrites: true });
    const gate = pending();
    let writes = 0;
    group.writeItems = () => { writes++; return gate.promise; };
    const output = createOutput(), sibling = createOutput();
    const completions = [], rejected = [];
    output.emit('input', { variable: 'tag', payload: 11 }, () => assert.fail('No payload'), error => completions.push(error));
    let closed = 0;
    output.emit('close', () => closed++);
    assert.equal(closed, 1);
    assert.equal(completions.length, 1, 'An owned pending write needs a terminal callback at close');
    assert.equal(completions[0].code, 'ERR_S7_WRITE_CLOSE_UNKNOWN');
    sibling.emit('input', { variable: 'tag', payload: 12 }, () => assert.fail('No payload'), error => rejected.push(error));
    assert.equal(writes, 1, 'Closing output cannot free an in-flight PLC write prematurely');
    assert.equal(rejected[0].code, 'ERR_S7_WRITE_BUSY');

    gate.resolve();
    await tick();
    assert.equal(completions.length, 1, 'No late success after the output has closed');
    assert.equal(writes, 1, 'Rejected write is not replayed');
});

test('write admission CONTRACT: closing endpoint finishes pending and refuses new writes', async () => {
    const { node, group, transport, createOutput } = fixture({ boundedWrites: true });
    const gate = pending();
    let writes = 0;
    group.writeItems = () => { writes++; return gate.promise; };
    const output = createOutput(), completions = [], rejected = [];
    output.emit('input', { variable: 'tag', payload: 20 }, () => assert.fail('No payload'), error => completions.push(error));
    await close(node);
    assert.equal(transport.disconnectCount, 1);
    assert.equal(completions.length, 1);
    assert.equal(completions[0].code, 'ERR_S7_WRITE_CLOSE_UNKNOWN');
    output.emit('input', { variable: 'tag', payload: 21 }, () => assert.fail('No payload'), error => rejected.push(error));
    assert.equal(writes, 1, 'Never dispatch after endpoint close');
    assert.equal(rejected[0].code, 'ERR_S7_WRITE_CLOSED');
    gate.reject(Object.assign(new Error('late synthetic timeout'), { code: 'ERR_TIMEOUT' }));
    await tick();
    assert.equal(completions.length, 1, 'Late transport error must not overwrite unknown-close outcome');
});

test('write admission: synchronous submission failure releases the slot', async () => {
    const { group, createOutput } = fixture({ boundedWrites: true });
    let writes = 0;
    const error = new Error('synthetic pre-transport error');
    group.writeItems = () => { writes++; throw error; };
    const output = createOutput(), completions = [];
    output.emit('input', { variable: 'tag', payload: 22 }, () => assert.fail('No payload'), e => completions.push(e));
    assert.deepEqual(completions, [error]);
    output.emit('input', { variable: 'tag', payload: 23 }, () => assert.fail('No payload'), e => completions.push(e));
    assert.equal(writes, 2, 'The rejected synchronous submission cannot permanently occupy capacity');
    assert.deepEqual(completions, [error, error]);
});

test('write admission CONTRACT: burst rejects excess without storing or replaying it', async () => {
    const { group, createOutput, transport } = fixture({ boundedWrites: true });
    const gate = pending();
    let writes = 0;
    group.writeItems = () => { writes++; return gate.promise; };
    const output = createOutput(), results = [];
    for (let i = 0; i < 32; i++) {
        output.emit('input', { variable: 'tag', payload: i },
            () => assert.fail('No success payload'),
            error => results.push({ i, code: error && error.code }));
    }
    assert.equal(writes, 1, 'No hidden write queue is permitted at the wrapper boundary');
    assert.equal(results.length, 31);
    assert.ok(results.every(r => r.code === 'ERR_S7_WRITE_BUSY'));
    transport.emit('disconnect');
    transport.emit('connect');
    gate.reject(Object.assign(new Error('synthetic lost ACK'), { code: 'ERR_TIMEOUT' }));
    await tick();
    assert.equal(results.length, 32);
    assert.equal(results.at(-1).i, 0);
    assert.equal(results.at(-1).code, 'ERR_TIMEOUT');
    assert.equal(writes, 1, 'Reconnect cannot replay an ambiguous write');
});
