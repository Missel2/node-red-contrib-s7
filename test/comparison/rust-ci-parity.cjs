"use strict";
// HIL-S7-001/002/003/005/006/007: pending isolated Siemens hardware.
// Rust 1.4.0 fault-parity against an independently controlled S7Comm relay.
// Explicitly not a drop-in run of JavaScript-specific CI internals.
const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { performance } = require("node:perf_hooks");
const { setTimeout: delay } = require("node:timers/promises");
const { createWirePeer } = require("../runtime-lab/wire-peer.cjs");

const root = path.resolve(__dirname, "../..");
const userDir = path.resolve(process.argv[2] || "/dev/null");
const output = path.join(root, "test-reports/rust-s7-ci-parity.json");
const consumer = createRequire(path.join(userDir, "package.json"));
const helper = consumer("node-red-node-test-helper");
const tags = ["DB1,REAL0", "DB1,INT4", "DB1,REAL8"];
const baseline = { [tags[0]]: 12.5, [tags[1]]: -123, [tags[2]]: 3.25 };
const report = {
  schemaVersion: 1,
  result: "failed",
  implementation: "node-red-contrib-s7-rust@1.4.0",
  fixture: "python-snap7==3.3.1 via independent TCP/COTP/S7 relay",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  nodeRed: consumer("node-red/package.json").version,
  node: process.version,
  platform: process.platform,
  hil: "PENDING_HARDWARE",
  scenarios: {},
};

