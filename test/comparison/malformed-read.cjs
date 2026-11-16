"use strict";
// Independent parser-failure regressions for both ACTUALLY INSTALLED packages.
// Each engine/mutation runs in a separate Node-RED process, not a mocked Rust addon.
// Covers plcpeople/nodeS7#143 and packet/reference parser families.
// HIL-S7-001/002/007 PENDING_HARDWARE. No live PLC, no production data.
const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { performance } = require("node:perf_hooks");
const { setTimeout: sleep } = require("node:timers/promises");
const { createWirePeer } = require("../runtime-lab/wire-peer.cjs");

const root = path.resolve(__dirname, "../..");
const userDir = path.resolve(process.argv[2] || "/dev/null");
const engine = process.env.S7_READ_FAULT_ENGINE;
const fault = process.env.S7_READ_FAULT_CASE;
assert.ok(["js", "rust"].includes(engine), "Only two real installed engines");
assert.ok(
  [
    "error_items_nonzero_length",
    "short_s7_reply",
    "inconsistent_data_length",
    "wrong_pdu_reference",
  ].includes(fault),
  "Explicit tested parser-fault corpus",
);
const consumer = createRequire(path.join(userDir, "package.json"));
const helper = consumer("node-red-node-test-helper");
const vars = [
  { name: "a", tag: "DB1,B37", expected: 37 },
  { name: "b", tag: "DB1,B130", expected: 130 },
  { name: "c", tag: "DB1,B259", expected: 3 },
];
const reportFile = path.join(
  root,
  "test-reports",
  "malformed-read-" + engine + "-" + fault + ".json",
);
const report = {
  schemaVersion: 1,
  engine,
  fault,
  verdict: "failed",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  nodeRed: consumer("node-red/package.json").version,
  pkg:
    engine === "js"
      ? consumer("@missel2/node-red-contrib-s7/package.json").version
      : consumer("node-red-contrib-s7-rust/package.json").version,
  server: "python-snap7==3.3.1, 2KiB disposable DB1",
  hardware: "PENDING_HARDWARE",
  seen: [],
};
function bounded(promise, timeout, name) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(Error("HARNESS_TIMEOUT " + name)),
        timeout,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
