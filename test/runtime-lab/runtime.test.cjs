"use strict";

// HIL-S7-001 through HIL-S7-007 remain pending. All traffic is synthetic loopback.
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const { createRequire } = require("node:module");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { setTimeout: delay } = require("node:timers/promises");
const test = require("node:test");
const red = require("node-red");
const { createWirePeer, loopback } = require("./wire-peer.cjs");

const [, , userDir, fixturePort, evidenceFile, nodes7Commit] = process.argv;
// Remove this original-red contract when updating the pin to the fixed source.
const affectedNodes7Commit = "2cf864e38be447c2709348a25eb0524d67f5cf2d";
const packageName = "node-red-contrib-s7";
const types = ["s7 endpoint", "s7 in", "s7 out", "s7 control"];
const originalValues = { temperature: 12.5, counter: -123, writable: 3.25 };
const tab = "lab-tab";
const endpointId = "lab-endpoint";
const inputId = "lab-in";
const outputId = "lab-out";
const controlId = "lab-control";

function inject(id, target, values) {
  return {
    id,
    z: tab,
    type: "inject",
    props: Object.entries(values).map(([p, v]) => ({
      p,
      v: String(v),
      vt: typeof v === "number" ? "num" : "str",
    })),
    once: false,
    wires: [[target]],
  };
}

function probe(channel) {
  return {
    id: "observe-" + channel,
    z: tab,
    type: "function",
    func:
      "global.get('recordLabEvent')(" +
      JSON.stringify(channel) +
      ", msg); return null;",
    outputs: 1,
    wires: [[]],
  };
}

function flow(port, label) {
  return [
    { id: tab, type: "tab", label },
    {
      id: endpointId,
      type: "s7 endpoint",
      transport: "iso-on-tcp",
      connmode: "rack-slot",
      address: loopback,
      port,
      rack: 0,
      slot: 1,
      timeout: 2000,
      cycletime: 0,
      vartable: [
        { name: "temperature", addr: "DB1,REAL0" },
        { name: "counter", addr: "DB1,INT4" },
        { name: "writable", addr: "DB1,REAL8" },
      ],
    },
    {
      id: inputId,
      type: "s7 in",
      z: tab,
      endpoint: endpointId,
      mode: "all",
      diff: false,
      wires: [["observe-read"]],
    },
    {
      id: outputId,
      type: "s7 out",
      z: tab,
      endpoint: endpointId,
      variable: "",
      wires: [],
    },
    {
      id: controlId,
      type: "s7 control",
      z: tab,
      endpoint: endpointId,
      function: "",
      wires: [["observe-control"]],
    },
    inject("trigger", controlId, { function: "trigger", payload: "read" }),
    inject("set-cycle", controlId, {
      function: "cycletime",
      payload: 10000,
      tag: "cycle",
    }),
    inject("bad-cycle", controlId, {
      function: "cycletime",
      payload: -1,
      tag: "bad-cycle",
    }),
    inject("write-ok", outputId, {
      variable: "writable",
      payload: 19.75,
      tag: "write-ok",
    }),
    inject("write-unknown", outputId, {
      variable: "missing",
      payload: 99,
      tag: "write-unknown",
    }),
    inject("write-lost-ack", outputId, {
      variable: "writable",
      payload: -8.5,
      tag: "lost-ack",
    }),
    {
      id: "lab-catch",
      z: tab,
      type: "catch",
      scope: [outputId, controlId],
      wires: [["observe-catch"]],
    },
    {
      id: "lab-complete",
      z: tab,
      type: "complete",
      scope: [outputId, controlId],
      wires: [["observe-complete"]],
    },
    {
      id: "lab-status",
      z: tab,
      type: "status",
      scope: [inputId],
      wires: [["observe-status"]],
    },
    ...["read", "control", "catch", "complete", "status"].map(probe),
  ];
}

async function waitFor(get, label, timeout = 6000) {
  const deadline = performance.now() + timeout;
  for (;;) {
    const observed = get();
    if (observed) return observed;
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error("Timed out waiting for " + label);
    await delay(Math.min(20, remaining));
  }
}

