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

function fixture() {
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