async function until(predicate, timeout, name) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (predicate()) return;
    await sleep(25);
  }
  throw Error("HARNESS_TIMEOUT " + name);
}
async function startFixture() {
  const child = spawn(
    process.env.S7_FIXTURE_PYTHON || "python",
    ["-u", "test/protocol/fixture_server.py"],
    {
      cwd: root,
      env: {
        ...process.env,
        S7_FIXTURE_PORT: "0",
        S7_FIXTURE_DB_BYTES: "2048",
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const reader = readline.createInterface({ input: child.stdout });
  const exit = once(child, "close");
  try {
    const port = await bounded(
      Promise.race([
        once(reader, "line").then(([line]) => {
          const m = /^S7_WIRE_FIXTURE_READY (\d+) (3\.3\.1)$/.exec(line);
          assert.ok(m, "Expected pinned synthetic server");
          return Number(m[1]);
        }),
        exit.then(() => {
          throw Error("Fixture exited before readiness");
        }),
      ]),
      12000,
      "fixture startup",
    );
    return {
      port,
      async stop() {
        reader.close();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await bounded(exit, 7000, "fixture termination");
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }
}
function loadConfig(port) {
  if (engine === "js")
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
          timeout: 1200,
          cycletime: 0,
          vartable: vars.map((x) => ({ name: x.name, addr: x.tag })),
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
        rack: 0,
        slot: 1,
        cpu: "1200",
        timeout: 1200,
        reconnect: 5000,
      },
      {
        id: "read",
        type: "s7rs-read",
        endpoint: "ep",
        tags: vars.map((x) => x.tag).join("\n"),
        output: "object",
        wires: [["out"]],
      },
      { id: "out", type: "helper" },
    ],
  };
}
function observedValues(message) {
  const values = message?.payload;
  if (!values || typeof values !== "object") return null;
  return vars.map((x) => (engine === "js" ? values[x.name] : values[x.tag]));
}
async function main() {
  let server;
  let peer;
  let started = false;
  let loaded = false;
  try {
    assert.equal(process.platform, "linux");
    assert.equal(process.arch, "x64");
    assert.equal(process.env.S7RS_NAPI, undefined, "test real native addon");
    assert.equal(report.nodeRed, "5.0.9");
    assert.equal(report.pkg, engine === "js" ? "0.1.0-alpha.2" : "1.4.0");
    server = await startFixture();
    peer = await createWirePeer(server.port);
    helper.init(consumer.resolve("node-red"));
    await bounded(helper.startServer(), 14000, "Node-RED start");
    started = true;
    const config = loadConfig(peer.port);
    await bounded(
      helper.load(config.factories, config.flow),
      14000,
      "load installed candidate",
    );
    loaded = true;
    const ep = helper.getNode("ep");
    await until(
      () =>
        engine === "js"
          ? ep.getStatus?.() === "online"
          : ep.state?.state === "connected",
      13000,
      "healthy S7Comm handshake",
    );

    const sink = helper.getNode("out");
    assert.ok(sink);
    sink.on("input", (message) => {
      report.seen.push({
        values: observedValues(message),
        errors: message?.s7?.errors ?? null,
      });
    });

    peer.readReplyMutation = fault;
    const readBefore = peer.reads.length;
    if (engine === "js")
      helper
        .getNode("control")
        .receive({ function: "trigger", payload: "read" });
    else helper.getNode("read").receive({ payload: "read" });
    await until(
      () => peer.mutatedReadReplies.length > 0,
      9000,
      "actual malformed READ_VAR reply on wire",
    );
    const mutation = peer.mutatedReadReplies[0];
    assert.equal(mutation.mutation, fault);
    assert.equal(mutation.requestObserved, true);
    report.mutation = mutation;
    await sleep(3300);

    report.readRequests = peer.reads.length - readBefore;
    report.proxyErrors = peer.errors.slice(0, 5);
    report.readErrorMessages = report.seen.filter((x) => x.errors);
    report.correctReadbacks = report.seen.filter(
      (x) => x.values && vars.every((tag, i) => x.values[i] === tag.expected),
    ).length;
    const firstInvalidAccepted =
      report.correctReadbacks > 0 && report.readRequests === 1;
    report.unverifiedFreshValues = firstInvalidAccepted;
    report.firstReadObserved = readBefore + 1;
    report.observedEmissions = report.seen.length;
    assert.equal(
      peer.mutatedReadReplies.length,
      1,
      "one independently observed corrupt ACK",
    );
    assert.equal(
      firstInvalidAccepted,
      false,
      "cannot accept corrupted single READ_VAR reply as valid fresh data",
    );
    assert.equal(report.proxyErrors.length, 0, "proxy itself must not fail");
    // A later transparent successful retry is allowed for reads; no delivery
    // is also allowed after a real parsing/transport error. This test does NOT
    // pretend to assert every Node-RED Catch/Complete quality contract.
    report.verdict = "passed";
  } catch (error) {
    report.error = String(error?.stack || error).slice(0, 2800);
  } finally {
    if (loaded) {
      try {
        await bounded(helper.unload(), 9000, "flow unload");
      } catch (error) {
        report.unloadError = String(error);
        report.verdict = "failed";
      }
    }
    if (started) {
      try {
        await bounded(helper.stopServer(), 11000, "Node-RED stop");
      } catch (error) {
        report.stopError = String(error);
        report.verdict = "failed";
      }
    }
    if (peer) {
      report.proxyDiagnostics = {
        reads: peer.reads.slice(-10),
        errors: peer.errors.slice(-10),
        injectedReplies: peer.mutatedReadReplies.slice(-10),
        mutationStillArmed: peer.readReplyMutation,
        activeSessionsBeforeCleanup: peer.active.size,
      };
      try {
        await bounded(peer.close(), 8000, "proxy close");
      } catch (error) {
        report.proxyStopError = String(error);
        report.verdict = "failed";
      }
    }
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        report.fixtureStopError = String(error);
        report.verdict = "failed";
      }
    }
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
    console.log(
      "MALFORMED_READ_RESULT=" +
        JSON.stringify({
          engine,
          fault,
          result: report.verdict,
          requests: report.readRequests,
          injected: report.mutation?.deliveredBytes,
          emitted: report.observedEmissions,
          acceptedInvalid: report.unverifiedFreshValues,
        }),
    );
    if (report.error) console.error(report.error);
    if (report.verdict !== "passed") process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
