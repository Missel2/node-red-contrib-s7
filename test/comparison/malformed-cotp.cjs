"use strict";
// Malformed ISO-on-TCP/COTP, run EACH case in its OWN Node-RED process.
// Motivated by plcpeople/nodeS7#143,#26,#40 and st-one-io/nodes7#13.
// No real PLCs; no claims about a vendor firmware. HIL-S7-001/002/007 PENDING.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { setTimeout: sleep } = require("node:timers/promises");
const root = path.resolve(__dirname, "../..");
const userDir = path.resolve(process.argv[2] || "/dev/null");
const engine = process.env.S7_MALFORMED_ENGINE;
const fault = process.env.S7_MALFORMED_CASE;
const cases = Object.freeze({
  short_tpkt: Buffer.from([3, 0, 0]),
  non_tpkt: Buffer.from("HTTP/1.1 200 OK\r\n\r\n", "ascii"),
  declared_long_tpkt: Buffer.from([3, 0, 1, 0, 2, 0xd0, 0]),
  invalid_cotp_cc: Buffer.from([3, 0, 0, 7, 1, 0xd0, 0]),
});
assert.ok(["js", "rust"].includes(engine), "Only known installed engines");
assert.ok(Object.hasOwn(cases, fault), "Only approved deterministic malformed cases");
const consumer = createRequire(path.join(userDir, "package.json"));
const helper = consumer("node-red-node-test-helper");
const reportPath = path.join(root, "test-reports", "malformed-" + engine + "-" + fault + ".json");
const report = {
  schemaVersion: 1,
  engine, fault, verdict: "failed", hardware: "PENDING_HARDWARE",
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  nodeRed: consumer("node-red/package.json").version,
  package: engine === "js"
    ? consumer("@missel2/node-red-contrib-s7/package.json").version
    : consumer("node-red-contrib-s7-rust/package.json").version,
  injections: 0, cotpRequests: 0, observedConnections: 0, unexpectedOnline: false,
};
function bounded(promise, timeout, what) {
  let id;
  return Promise.race([promise, new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error("HARNESS_TIMEOUT: " + what)), timeout);
  })]).finally(() => clearTimeout(id));
}
async function until(predicate, timeout, what) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (predicate()) return;
    await sleep(25);
  }
  throw new Error("HARNESS_TIMEOUT: " + what);
}
function flow(port) {
  if (engine === "js") return {
    factories: [consumer("@missel2/node-red-contrib-s7/red/s7.js")],
    nodes: [
      {
        id: "ep", type: "s7 endpoint", transport: "iso-on-tcp",
        connmode: "rack-slot", address: "127.0.0.1", port,
        rack: 0, slot: 1, timeout: 900, cycletime: 0,
        vartable: [{ name: "dummy", addr: "DB1,INT4" }],
      },
      { id: "reader", type: "s7 in", endpoint: "ep", mode: "all", diff: false, wires: [["out"]] },
      { id: "out", type: "helper" },
    ],
  };
  return {
    factories: [consumer("node-red-contrib-s7-rust/nodes/s7rs-endpoint.js")],
    nodes: [
      {
        id: "ep", type: "s7rs-endpoint", protocol: "s7",
        host: "127.0.0.1", port, cpu: "1200", rack: 0, slot: 1,
        timeout: 900, reconnect: 5000,
      },
    ],
  };
}
async function main() {
  let server, loaded = false, started = false;
  const sockets = new Set();
  try {
    assert.equal(process.platform, "linux");
    assert.equal(process.arch, "x64");
    assert.equal(process.env.S7RS_NAPI, undefined, "no fake Rust test addon");
    assert.equal(report.nodeRed, "5.0.9");
    assert.equal(report.package, engine === "js" ? "0.1.0-alpha.2" : "1.4.0");
    server = net.createServer((socket) => {
      sockets.add(socket);
      report.observedConnections++;
      let buffer = Buffer.alloc(0);
      let served = false;
      socket.on("error", () => {});
      socket.on("close", () => sockets.delete(socket));
      socket.on("data", (chunk) => {
        if (served) return;
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length < 7) return;
        const length = buffer.readUInt16BE(2);
        if (buffer[0] !== 3 || length < 7 || buffer.length < length) return;
        const frame = buffer.subarray(0, length);
        if (frame[5] !== 0xe0) return;
        report.cotpRequests++;
        served = true;
        report.injections++;
        // All four inputs are intentionally invalid for an S7Comm COTP CC.
        // The fixture itself proves the fault was emitted; never pass on a
        // dead test connection or a mock-only call.
        socket.end(cases[fault]);
      });
    });
    server.listen(0, "127.0.0.1");
    await bounded(once(server, "listening"), 3000, "malformed listener");
    const port = server.address().port;
    helper.init(consumer.resolve("node-red"));
    await bounded(helper.startServer(), 15000, "Node-RED start");
    started = true;
    const cfg = flow(port);
    await bounded(helper.load(cfg.factories, cfg.nodes), 14000, "load actual installed Node-RED extension");
    loaded = true;
    await until(() => report.injections > 0, 7500, "real COTP request plus injected malformed response");
    await sleep(1000);
    const ep = helper.getNode("ep");
    report.endpointStatus = engine === "js" ? ep.getStatus?.() : ep.state?.state;
    report.unexpectedOnline = engine === "js" ? ep.getStatus?.() === "online" : ep.state?.state === "connected";
    assert.equal(report.unexpectedOnline, false, "malformed CC cannot report S7 online");
    assert.ok(report.cotpRequests >= 1 && report.injections >= 1);
    await bounded(helper.unload(), 9000, "unload malformed endpoint");
    loaded = false;
    await sleep(1200);
    report.cotpAfterUnload = report.cotpRequests;
    report.openPeersBeforeServerCleanup = sockets.size;
    // This suite's main contract is parser stability and no false success.
    // Delayed native Rust teardown is measured by a separate strict test.
    report.verdict = "passed";
  } catch (error) {
    report.error = String(error?.stack || error).slice(0, 2300);
  } finally {
    if (loaded) {
      try { await bounded(helper.unload(), 9000, "unload cleanup"); }
      catch (error) { report.cleanupError = String(error); report.verdict = "failed"; }
    }
    if (started) {
      try { await bounded(helper.stopServer(), 12000, "stop Node-RED"); }
      catch (error) { report.stopError = String(error); report.verdict = "failed"; }
    }
    if (server) {
      for (const socket of sockets) socket.destroy();
      try { await bounded(new Promise((resolve, reject) =>
        server.close((err) => err ? reject(err) : resolve())), 5000, "stop fake COTP peer"); }
      catch (error) { report.serverStopError = String(error); report.verdict = "failed"; }
    }
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log("MALFORMED_COTP_RESULT=" + JSON.stringify({
      engine, fault, verdict: report.verdict, injected: report.injections,
      unexpectedOnline: report.unexpectedOnline,
    }));
    if (report.error) console.error(report.error);
    if (report.verdict !== "passed") process.exitCode = 1;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
