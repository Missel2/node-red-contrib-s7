"use strict";
// Independent first common S7Comm proof: installed Node-RED, external loopback.
// HIL-S7-001/002/007 remain PENDING_HARDWARE.
const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { performance } = require("node:perf_hooks");
const { setTimeout: sleep } = require("node:timers/promises");

const root = path.resolve(__dirname, "../..");
const userDir = path.resolve(process.argv[2] || "/dev/null");
const output = path.join(root, "test-reports/common-s7-compare.json");
const consumer = createRequire(path.join(userDir, "package.json"));
const helper = consumer("node-red-node-test-helper");
const names = ["temperature", "counter", "writable"];
const tags = ["DB1,REAL0", "DB1,INT4", "DB1,REAL8"];
const expected = { temperature: 12.5, counter: -123, writable: 3.25 };
const report = {
  schemaVersion: 1,
  status: "failed",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  workflowCommit: process.env.GITHUB_SHA || "local",
  nodeRed: consumer("node-red/package.json").version,
  fixture: "python-snap7==3.3.1 classic S7Comm loopback, synthetic DB1",
  packageIds: {
    js: consumer("@missel2/node-red-contrib-s7/package.json").version,
    rust: consumer("node-red-contrib-s7-rust/package.json").version,
  },
  hil: "PENDING_HARDWARE",
  candidates: {},
};
function deadline(promise, ms, what) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error("Timeout: " + what)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
async function until(fn, ms, what) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (fn()) return;
    await sleep(25);
  }
  throw Error("Timeout: " + what);
}
// /proc/net/tcp reports kernel TCP sockets, including native Rust addon sockets.
// Node's _getActiveHandles() cannot see sockets owned by the native addon.
// Both candidates connect to the same pinned IPv4 loopback fixture.
function establishedClientSockets(port) {
  const rows = fs.readFileSync("/proc/net/tcp", "utf8").trim().split("\n").slice(1);
  const fixturePortHex = port.toString(16).toUpperCase().padStart(4, "0");
  return rows.filter((line) => {
    const fields = line.trim().split(/\s+/);
    const [localHost, localPort] = fields[1].split(":");
    const [remoteHost, remotePort] = fields[2].split(":");
    return (
      fields[3] === "01" &&
      localHost === "0100007F" &&
      remoteHost === "0100007F" &&
      remotePort === fixturePortHex &&
      localPort !== fixturePortHex
    );
  }).length;
}
async function startFixture() {
  const python = process.env.S7_FIXTURE_PYTHON || "python";
  const child = spawn(python, ["-u", "test/protocol/fixture_server.py"], {
    cwd: root,
    env: { ...process.env, S7_FIXTURE_PORT: "0", PYTHONUNBUFFERED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = readline.createInterface({ input: child.stdout });
  const exit = once(child, "close");
  try {
    const port = await deadline(
      Promise.race([
        once(lines, "line").then(([line]) => {
          const m = /^S7_WIRE_FIXTURE_READY (\d+) (3\.3\.1)$/.exec(line);
          assert.ok(m, "Expected pinned local S7 fixture");
          return Number(m[1]);
        }),
        exit.then(() => {
          throw Error("Fixture stopped before listening");
        }),
      ]),
      12000,
      "fixture start",
    );
    assert.ok(port >= 1024 && port <= 65535);
    return {
      port,
      async stop() {
        lines.close();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        try {
          await deadline(exit, 5000, "fixture stop");
        } catch (error) {
          child.kill("SIGKILL");
          await deadline(exit, 3000, "fixture forced stop");
          throw error;
        }
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }
}
function nodes(mode, port) {
  if (mode === "js") {
    return {
      factories: [consumer("@missel2/node-red-contrib-s7/red/s7.js")],
      flow: [
        {
          id: "ep",
          type: "s7 endpoint",
          transport: "iso-on-tcp",
          connmode: "rack-slot",
          address: "127.0.0.1",
          port,
          rack: 0,
          slot: 1,
          timeout: 2000,
          cycletime: 0,
          vartable: names.map((name, i) => ({ name, addr: tags[i] })),
        },
        {
          id: "read",
          type: "s7 in",
          endpoint: "ep",
          mode: "all",
          diff: false,
          wires: [["out"]],
        },
        {
          id: "control",
          type: "s7 control",
          endpoint: "ep",
          function: "",
          wires: [[]],
        },
        { id: "out", type: "helper" },
      ],
    };
  }
  return {
    factories: [
      consumer("node-red-contrib-s7-rust/nodes/s7rs-endpoint.js"),
      consumer("node-red-contrib-s7-rust/nodes/s7rs-read.js"),
    ],
    flow: [
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
        id: "read",
        type: "s7rs-read",
        endpoint: "ep",
        tags: tags.join("\n"),
        output: "object",
        wires: [["out"]],
      },
      { id: "out", type: "helper" },
    ],
  };
}
async function exercise(mode, port) {
  const result = {
    status: "failed",
    protocol: "S7Comm",
    readVerified: false,
    closeVerified: false,
    errors: [],
  };
  report.candidates[mode] = result;
  let loaded = false;
  try {
    const { factories, flow } = nodes(mode, port);
    await deadline(helper.load(factories, flow), 14000, mode + " load");
    loaded = true;
    const ep = helper.getNode("ep");
    assert.ok(ep);
    const before = performance.now();
    await until(
      () =>
        mode === "js"
          ? ep.getStatus?.() === "online"
          : ep.state?.state === "connected",
      12000,
      mode + " connection",
    );
    result.connectMs = Math.round(performance.now() - before);
    const sink = helper.getNode("out");
    assert.ok(sink);
    const received = once(sink, "input");
    const startRead = performance.now();
    if (mode === "js") {
      helper
        .getNode("control")
        .receive({ function: "trigger", payload: "read" });
    } else {
      helper.getNode("read").receive({ payload: "read" });
    }
    const [message] = await deadline(received, 7500, mode + " read");
    result.readMs = Math.round(performance.now() - startRead);
    result.observed =
      mode === "js"
        ? message.payload
        : Object.fromEntries(
            names.map((name, i) => [name, message.payload[tags[i]]]),
          );
    assert.deepEqual(result.observed, expected);
    result.readVerified = true;
    // Positive control: the kernel must actually see the candidate's TCP
    // connection while the Node-RED flow is still active. This detects a
    // broken observer that would otherwise report false zero after unload.
    result.connectedClientSockets = establishedClientSockets(port);
    assert.ok(
      result.connectedClientSockets >= 1,
      mode + " must have a kernel-observed S7 TCP client",
    );
    await deadline(helper.unload(), 8000, mode + " unload");
    loaded = false;
    await until(
      () => establishedClientSockets(port) === 0,
      3500,
      mode + " OS-visible TCP client teardown",
    );
    await sleep(300);
    result.clientSocketsBeforeFixtureStop = establishedClientSockets(port);
    assert.equal(
      result.clientSocketsBeforeFixtureStop,
      0,
      mode + " must not retain or reopen its native/JS socket",
    );
    result.socketObserver = "Linux /proc/net/tcp (kernel TCP state ESTABLISHED)";
    result.closeVerified = true;
    result.status = "passed";
  } catch (error) {
    result.errors.push(String(error?.stack || error).slice(0, 2500));
  } finally {
    if (loaded) {
      try {
        await deadline(helper.unload(), 8000, "cleanup unload");
      } catch (error) {
        result.errors.push("cleanup: " + String(error));
      }
    }
  }
}
async function main() {
  let fixture;
  let serverStarted = false;
  try {
    assert.equal(process.platform, "linux");
    assert.equal(process.arch, "x64");
    assert.equal(
      process.env.S7RS_NAPI,
      undefined,
      "No test-only Rust fake addon",
    );
    assert.equal(report.nodeRed, "5.0.9");
    assert.equal(report.packageIds.js, "0.1.0-alpha.2");
    assert.equal(report.packageIds.rust, "1.4.0");
    const native = path.join(
      userDir,
      "node_modules/node-red-contrib-s7-rust/bin/linux-x64-gnu/s7napi.node",
    );
    assert.ok(
      fs.statSync(native).size > 100000,
      "Real native release addon not installed",
    );
    fixture = await startFixture();
    helper.init(consumer.resolve("node-red"));
    await deadline(helper.startServer(), 15000, "Node-RED start");
    serverStarted = true;
    await exercise("js", fixture.port);
    await exercise("rust", fixture.port);
    if (Object.values(report.candidates).every((c) => c.status === "passed")) {
      assert.deepEqual(
        report.candidates.js.observed,
        report.candidates.rust.observed,
      );
      report.status = "passed";
    }
  } catch (error) {
    report.error = String(error?.stack || error).slice(0, 2500);
  } finally {
    if (serverStarted) {
      try {
        await deadline(helper.stopServer(), 10000, "Node-RED stop");
      } catch (error) {
        report.stopError = String(error);
        report.status = "failed";
      }
    }
    if (fixture) {
      try {
        await fixture.stop();
      } catch (error) {
        report.fixtureStopError = String(error);
        report.status = "failed";
      }
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
    console.log("COMMON_S7_COMPARE_STATUS=" + report.status);
    if (report.error) console.error(report.error);
    for (const [mode, candidate] of Object.entries(report.candidates)) {
      console.log(mode + "=" + candidate.status);
      if (candidate.errors.length) console.error(candidate.errors.join("\n"));
    }
    if (report.status !== "passed") process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