function makeAdmin(port) {
  async function request(route, { method = "GET", body, headers = {} } = {}) {
    const response = await fetch("http://" + loopback + ":" + port + route, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    assert.ok(
      response.ok,
      method + " " + route + " returned " + response.status,
    );
    return response;
  }

  const flowsVersion = { "Node-RED-API-Version": "v2" };
  return {
    request,
    async export() {
      return (await request("/flows", { headers: flowsVersion })).json();
    },
    async deploy(flows) {
      const { rev } = await this.export();
      return (
        await request("/flows", {
          method: "POST",
          headers: { ...flowsVersion, "Node-RED-Deployment-Type": "full" },
          body: { rev, flows },
        })
      ).json();
    },
    async inject(id) {
      await (
        await request("/inject/" + id, { method: "POST", body: {} })
      ).text();
    },
  };
}

async function checkPalette(admin) {
  const route = "/nodes/" + packageName + "/s7";
  const nodeSet = await (
    await admin.request(route, {
      headers: { Accept: "application/json" },
    })
  ).json();
  assert.equal(nodeSet.enabled, true);
  assert.deepEqual([...nodeSet.types].sort(), [...types].sort());
  const editor = await (
    await admin.request(route, { headers: { Accept: "text/html" } })
  ).text();
  for (const type of types) {
    assert.ok(
      editor.includes('data-template-name="' + type + '"'),
      "Editor template for " + type,
    );
    assert.ok(
      editor.includes('data-help-name="' + type + '"'),
      "Editor help for " + type,
    );
  }
  const readLocale = async (lang) =>
    (await admin.request(route + "/messages?lng=" + lang)).json();
  const en = await readLocale("en-US");
  const de = await readLocale("de");
  assert.equal(typeof en.s7.error.varunknown, "string");
  assert.equal(typeof de.s7.error.varunknown, "string");
  assert.notEqual(de.s7.error.varunknown, en.s7.error.varunknown);
}

test(
  "installed Node-RED S7 palette, flow lifecycle and wire fault contracts",
  { timeout: 65000 },
  async () => {
    assert.ok(path.isAbsolute(userDir));
    const installRoot = path.join(userDir, "node_modules", packageName);
    const manifest = path.join(installRoot, "package.json");
    const installedRequire = createRequire(manifest);
    assert.ok(
      fs
        .realpathSync(installedRequire.resolve("@st-one-io/nodes7"))
        .startsWith(
          fs.realpathSync(path.join(userDir, "node_modules")) + path.sep,
        ),
      "The package's nodes7 must resolve inside the isolated userDir",
    );

    const events = [];
    const runtimeErrors = [];
    const recordLabEvent = (channel, msg) =>
      events.push({
        channel,
        tag: msg.tag,
        payload: msg.payload,
        topic: msg.topic,
        status: msg.status?.fill,
        source:
          msg.status?.source.id ||
          msg.error?.source.id ||
          msg.complete?.source.id,
        error: msg.error?.message,
        code: msg.error?.code,
      });
    const report = { completed: false, scenarios: [] };
    const peer = await createWirePeer(Number(fixturePort));
    const server = http.createServer((req, res) => red.httpAdmin(req, res));
    let initialized = false;
    try {
      red.init(server, {
        userDir,
        flowFile: "lab-flows.json",
        credentialSecret: false,
        httpAdminRoot: "/",
        httpNodeRoot: false,
        functionExternalModules: false,
        externalModules: {
          autoInstall: false,
          palette: { allowInstall: false, allowUpload: false },
          modules: { allowInstall: false },
        },
        editorTheme: { projects: { enabled: false } },
        functionGlobalContext: { recordLabEvent },
        logging: {
          console: { level: "warn" },
          lab: {
            level: "error",
            handler: () => (entry) =>
              runtimeErrors.push({
                source: entry.id,
                error: String(entry.msg),
              }),
          },
        },
      });
      initialized = true;
      server.listen(0, loopback);
      await once(server, "listening");
      await red.start();
      const admin = makeAdmin(server.address().port);
      const from = (offset, channel, filter = () => true) =>
        events
          .slice(offset)
          .filter((event) => event.channel === channel && filter(event));
      const waitEvent = (offset, channel, filter, label, timeout) =>
        waitFor(() => from(offset, channel, filter)[0], label, timeout);
      const online = (offset, timeout) =>
        waitEvent(
          offset,
          "status",
          (event) => event.status === "green" && event.source === inputId,
          "online status",
          timeout,
        );
      const read = async (expected) => {
        const offset = events.length;
        await admin.inject("trigger");
        const event = await waitEvent(
          offset,
          "read",
          undefined,
          "S7 In message",
        );
        assert.deepEqual(event.payload, expected);
        assert.equal(event.topic, "");
        await waitEvent(
          offset,
          "complete",
          (value) => value.source === controlId,
          "S7 Control completion",
        );
        assert.equal(
          from(offset, "read").length,
          1,
          "A trigger yields one read",
        );
      };

      await checkPalette(admin);
      const config = flow(peer.port, "Initial package contract");
      await admin.deploy(config);
      const exported = await admin.export();
      const exportedEndpoint = exported.flows.find(
        (node) => node.id === endpointId,
      );
      assert.deepEqual(
        exportedEndpoint.vartable,
        config.find((node) => node.id === endpointId).vartable,
      );
      assert.equal(exportedEndpoint.address, loopback);
      assert.equal(exportedEndpoint.port, peer.port);
      assert.deepEqual(
        exported.flows
          .filter((node) => types.includes(node.type))
          .map((node) => node.type)
          .sort(),
        [...types].sort(),
      );
      report.scenarios.push(
        "four registered types, templates, help, two locales and flow export",
      );

      await online(0);
      await read(originalValues);
      let offset = events.length;
      await admin.inject("bad-cycle");
      const invalidCycle = await waitEvent(
        offset,
        "catch",
        (event) => event.tag === "bad-cycle",
        "invalid cycle Catch",
      );
      assert.equal(invalidCycle.source, controlId);
      assert.match(invalidCycle.error, /cycle|interval/i);
      const errorOffset = runtimeErrors.length;
      await admin.inject("write-unknown");
      const invalidWrite = await waitFor(
        () =>
          from(
            offset,
            "catch",
            (event) =>
              event.tag === "write-unknown" && event.source === outputId,
          )[0] ||
          runtimeErrors
            .slice(errorOffset)
            .find((entry) => entry.source === outputId),
        "unknown variable diagnosis",
      );
      assert.match(invalidWrite.error, /missing/);
      assert.equal(
        peer.writes.length,
        0,
        "Invalid inputs must send zero writes",
      );
      report.invalidWrite = {
        route: invalidWrite.channel === "catch" ? "Catch" : "runtime log",
        wireWrites: 0,
      };
      report.scenarios.push(
        "triggered read, validation, Catch and zero invalid wire writes",
      );

      offset = events.length;
      await admin.inject("write-ok");
      await waitEvent(
        offset,
        "complete",
        (event) => event.tag === "write-ok" && event.source === outputId,
        "acknowledged write completion",
      );
      await read({ ...originalValues, writable: 19.75 });
      assert.equal(
        from(offset, "complete", (event) => event.tag === "write-ok").length,
        1,
      );
      assert.equal(peer.writes.length, 1);
      report.scenarios.push(
        "one acknowledged write, Complete and scratch DB readback",
      );

      offset = events.length;
      const startedAt = performance.now();
      peer.dropWriteAck = true;
      await admin.inject("write-lost-ack");
      const timeout = await waitEvent(
        offset,
        "catch",
        (event) => event.tag === "lost-ack",
        "lost write ACK Catch",
      );
      const catchMs = Math.round(performance.now() - startedAt);
      assert.equal(timeout.source, outputId);
      assert.equal(timeout.code, "ERR_TIMEOUT");
      assert.equal(peer.droppedWrites.length, 1);
      assert.equal(
        peer.droppedWrites[0].fixtureAcknowledged,
        true,
        "Peer must have acknowledged application before suppression",
      );
      await waitEvent(
        offset,
        "status",
        (event) => event.status === "red",
        "offline status after timeout",
      );
      await online(offset, 10000);
      const recoveredMs = Math.round(performance.now() - startedAt);
      await read({ ...originalValues, writable: -8.5 });
      assert.equal(
        peer.writes.length,
        2,
        "No write replay after reconnection and readback",
      );
      assert.equal(
        from(offset, "catch", (event) => event.tag === "lost-ack").length,
        1,
      );
      assert.equal(
        from(offset, "complete", (event) => event.tag === "lost-ack").length,
        0,
      );
      report.lostAck = {
        fixtureAppliedValue: -8.5,
        code: timeout.code,
        catchMs,
        recoveredMs,
        replayedWrites: 0,
      };
      report.scenarios.push(
        "discarded successful write ACK, ERR_TIMEOUT, reconnect and no replay",
      );

      offset = events.length;
      await admin.inject("set-cycle");
      await waitEvent(
        offset,
        "complete",
        (event) => event.tag === "cycle",
        "poll cycle update completion",
      );
      // Internal observations supplement public flow/status and peer-side TCP evidence.
      const oldEndpoint = red.nodes.getNode(endpointId);
      assert.ok(oldEndpoint._td, "Redeploy must exercise an active poll timer");
      assert.equal(oldEndpoint.listenerCount("__ALL__"), 1);
      assert.equal(oldEndpoint.listenerCount("__STATUS__"), 3);
      peer.withholdReadAck = true;
      await admin.inject("trigger");
      const held = await waitFor(
        () => peer.withheldReads[0],
        "held READ_VAR reply",
      );
      assert.ok(
        peer.active.has(held.session),
        "The held read must belong to a live session",
      );
      const revision = await admin.deploy(
        flow(peer.port, "Redeployed package contract"),
      );
      assert.notEqual(revision.rev, exported.rev);
      await waitFor(
        () => peer.closed.includes(held.session),
        "old peer socket close",
      );
      assert.notEqual(red.nodes.getNode(endpointId), oldEndpoint);
      assert.equal(oldEndpoint._td, null);
      assert.equal(oldEndpoint.listenerCount("__ALL__"), 0);
      assert.equal(oldEndpoint.listenerCount("__STATUS__"), 0);
      assert.equal(oldEndpoint.endpoint.isConnected, false);
      await online(offset);
      assert.equal(
        from(offset, "read").length,
        0,
        "The withheld read cannot publish during redeploy",
      );
      await read({ ...originalValues, writable: -8.5 });
      assert.equal(peer.active.size, 1);
      report.scenarios.push(
        "full redeploy cancels a held read, old timer, subscriptions and socket",
      );

      peer.blackhole = true;
      offset = events.length;
      await admin.deploy(flow(peer.port, "Blackholed COTP deployment"));
      await waitFor(
        () => peer.blackholedRequests === 1,
        "actual COTP request without a reply",
      );
      assert.equal(peer.active.size, 1);
      assert.equal(
        from(offset, "status", (event) => event.status === "green").length,
        0,
      );
      assert.equal(from(offset, "read").length, 0);
      const cotpSession = [...peer.active][0];
      const removedEndpoint = red.nodes.getNode(endpointId);
      await admin.deploy([]);
      await waitFor(
        () => peer.closed.includes(cotpSession),
        "cancelled COTP socket close",
      );
      assert.equal((await admin.export()).flows.length, 0);
      const requestsAfterClose = peer.cotpRequests;
      await delay(5250);
      const extraRequests = peer.cotpRequests - requestsAfterClose;
      const livePeers = peer.active.size;
      report.postRemoval = { extraRequests, livePeers, observationMs: 5250 };
      if (nodes7Commit === affectedNodes7Commit) {
        // This is the exact known-failing observation, recorded before harness cleanup.
        assert.equal(
          extraRequests,
          1,
          "Expected the one known retry on the affected pin",
        );
        assert.equal(livePeers, 1, "Expected the retry to leave one open peer");
        report.postRemoval.verdict = "known-failure-reproduced";
        report.postRemoval.issue =
          "https://github.com/Missel2/nodes7/issues/20";
        await removedEndpoint.endpoint.disconnect();
        await waitFor(
          () => peer.active.size === 0,
          "cleanup of known retry socket",
        );
      } else {
        assert.equal(extraRequests, 0, "No reconnect after flow removal");
        assert.equal(
          livePeers,
          0,
          "Peer sockets close while the fixture is still running",
        );
        report.postRemoval.verdict = "passed";
      }
      assert.equal(
        peer.writes.length,
        2,
        "No deferred replay during redeploy or teardown",
      );
      assert.deepEqual(peer.errors, []);
      report.scenarios.push(
        "empty deployment closes the original COTP socket and observes the retry window",
      );
    } finally {
      report.peer = {
        cotpRequests: peer.cotpRequests,
        blackholedRequests: peer.blackholedRequests,
        writes: peer.writes,
        droppedWrites: peer.droppedWrites,
        withheldReads: peer.withheldReads,
        closed: peer.closed,
        activeAtEnd: [...peer.active],
        errors: peer.errors,
      };
      report.lastEvents = events.slice(-20);
      report.runtimeErrors = runtimeErrors;
      fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2));
      try {
        if (initialized) await red.stop();
      } finally {
        server.closeAllConnections();
        await Promise.all([
          peer.close(),
          new Promise((resolve) => server.close(resolve)),
        ]);
      }
    }
    report.completed = true;
    fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2));
  },
);