function bounded(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("HARNESS_TIMEOUT: " + label)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
async function until(predicate, ms, label) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (predicate()) return;
    await delay(25);
  }
  throw new Error("HARNESS_TIMEOUT: " + label);
}
function kernelClientCount(port) {
  const lines = fs
    .readFileSync("/proc/net/tcp", "utf8")
    .trim()
    .split("\n")
    .slice(1);
  const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
  return lines.filter((line) => {
    const cols = line.trim().split(/\s+/);
    const [localIp] = cols[1].split(":");
    const [remoteIp, remotePort] = cols[2].split(":");
    return (
      cols[3] === "01" &&
      localIp === "0100007F" &&
      remoteIp === "0100007F" &&
      remotePort === hexPort
    );
  }).length;
}
async function startFixture() {
  const child = spawn(
    process.env.S7_FIXTURE_PYTHON || "python",
    ["-u", "test/protocol/fixture_server.py"],
    {
      cwd: root,
      env: { ...process.env, S7_FIXTURE_PORT: "0", PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const reader = readline.createInterface({ input: child.stdout });
  const exit = once(child, "close");
  try {
    const port = await bounded(
      Promise.race([
        once(reader, "line").then(([line]) => {
          const match = /^S7_WIRE_FIXTURE_READY (\d+) (3\.3\.1)$/.exec(line);
          assert.ok(match, "pinned python-snap7 3.3.1 fixture must be ready");
          return Number(match[1]);
        }),
        exit.then(() => {
          throw new Error("fixture exited during startup");
        }),
      ]),
      12000,
      "fixture startup",
    );
    assert.ok(port > 1023 && port < 65536);
    return {
      port,
      async stop() {
        reader.close();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        try {
          await bounded(exit, 5000, "fixture stop");
        } catch (error) {
          child.kill("SIGKILL");
          await bounded(exit, 3000, "fixture kill");
          throw error;
        }
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }
}
function flow(port) {
  return [
    {
      id: "ep",
      type: "s7rs-endpoint",
      protocol: "s7",
      host: "127.0.0.1",
      port,
      cpu: "1200",
      rack: 0,
      slot: 1,
      timeout: 2000,
      reconnect: 5000,
    },
    {
      id: "reader",
      type: "s7rs-read",
      endpoint: "ep",
      tags: tags.join("\n"),
      output: "object",
      wires: [["out-read"]],
    },
    {
      id: "writer",
      type: "s7rs-write",
      endpoint: "ep",
      tag: "",
      wires: [["out-write"]],
    },
    { id: "out-read", type: "helper" },
    { id: "out-write", type: "helper" },
  ];
}
function send(id, sinkId, msg, ms = 8000) {
  const node = helper.getNode(id);
  const sink = helper.getNode(sinkId);
  assert.ok(node && sink, "Node-RED extension nodes must exist");
  return bounded(
    new Promise((resolve, reject) => {
      function cleanup() {
        sink.off("input", onMessage);
        node.off("call:error", onError);
      }
      function onMessage(message) {
        cleanup();
        resolve(message);
      }
      function onError(call) {
        cleanup();
        const error = call.args?.[0];
        reject(error instanceof Error ? error : new Error(String(error)));
      }
      sink.on("input", onMessage);
      node.on("call:error", onError);
      node.receive(msg);
    }),
    ms,
    id + " operation",
  );
}
async function readValues() {
  const message = await send("reader", "out-read", { payload: "read" }, 11000);
  assert.ok(message.payload && typeof message.payload === "object");
  return Object.fromEntries(tags.map((tag) => [tag, message.payload[tag]]));
}
function record(name, data) {
  report.scenarios[name] = { result: "passed", ...data };
}
async function main() {
  let fixture;
  let peer;
  let loaded = false;
  let serverStarted = false;
  try {
    assert.equal(process.platform, "linux");
    assert.equal(process.arch, "x64");
    assert.equal(
      process.env.S7RS_NAPI,
      undefined,
      "do not substitute Rust test-fake addon",
    );
    assert.equal(report.nodeRed, "5.0.9");
    assert.equal(
      consumer("node-red-contrib-s7-rust/package.json").version,
      "1.4.0",
    );
    assert.ok(
      fs.statSync(
        path.join(
          userDir,
          "node_modules/node-red-contrib-s7-rust/bin/linux-x64-gnu/s7napi.node",
        ),
      ).size > 100000,
    );
    fixture = await startFixture();
    peer = await createWirePeer(fixture.port);
    helper.init(consumer.resolve("node-red"));
    await bounded(helper.startServer(), 15000, "Node-RED start");
    serverStarted = true;
    const factories = [
      consumer("node-red-contrib-s7-rust/nodes/s7rs-endpoint.js"),
      consumer("node-red-contrib-s7-rust/nodes/s7rs-read.js"),
      consumer("node-red-contrib-s7-rust/nodes/s7rs-write.js"),
    ];
    await bounded(
      helper.load(factories, flow(peer.port)),
      12000,
      "initial Rust flow load",
    );
    loaded = true;
    const endpoint = helper.getNode("ep");
    await until(
      () => endpoint.state?.state === "connected",
      14000,
      "initial connect",
    );
    const activeSockets = kernelClientCount(peer.port);
    assert.ok(
      activeSockets >= 1,
      "POSITIVE CONTROL: native Rust client is OS-visible",
    );
    assert.deepEqual(await readValues(), baseline);
    record("healthy_read", { activeSockets, values: baseline });

    const beforeInvalid = peer.writes.length;
    let invalidError = null;
    try {
      await send("writer", "out-write", { payload: 9 }, 2000);
    } catch (error) {
      invalidError = error;
    }
    assert.ok(
      invalidError && !/HARNESS_TIMEOUT/.test(String(invalidError)),
      "invalid write must fail via the node",
    );
    assert.equal(
      peer.writes.length,
      beforeInvalid,
      "invalid input must not produce wire writes",
    );
    record("invalid_write", {
      error: String(invalidError.message),
      wireWrites: 0,
    });

    const beforeWrites = peer.writes.length;
    await send("writer", "out-write", { topic: tags[2], payload: 19.75 });
    assert.equal(peer.writes.length, beforeWrites + 1);
    assert.deepEqual(await readValues(), { ...baseline, [tags[2]]: 19.75 });
    record("acknowledged_write", { writesOnWire: 1, readback: 19.75 });

    peer.dropWriteAck = true;
    const preLoss = peer.writes.length;
    const t0 = performance.now();
    let lostAckOutcome = null;
    try {
      await send(
        "writer",
        "out-write",
        { topic: tags[2], payload: -8.5 },
        12000,
      );
      lostAckOutcome = "unexpected_success";
    } catch (error) {
      if (/HARNESS_TIMEOUT/.test(String(error))) throw error;
      lostAckOutcome = String(error.message);
    }

    // Check the fault injection itself before interpreting a client result.
    await until(
      () => peer.droppedWrites.length === 1,
      2500,
      "proxy omitted acknowledged write reply",
    );
    assert.equal(
      peer.droppedWrites[0].fixtureAcknowledged,
      true,
      "fixture must have applied the first write",
    );
    await until(
      () => endpoint.state?.state === "connected",
      14000,
      "Rust recovers after lost ACK",
    );
    const postLossValues = await readValues();
    assert.deepEqual(postLossValues, { ...baseline, [tags[2]]: -8.5 });
    await delay(5500);
    const totalWireWrites = peer.writes.length - preLoss;
    const replayedWrites = Math.max(0, totalWireWrites - 1);
    const validOutcome =
      lostAckOutcome !== "unexpected_success" &&
      totalWireWrites === 1 &&
      replayedWrites === 0;
    report.scenarios.lost_write_ack = {
      result: validOutcome ? "passed" : "failed",
      observedOutcome: lostAckOutcome,
      ackDropsObserved: peer.droppedWrites.length,
      fixtureApplied: peer.droppedWrites[0].fixtureAcknowledged,
      totalWireWritesForAttempt: totalWireWrites,
      replayedWriteCount: replayedWrites,
      verifiedReadback: postLossValues[tags[2]],
      observationMs: Math.round(performance.now() - t0),
    };

    const withheldBefore = peer.withheldReads.length;
    peer.withholdReadAck = true;
    const sink = helper.getNode("out-read");
    let messagesAfterHeldRead = 0;
    sink.on("input", () => {
      messagesAfterHeldRead++;
    });
    helper.getNode("reader").receive({ payload: "held-read" });
    await until(
      () => peer.withheldReads.length === withheldBefore + 1,
      6000,
      "held real S7 READ_VAR reply",
    );
    assert.equal(
      messagesAfterHeldRead,
      0,
      "withheld reply must not emit stale value",
    );
    await bounded(helper.unload(), 9000, "Rust unload during pending read");
    loaded = false;
    await until(
      () => peer.active.size === 0,
      4000,
      "Rust closes pending-read TCP peer",
    );
    await delay(500);
    assert.equal(
      messagesAfterHeldRead,
      0,
      "removed Rust flow must never emit a late value",
    );
    assert.equal(
      kernelClientCount(peer.port),
      0,
      "native Rust socket must be gone before fixture stop",
    );
    record("pending_read_on_unload", {
      withheldReadReplies: 1,
      lateEmittedMessages: 0,
      socketsAfterUnload: 0,
    });

    peer.blackhole = true;
    const priorBlackholed = peer.blackholedRequests;
    await bounded(
      helper.load(factories, flow(peer.port)),
      12000,
      "blackhole Rust flow load",
    );
    loaded = true;
    const blackholeEp = helper.getNode("ep");
    await until(
      () => peer.blackholedRequests > priorBlackholed,
      9000,
      "real blackholed COTP request",
    );
    assert.notEqual(
      blackholeEp.state?.state,
      "connected",
      "no false S7 connected state",
    );
    await bounded(helper.unload(), 9000, "Rust unload during COTP blackhole");
    loaded = false;
    await until(
      () => peer.active.size === 0,
      4500,
      "blackholed native Rust TCP teardown",
    );
    assert.equal(kernelClientCount(peer.port), 0);
    const afterRemoval = peer.cotpRequests;
    await delay(5400);
    assert.equal(
      peer.cotpRequests,
      afterRemoval,
      "removed Rust flow must not reconnect",
    );
    assert.equal(peer.active.size, 0, "removed flow has zero surviving peers");
    record("blackhole_and_explicit_removal", {
      cotpObserved: true,
      reconnectAttemptsAfterRemoval: 0,
      socketsAfterRemoval: 0,
      observationMs: 5400,
    });

    assert.equal(Object.keys(report.scenarios).length, 5);
    report.result = Object.values(report.scenarios).every((scenario) => scenario.result === "passed")
      ? "passed"
      : "failed";
  } catch (error) {
    report.failed = String(error?.stack || error).slice(0, 3500);
  } finally {
    if (loaded) {
      try {
        await bounded(helper.unload(), 9000, "cleanup unload");
      } catch (error) {
        report.cleanupError = String(error);
        report.result = "failed";
      }
    }
    if (serverStarted) {
      try {
        await bounded(helper.stopServer(), 12000, "Node-RED stop");
      } catch (error) {
        report.stopError = String(error);
        report.result = "failed";
      }
    }
    if (peer) {
      try {
        await bounded(peer.close(), 9000, "proxy close");
      } catch (error) {
        report.proxyStopError = String(error);
        report.result = "failed";
      }
    }
    if (fixture) {
      try {
        await fixture.stop();
      } catch (error) {
        report.fixtureStopError = String(error);
        report.result = "failed";
      }
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log("RUST_CI_PARITY=" + report.result);
    console.log("RUST_CI_SCENARIOS=" + JSON.stringify(report.scenarios));
    if (report.failed) console.error(report.failed);
    if (report.result !== "passed") process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
