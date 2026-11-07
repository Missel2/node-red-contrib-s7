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
    let group;
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
            getNode: () => null,
            createNode: node => {
                Object.setPrototypeOf(node, EventEmitter.prototype);
                node.error = err => errors.push(err);
                node.warn = () => {};
                node.status = () => {};
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
    node.on('__STATUS__', s => events.push(s.status));
    return { node, transport: node.endpoint, group, timers, errors, events };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const close = node => new Promise(resolve => node.emit('close', resolve));

test('disconnect stops polling, reconnect has one timer, close cleans up', async () => {
    const { node, transport, timers } = fixture();
    transport.emit('connect');
    assert.equal(timers.size, 1);
    transport.emit('disconnect');
    assert.equal(node.getStatus(), 'offline');
    assert.equal(timers.size, 0);
    transport.emit('connect');
    assert.equal(timers.size, 1);
    assert.equal(await close(node), undefined);
    assert.equal(timers.size, 0);
    assert.equal(transport.disconnectCount, 1);
});

test('late successful read cannot resurrect disconnected status', async () => {
    const { node, transport, group, events } = fixture();
    const p = pending();
    group.nextRead = () => p.promise;
    transport.emit('connect');
    node.doCycle();
    await tick();
    transport.emit('disconnect');
    p.resolve({ tag: 99 });
    await tick();
    assert.equal(node.getStatus(), 'offline');
    assert.equal(events.at(-1), 'offline');
    await close(node);
});

test('late failure from an old session cannot mark a new session offline', async () => {
    const { node, transport, group, errors } = fixture();
    const p = pending();
    let reads = 0;
    group.nextRead = () => ++reads === 1 ? p.promise : Promise.resolve({ tag: 42 });
    transport.emit('connect');
    node.doCycle();
    await tick();
    transport.emit('disconnect');
    transport.emit('connect');
    p.reject(Error('old session'));
    await tick();
    assert.equal(reads, 2, 'new session starts one independent read after old failure');
    assert.equal(node.getStatus(), 'online');
    assert.equal(errors.length, 0);
    await close(node);
});

test('close reports dependency teardown failures', async () => {
    const { node, transport, timers, errors } = fixture();
    transport.emit('connect');
    const err = Error('disconnect rejected');
    transport.disconnectPromise = Promise.reject(err);
    assert.equal(await close(node), err);
    assert.equal(errors.length, 1);
    assert.equal(timers.size, 0);
});

test('close without initialized endpoint is safe', async () => {
    const { node } = fixture();
    node.endpoint = null;
    assert.equal(await close(node), undefined);
});

test('connection events after close cannot restart polling', async () => {
    const { node, transport, timers } = fixture();
    await close(node);
    transport.emit('connecting');
    transport.emit('connect');
    assert.equal(node.getStatus(), 'offline');
    assert.equal(timers.size, 0);
});

test('reconnect does not overlap an in-flight read and resumes when it settles', async () => {
    const { node, transport, group, errors } = fixture();
    const oldRead = pending();
    let calls = 0;
    group.nextRead = () => {
        calls++;
        return calls === 1 ? oldRead.promise : Promise.resolve({ tag: 11 });
    };
    transport.emit('connect');
    node.doCycle();
    await tick();
    assert.equal(calls, 1, 'one read belongs to the first connection');

    transport.emit('disconnect');
    transport.emit('connect');
    node.doCycle();
    await tick();
    assert.equal(calls, 1, 'a reconnect must not start a concurrent read');

    oldRead.resolve({ tag: 10 });
    await tick();
    assert.equal(calls, 2, 'a fresh read starts after the obsolete read settles');
    assert.equal(node.getStatus(), 'online');
    assert.equal(errors.length, 0);
    await close(node);
});

test('repeated triggers during an in-flight read coalesce into one next read', async () => {
    const { node, transport, group } = fixture();
    const firstRead = pending();
    let calls = 0;
    group.nextRead = () => {
        calls++;
        return calls === 1 ? firstRead.promise : Promise.resolve({ tag: 22 });
    };
    transport.emit('connect');
    node.doCycle();
    await tick();
    for (let i = 0; i < 20; i++) node.doCycle();
    assert.equal(calls, 1);
    firstRead.resolve({ tag: 21 });
    await tick();
    assert.equal(calls, 2, 'deferred requests must not multiply reads');
    await close(node);
});

test('downstream callback exceptions are reported without leaking the read guard', async () => {
    const { node, transport, errors } = fixture();
    const failure = Error('listener threw');
    node.on('__ALL__', () => { throw failure; });
    transport.emit('connect');
    node.doCycle();
    await tick();
    assert.equal(errors.length, 1);
    assert.equal(errors[0], failure);
    assert.equal(node.getStatus(), 'offline');
    await close(node);
});
