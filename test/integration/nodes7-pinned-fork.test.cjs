'use strict';
// Reproducible cross-repository contract: the exact published scoped
// nodes7 alpha arrives through the legacy import alias, SHA-512 verified.
// HIL-S7-001/005/007 remain PENDING_HARDWARE. Loopback-only, no PLC writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const {EventEmitter} = require('node:events');
const nodes7 = require('@st-one-io/nodes7');
const {ISOOnTCPParser, constants} = require('iso-on-tcp');
const OUT = path.resolve(__dirname, '../../test-reports');
const RELEASE_NAME='@missel2/nodes7';
const RELEASE_VERSION='0.1.0-alpha.1';
const RELEASE_SPEC='npm:'+RELEASE_NAME+'@'+RELEASE_VERSION;
const RELEASE_URL='https://registry.npmjs.org/@missel2/nodes7/-/nodes7-'+RELEASE_VERSION+'.tgz';
const RELEASE_INTEGRITY='sha512-07lzsDrfxQ5P15iM/+rjxNVbo0gyIGWjKivXfgU/tEUQs1qO+A0upy6690qy85mG7mEiNpek1xqhRVASvb9ktw==';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function persist(name, data) {
    fs.mkdirSync(OUT, {recursive:true});
    fs.writeFileSync(path.join(OUT,name), JSON.stringify({
        provenance: RELEASE_NAME+'@'+RELEASE_VERSION, integrity: RELEASE_INTEGRITY, platform: process.platform,
        node: process.version, hardware: false, ...data
    }, null, 2) + '\n');
}
function deadline(p, ms, label) {
    let timer;
    return Promise.race([
        Promise.resolve(p),
        new Promise((_,rej) => { timer=setTimeout(()=>rej(Error('HARNESS_TIMEOUT '+label)),ms); })
    ]).finally(()=>clearTimeout(timer));
}
function observed(p,ms) {
    let timer;
    return Promise.race([
        Promise.resolve(p).then(()=>({state:'fulfilled'}),e=>({state:'rejected',code:e?.code||null})),
        new Promise(resolve=>{timer=setTimeout(()=>resolve({state:'pending'}),ms)})
    ]).finally(()=>clearTimeout(timer));
}
function handles(port) {
    const h=typeof process._getActiveHandles==='function' ? process._getActiveHandles() : [];
    return h.filter(x => x instanceof net.Socket && !x.destroyed && x.remotePort===port).length;
}
async function makePeer() {
    const peers=new Set();
    let n=0, onCR;
    const cr=new Promise(resolve=>{onCR=resolve});
    const server=net.createServer(socket=>{
        n++;
        peers.add(socket);
        socket.on('error',()=>{});
        socket.once('close',()=>peers.delete(socket));
        let buf=Buffer.alloc(0);
        socket.on('data',chunk=>{
            buf=Buffer.concat([buf,chunk]);
            if(buf.length>=22 && onCR){
                const cb=onCR;onCR=null;
                cb({socket,request:Buffer.from(buf.subarray(0,22))});
            }
        });
    });
    await deadline(new Promise((resolve,reject)=>{
        server.once('error',reject);server.listen(0,'127.0.0.1',resolve);
    }),3000,'local TCP listener');
    const port=server.address().port;
    async function awaitCR(){
        const packet=await deadline(cr,3000,'valid COTP request');
        assert.equal(packet.request.length,22);
        assert.equal(packet.request.readUInt16BE(2),22);
        assert.equal(packet.request[0],3);
        assert.equal(packet.request[5],0xe0);
        assert.equal(n,1);
        return packet;
    }
    async function close() {
        for(const p of peers)p.destroy();
        await deadline(new Promise(resolve=>server.close(resolve)),3000,'TCP fixture cleanup');
    }
    return {port,peers,awaitCR,close,count:()=>n,clientHandles:()=>handles(port)};
}
function ccFrom(cr){
    assert.equal(cr.length,22);
    const cc=Buffer.from(cr);
    cc[5]=0xd0;
    cc.writeUInt16BE(cr.readUInt16BE(8),6);
    cc.writeUInt16BE(0x5a17,8);
    return cc;
}
function makeNodeRed() {
    const registered=new Map(), errors=[];
    const RED={
        _:key=>key,
        auth:{needsPermission:()=>()=>{}},
        httpAdmin:{get:()=>{}},
        nodes:{
            registerType:(name,ctor)=>registered.set(name,ctor),
            createNode(node){
                Object.setPrototypeOf(node,EventEmitter.prototype);
                node.error=e=>errors.push(String(e));
                node.warn=()=>{};
                node.status=()=>{};
                node.send=()=>{};
            },
            getNode:()=>null
        }
    };
    require('../../red/s7.js')(RED);
    return {registered,errors};
}
test('npm alias, lock integrity and installed package identify the exact released fork', ()=>{
    const pkg=require('../../package.json');
    const lock=require('../../package-lock.json');
    const moduleEntry=require.resolve('@st-one-io/nodes7');
    const source=fs.readFileSync(path.join(path.dirname(moduleEntry),'s7endpoint.js'),'utf8');
    const installedPkg=JSON.parse(fs.readFileSync(path.resolve(path.dirname(moduleEntry),'../package.json'),'utf8'));
    assert.equal(pkg.dependencies['@st-one-io/nodes7'],RELEASE_SPEC);
    assert.equal(lock.lockfileVersion,3);
    assert.equal(lock.packages[''].dependencies['@st-one-io/nodes7'],RELEASE_SPEC);
    const installed=lock.packages['node_modules/@st-one-io/nodes7'];
    assert.equal(installed.name,RELEASE_NAME);
    assert.equal(installed.resolved,RELEASE_URL);
    assert.equal(installed.version,RELEASE_VERSION);
    assert.equal(installed.integrity,RELEASE_INTEGRITY,'exact npm-published tarball is required');
    assert.equal(installedPkg.name,RELEASE_NAME,'npm alias must resolve our own scoped binary');
    assert.equal(installedPkg.version,RELEASE_VERSION);
    assert.equal(lock.packages['node_modules/iso-on-tcp'].version,'0.1.0');
    assert.equal(fs.existsSync(path.resolve(__dirname,'../../node_modules/@missel2/nodes7')),false,
        'a second independently installed protocol copy is forbidden');
    assert.equal(typeof nodes7.S7Endpoint,'function');
    assert.equal(typeof nodes7.S7ItemGroup,'function');
    assert.match(source,/this\._pendingTransport = stream/,'installed runtime must own a pending COTP socket');
    assert.match(source,/this\._connectGeneration/,'installed runtime must reject late handshakes');
});
test('actual Node-RED close releases the in-flight fork COTP socket without stale online status',
    {timeout:8500},async()=>{
    const peer=await makePeer();
    const {registered,errors}=makeNodeRed();
    const Endpoint=registered.get('s7 endpoint');
    assert.equal(typeof Endpoint,'function');
    const endpoint=new Endpoint({
        transport:'iso-on-tcp',connmode:'rack-slot',address:'127.0.0.1',
        port:peer.port,rack:0,slot:1,timeout:1500,cycletime:0,
        vartable:[{name:'scratch',addr:'DB1,REAL0'}]
    });
    const statuses=[];
    endpoint.on('__STATUS__',s=>statuses.push(s.status));
    const report={scenario:'node-red close during real pending COTP',statuses,errors};
    try{
        const {socket}=await peer.awaitCR();
        assert.ok(endpoint.endpoint._pendingTransport,'real fork transport must be pending');
        const peerClose=new Promise(resolve=>socket.once('close',resolve));
        let closeCount=0;
        const closed=new Promise((resolve,reject)=>{
            endpoint.emit('close',err=>{
                closeCount++;
                if(err)reject(err);else resolve();
            });
        });
        report.close=await observed(closed,750);
        await deadline(peerClose,1200,'peer did not close after Node-RED close');
        await delay(50);
        report.closeCount=closeCount;
        report.peerOpenBeforeFixtureCleanup=peer.peers.size;
        report.clientOpenBeforeFixtureCleanup=peer.clientHandles();
        report.status=endpoint.getStatus();
        report.shouldReconnect=endpoint.endpoint._shouldConnect;
        report.connectionEstablished=endpoint.endpoint.isConnected;
        report.pendingTransport=!!endpoint.endpoint._pendingTransport;
        report.observedBeforeFixtureCleanup=true;
        assert.equal(report.close.state,'fulfilled','Node-RED close callback must settle');
        assert.equal(closeCount,1,'Node-RED close callback must run exactly once');
        assert.equal(report.status,'offline');
        assert.equal(report.shouldReconnect,false,'closed wrapper must not schedule reconnect');
        assert.equal(report.connectionEstablished,false);
        assert.equal(report.pendingTransport,false);
        assert.equal(report.peerOpenBeforeFixtureCleanup,0);
        assert.equal(report.clientOpenBeforeFixtureCleanup,0);
        assert.ok(!statuses.includes('online'),'stale COTP must not mark wrapper online');
        assert.deepStrictEqual(errors,[], 'normal cancellation should not become a Node-RED error');
    } finally{
        persist('nodes7-pinned-wrapper-close.json',report);
        await peer.close();
    }
});
test('installed fork ignores actual decoded COTP CC callback scheduled before user cancellation',
    {timeout:8500},async()=>{
    const peer=await makePeer();
    const endpoint=new nodes7.S7Endpoint({
        host:'127.0.0.1',port:peer.port,rack:0,slot:1,autoReconnect:0
    });
    let endpointConnects=0,endpointDisconnects=0;
    endpoint.on('connect',()=>endpointConnects++);
    endpoint.on('disconnect',()=>endpointDisconnects++);
    endpoint.on('error',()=>{});
    const connecting=endpoint.connect();
    connecting.catch(()=>{});
    const report={scenario:'installed fork, valid COTP CC parsed then disconnect before queued connect callback'};
    try{
        const {socket,request}=await peer.awaitCR();
        const cc=ccFrom(request);
        const parser=new ISOOnTCPParser();
        const parsed=new Promise((resolve,reject)=>{
            parser.once('data',resolve);parser.once('error',reject);
        });
        parser.end(cc);
        assert.equal((await deadline(parsed,1000,'independent COTP CC parser')).type,
            constants.tpdu_type.CC);
        const stream=endpoint._pendingTransport;
        assert.ok(stream,'real pending ISO transport is required');
        let actualCC=0,lateNativeConnect=0,wasCancelled=false,closeObserved=false;
        let disconnectPromise;
        let resolveDecoded;
        const decoded=new Promise(resolve=>{resolveDecoded=resolve});
        stream.on('close',()=>{closeObserved=true});
        stream.on('connect',()=>{if(wasCancelled)lateNativeConnect++});
        stream.on('raw-message',msg=>{
            if(msg.type!==constants.tpdu_type.CC)return;
            actualCC++;
            wasCancelled=true;
            disconnectPromise=endpoint.disconnect();
            disconnectPromise.catch(()=>{});
            resolveDecoded();
        });
        const peerClose=new Promise(resolve=>socket.once('close',resolve));
        socket.write(cc);
        await deadline(decoded,2500,'installed ISO client did not parse actual CC');
        report.disconnect=await observed(disconnectPromise,700);
        report.connect=await observed(connecting,350);
        await deadline(peerClose,1100,'peer still live after CC cancel');
        await delay(80);
        Object.assign(report,{actualCC,lateNativeConnect,closeObserved,
            endpointConnects,endpointDisconnects,connected:endpoint.isConnected,
            hasS7Connection:!!endpoint._connection,peerOpenBeforeFixtureCleanup:peer.peers.size,
            clientOpenBeforeFixtureCleanup:peer.clientHandles(),observedBeforeFixtureCleanup:true});
        assert.equal(actualCC,1);
        assert.equal(lateNativeConnect,1,'actual native connect callback must execute after cancellation');
        assert.equal(report.disconnect.state,'fulfilled');
        assert.deepStrictEqual(report.connect,{state:'rejected',code:'ERR_CONNECTION_CLOSED'});
        assert.equal(closeObserved,true);
        assert.equal(endpointConnects,0);
        assert.equal(endpointDisconnects,1);
        assert.equal(report.hasS7Connection,false);
        assert.equal(report.connected,false);
        assert.equal(report.peerOpenBeforeFixtureCleanup,0);
        assert.equal(report.clientOpenBeforeFixtureCleanup,0);
    }finally{
        persist('nodes7-pinned-real-cotp-cc-race.json',report);
        await deadline(endpoint.disconnect(),1000,'cleanup endpoint disconnect');
        await peer.close();
    }
});
