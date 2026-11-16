"use strict";
// Independent historical S7Comm oracle: st-one-io/nodes7 #16, #17, #20.
// Only disposable synthetic DB1. HIL-S7-002/003/006 PENDING_HARDWARE.
const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { performance } = require("node:perf_hooks");
const { setTimeout: delay } = require("node:timers/promises");

const root = path.resolve(__dirname, "../..");
const userDir = path.resolve(process.argv[2] || "/dev/null");
const consumer = createRequire(path.join(userDir, "package.json"));
const helper = consumer("node-red-node-test-helper");
const output = path.join(root, "test-reports/s7-historical-cross-engine.json");
const report = {
  status: "failed", schemaVersion: 1, hardware: "PENDING_HARDWARE",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  fixture: "python-snap7==3.3.1; opt-in 2048-byte DB1, offset modulo 256",
  nodeRed: consumer("node-red/package.json").version,
  jsVersion: consumer("@missel2/node-red-contrib-s7/package.json").version,
  rustVersion: consumer("node-red-contrib-s7-rust/package.json").version,
  results: {},
};
const odd = Array.from({ length: 40 }, (_, i) => ({
  name: "odd" + i, addr: "DB1,B" + (64 + 42 * i) + ".21",
  offset: 64 + 42 * i, length: 21,
}));
const overlap = [
  { name: "block", addr: "DB1,B0.925", offset: 0, length: 925 },
  { name: "field", addr: "DB1,B921.18", offset: 921, length: 18 },
];
const writable = [1801, 1803, 1805].map((offset, i) => ({
  name: "w" + i, addr: "DB1,B" + offset, offset, length: 1,
}));
function bound(p, timeout, name) {
  let timer;
  return Promise.race([
    p,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("HARNESS_TIMEOUT " + name)), timeout);
    }),
  ]).finally(() => clearTimeout(timer));
}
async function waitFor(fn, timeout, name) {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    if (fn()) return;
    await delay(40);
  }
  throw new Error("HARNESS_TIMEOUT " + name);
}
async function startFixture() {
  const child = spawn(process.env.S7_FIXTURE_PYTHON || "python", ["-u", "test/protocol/fixture_server.py"], {
    cwd: root,
    env: { ...process.env, S7_FIXTURE_PORT: "0", S7_FIXTURE_DB_BYTES: "2048" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = readline.createInterface({ input: child.stdout });
  const closed = once(child, "close");
  try {
    const port = await bound(Promise.race([
      once(lines, "line").then(([line]) => {
        const m = /^S7_WIRE_FIXTURE_READY (\d+) (3\.3\.1)$/.exec(line);
        assert.ok(m, "synthetic fixture version");
        return Number(m[1]);
      }),
      closed.then(() => { throw new Error("fixture exited before ready"); }),
    ]), 12000, "fixture start");
    assert.ok(port >= 1024 && port <= 65535);
    return {
      port,
      async stop() {
        lines.close();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await bound(closed, 8000, "fixture stop");
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }
}
function nodes(mode, port, vars) {
  if (mode === "js") return {
    factories: [consumer("@missel2/node-red-contrib-s7/red/s7.js")],
    flow: [
      {
        id: "ep", type: "s7 endpoint", transport: "iso-on-tcp", connmode: "rack-slot",
        address: "127.0.0.1", port, rack: 0, slot: 1, timeout: 2000, cycletime: 0,
        vartable: vars.map((item) => ({ name: item.name, addr: item.addr })),
      },
      { id: "reader", type: "s7 in", endpoint: "ep", mode: "all", diff: false, wires: [["read-sink"]] },
      { id: "control", type: "s7 control", endpoint: "ep", function: "", wires: [[]] },
      { id: "writer", type: "s7 out", endpoint: "ep", variable: "", wires: [] },
      { id: "read-sink", type: "helper" },
    ],
  };
  return {
    factories: [
      consumer("node-red-contrib-s7-rust/nodes/s7rs-endpoint.js"),
      consumer("node-red-contrib-s7-rust/nodes/s7rs-read.js"),
      consumer("node-red-contrib-s7-rust/nodes/s7rs-write.js"),
    ],
    flow: [
      {
        id: "ep", type: "s7rs-endpoint", protocol: "s7", host: "127.0.0.1",
        port, cpu: "1200", rack: 0, slot: 1, timeout: 2000, reconnect: 5000,
      },
      { id: "reader", type: "s7rs-read", endpoint: "ep", tags: vars.map((x) => x.addr).join("\n"), output: "object", wires: [["read-sink"]] },
      { id: "writer", type: "s7rs-write", endpoint: "ep", tag: "", wires: [] },
      { id: "read-sink", type: "helper" },
    ],
  };
}
async function read(mode, vars) {
  const sink = helper.getNode("read-sink");
  assert.ok(sink);
  const data = once(sink, "input");
  if (mode === "js") helper.getNode("control").receive({ function: "trigger", payload: "read" });
  else helper.getNode("reader").receive({ payload: "read" });
  const [message] = await bound(data, 19000, mode + " read");
  assert.ok(message.payload && typeof message.payload === "object");
  return Object.fromEntries(vars.map((x) => [
    x.name, mode === "js" ? message.payload[x.name] : message.payload[x.addr],
  ]));
}
async function runOne(mode, port, testcase, vars) {
  const start = performance.now();
  let loaded = false;
  const result = { verdict: "failed", case: testcase, node: mode };
  report.results[mode][testcase] = result;
  try {
    const setup = nodes(mode, port, vars);
    await bound(helper.load(setup.factories, setup.flow), 13000, "load " + mode);
    loaded = true;
    const endpoint = helper.getNode("ep");
    await waitFor(() => mode === "js" ? endpoint.getStatus?.() === "online" :
      endpoint.state?.state === "connected", 15000, "connected " + mode);
    if (testcase === "multi_write_padding") {
      const vals = [15, 29, 43];
      const node = helper.getNode("writer");
      if (mode === "js") node.receive({ variable: vars.map((x) => x.name), payload: vals });
      else node.receive({ payload: Object.fromEntries(vars.map((x, i) => [x.addr, vals[i]])) });
      let good = false;
      const end = performance.now() + 7500;
      while (performance.now() < end) {
        let values;
        try {
          values = await read(mode, vars);
        } catch (error) {
          result.readbackRetry = String(error);
        }
        if (values && vars.every((x, i) => values[x.name] === vals[i])) {
          good = true;
          break;
        }
        await delay(120);
      }
      assert.ok(good, "all 3 dispersed 1-byte writes must be applied");
      result.expectedBytes = vals;
    } else {
      const values = await read(mode, vars);
      for (const item of vars) {
        const value = values[item.name];
        assert.ok(value && typeof value === "object", item.addr + " returned no byte array");
        const actual = Array.from(value);
        assert.equal(actual.length, item.length, item.addr + " full payload");
        const expected = Array.from({ length: item.length }, (_, i) => (item.offset + i) & 255);
        const skip = item.offset === 0 ? 16 : 0;
        assert.deepEqual(actual.slice(skip), expected.slice(skip), item.addr + " expected byte-for-byte data");
      }
      result.checkedBytes = vars.reduce((sum, x) => sum + x.length, 0);
      result.tags = vars.length;
    }
    result.elapsedMs = Math.round(performance.now() - start);
    result.verdict = "passed";
  } catch (error) {
    result.error = String(error?.stack || error).slice(0,2200);
  } finally {
    if (loaded) {
      try { await bound(helper.unload(), 8500, "unload " + mode); }
      catch (error) { result.cleanupError = String(error); result.verdict = "failed"; }
    }
  }
}
async function main() {
  let server;
  let running = false;
  try {
    assert.equal(process.platform, "linux");
    assert.equal(process.arch, "x64");
    assert.equal(report.nodeRed, "5.0.9");
    assert.equal(report.jsVersion, "0.1.0-alpha.2");
    assert.equal(report.rustVersion, "1.4.0");
    assert.equal(process.env.S7RS_NAPI, undefined);
    server = await startFixture();
    helper.init(consumer.resolve("node-red"));
    await bound(helper.startServer(), 15000, "Node-RED start");
    running = true;
    for (const mode of ["js", "rust"]) {
      report.results[mode] = {};
      await runOne(mode, server.port, "odd_length_read_pdu", odd);
      await runOne(mode, server.port, "overlapping_split_parts", overlap);
      await runOne(mode, server.port, "multi_write_padding", writable);
    }
    report.status = Object.values(report.results).every((suite) =>
      Object.values(suite).every((x) => x.verdict === "passed")) ? "passed" : "failed";
  } catch (error) {
    report.fatal = String(error?.stack || error).slice(0,2200);
  } finally {
    if (running) {
      try { await bound(helper.stopServer(), 11000, "Node-RED shutdown"); }
      catch (error) { report.stopError = String(error); report.status = "failed"; }
    }
    if (server) {
      try { await server.stop(); }
      catch (error) { report.fixtureError = String(error); report.status = "failed"; }
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log("S7_HISTORICAL_CROSS_ENGINE=" + report.status);
    console.log("S7_HISTORICAL_RESULTS=" + JSON.stringify(report.results));
    if (report.fatal) console.error(report.fatal);
    if (report.status !== "passed") process.exitCode = 1;
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
