'use strict';
// N7-003 integration: real node-red-contrib-s7 wrapper + installed nodes7
// + genuine COTP/S7Comm wire traffic to a disposable python-snap7 3.3.1 server.
// NOT a full Node-RED runtime, NOT Siemens hardware. HIL-S7-001/002/003/007 PENDING.
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

const ROOT = path.resolve(__dirname,'../..');
const EVIDENCE = path.join(ROOT,'test-reports','s7-wrapper-real-wire-evidence.json');
const FIXTURE_FILE = path.join(ROOT,'test','protocol','fixture_server.py');
const PORT = 1102;
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const waitForStatus = require('./wait-for-status.cjs');

function bounded(promise,ms,label){
    let timer;
    return Promise.race([
        Promise.resolve(promise),
        new Promise((_,reject)=>{
            timer=setTimeout(()=>reject(Error('HARNESS_TIMEOUT '+label)),ms);
        })
    ]).finally(()=>clearTimeout(timer));
}
async function launchFixture(){
    assert.ok(fs.existsSync(FIXTURE_FILE),'Pinned PR #10 Snap7 server must be staged');
    const child = spawn(process.env.S7_FIXTURE_PYTHON||'python',
        ['-u',FIXTURE_FILE],
        {cwd:ROOT,env:{...process.env,S7_FIXTURE_PORT:String(PORT),PYTHONUNBUFFERED:'1'},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='', resolved=false;
    const ready=new Promise((resolve,reject)=>{
        const finish=()=>{if(!resolved&&stdout.includes('S7_WIRE_FIXTURE_READY')){resolved=true;resolve()}};
        child.stdout.on('data',buf=>{stdout=(stdout+buf.toString()).slice(-30000);finish()});
        child.stderr.on('data',buf=>{stderr=(stderr+buf.toString()).slice(-30000)});
        child.once('error',error=>{if(!resolved){resolved=true;reject(error)}});
        child.once('exit',(code,signal)=>{
            if(!resolved){resolved=true;reject(Error('synthetic S7 fixture exited '+code+'/'+signal+' '+stderr))}
        });
    });
    async function stop(){
        if(child.exitCode===null&&!child.killed)child.kill();
        if(child.exitCode===null)await Promise.race([
            new Promise(resolve=>child.once('exit',resolve)),sleep(2500)
        ]);
        if(child.exitCode===null)child.kill('SIGKILL');
    }
    try{
        await bounded(ready,9000,'synthetic server readiness');
        return {stop,logs:()=>({stdout,stderr})};
    }catch(error){await stop();throw error}
}
function minimalNodeRedApi(){
    const registered=new Map(),errors=[];
    const RED={
        _:k=>k,auth:{needsPermission:()=>()=>{}},httpAdmin:{get:()=>{}},
        nodes:{
            createNode(node){
                Object.setPrototypeOf(node,EventEmitter.prototype);
                node.error=e=>errors.push(String(e));
                node.warn=()=>{};
                node.status=()=>{};
                node.send=()=>{};
            },
            registerType:(name,ctor)=>registered.set(name,ctor),
            getNode:()=>null
        }
    };
    require('../../red/s7.js')(RED);
    assert.equal(typeof registered.get('s7 endpoint'),'function');
    return {Endpoint:registered.get('s7 endpoint'),errors};
}
function emittedOnce(emitter,event){
    return new Promise(resolve=>emitter.once(event,resolve));
}
function activeClientHandles(port){
    if(typeof process._getActiveHandles!=='function')return null;
    return process._getActiveHandles()
        .filter(h=>h instanceof net.Socket&&!h.destroyed&&h.remotePort===port).length;
}
test('Node-RED S7 config node reads and writes synthetic DB1 over real installed fork S7Comm',
    {timeout:27000},async()=>{
    const report={scenario:'real red/s7.js wrapper + pinned nodes7 + python-snap7 3.3.1',
        port:PORT,loopbackOnly:true,hardware:false,
        upstreamForkCommit:'2cf864e38be447c2709348a25eb0524d67f5cf2d',
        steps:[],statuses:[]};
    fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});
    const fixture=await launchFixture();
    let node,closed=false;
    const {Endpoint,errors}=minimalNodeRedApi();
    try{
        node=new Endpoint({
            transport:'iso-on-tcp',connmode:'rack-slot',
            address:'127.0.0.1',port:PORT,rack:0,slot:1,
            timeout:1600,cycletime:0,
            vartable:[
                {name:'temperature',addr:'DB1,REAL0'},
                {name:'counter',addr:'DB1,INT4'},
                {name:'writable',addr:'DB1,REAL8'}
            ]
        });
        node.on('__STATUS__',s=>report.statuses.push(s.status));

        // Poll the wrapper's public status. It may connect before a listener
        // subscribes, so an event-only wait would introduce a timing race.
        await waitForStatus(()=>node.getStatus(),'online',9000,25);
        assert.equal(node.endpoint.isConnected,true);
        report.steps.push('real COTP and S7 connection established by wrapper');

        const initial = emittedOnce(node,'__ALL__');
        node.doCycle();
        const before = await bounded(initial,4000,'S7 READ_VAR via wrapper');
        assert.equal(before.temperature,12.5);
        assert.equal(before.counter,-123);
        assert.equal(before.writable,3.25);
        report.steps.push('real DB1 REAL0, INT4, REAL8 read through wrapper');
        report.initialValues=before;

        await bounded(new Promise((resolve,reject)=>{
            node.writeVar({name:'writable',val:19.75,done:e=>e?reject(e):resolve()});
        }),4000,'S7 WRITE_VAR via wrapper');
        report.steps.push('real synthetic DB1 REAL8 write of 19.75');

        const readback=emittedOnce(node,'__ALL__');
        node.doCycle();
        const after=await bounded(readback,4000,'S7 READ_VAR readback via wrapper');
        assert.equal(after.temperature,12.5,'unrelated REAL remains unchanged');
        assert.equal(after.counter,-123,'unrelated INT remains unchanged');
        assert.equal(after.writable,19.75,'written value must be read from scratch server DB');
        report.readbackValues=after;
        report.steps.push('real write-readback, unchanged unrelated DB fields');

        let closeCount=0;
        await bounded(new Promise((resolve,reject)=>{
            node.emit('close',err=>{
                closeCount++;
                err?reject(err):resolve();
            });
        }),2500,'Node-RED wrapper close');
        closed=true;
        await sleep(90);
        report.closeCount=closeCount;
        report.finalStatus=node.getStatus();
        report.clientSocketsBeforeFixtureCleanup=activeClientHandles(PORT);
        report.observedBeforeFixtureCleanup=true;
        assert.equal(closeCount,1);
        assert.equal(report.finalStatus,'offline');
        assert.equal(node.endpoint.isConnected,false);
        if(report.clientSocketsBeforeFixtureCleanup!==null)
            assert.equal(report.clientSocketsBeforeFixtureCleanup,0,
                'close must release all visible S7 TCP clients before fixture stop');
        assert.deepEqual(errors,[],'healthy protocol interaction must not report errors');
        report.steps.push('Node-RED close completed once, no live client sockets');
    }finally{
        if(node&&!closed){
            await bounded(new Promise(resolve=>node.emit('close',()=>resolve())),2500,
                'fixture forced wrapper close').catch(e=>{report.cleanupError=String(e)});
        }
        report.errors=errors;
        report.fixtureLog=fixture.logs();
        fs.writeFileSync(EVIDENCE,JSON.stringify(report,null,2)+'\n');
        await fixture.stop();
    }
});
