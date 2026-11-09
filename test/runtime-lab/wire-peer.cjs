"use strict";

const assert = require("node:assert/strict");
const { once } = require("node:events");
const net = require("node:net");

const loopback = "127.0.0.1";
const READ_VAR = 4;
const WRITE_VAR = 5;

function frames(socket, receive, fail) {
  let pending = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    try {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 4) {
        const length = pending.readUInt16BE(2);
        assert.equal(pending[0], 3, "Expected TPKT v3");
        assert.ok(length >= 7, "TPKT frame must contain a COTP header");
        if (pending.length < length) return;
        const frame = pending.subarray(0, length);
        pending = pending.subarray(length);
        receive(frame);
      }
    } catch (error) {
      fail(error);
    }
  });
}

// This relay observes the fixture's unfragmented S7 PDUs. It forwards complete
// TPKT frames even when TCP chunks split or coalesce them.
function s7Pdu(frame) {
  if (
    frame[4] !== 2 ||
    frame[5] !== 0xf0 ||
    frame[6] !== 0x80 ||
    frame[7] !== 0x32
  ) {
    return null;
  }
  const kind = frame[8];
  if (kind !== 1 && kind !== 3) return null;
  const parameter = kind === 1 ? 17 : 19;
  return {
    kind,
    functionCode: frame[parameter],
    reference: frame.readUInt16BE(11),
    writeSucceeded:
      kind === 3 &&
      frame[17] === 0 &&
      frame[18] === 0 &&
      frame[parameter + frame.readUInt16BE(13)] === 0xff,
  };
}

async function createWirePeer(upstreamPort) {
  assert.ok(
    Number.isInteger(upstreamPort) &&
      upstreamPort >= 1024 &&
      upstreamPort <= 65535,
  );
  const sockets = new Set();
  const peer = {
    blackhole: false,
    dropWriteAck: false,
    withholdReadAck: false,
    active: new Set(),
    closed: [],
    cotpRequests: 0,
    blackholedRequests: 0,
    writes: [],
    droppedWrites: [],
    withheldReads: [],
    errors: [],
  };
  let nextSession = 0;
  const server = net.createServer((client) => {
    const session = ++nextSession;
    const blackholed = peer.blackhole;
    const upstream = blackholed
      ? null
      : net.createConnection(upstreamPort, loopback);
    const requests = new Map();
    peer.active.add(session);
    sockets.add(client);
    if (upstream) sockets.add(upstream);

    function fail(error) {
      peer.errors.push(error.message);
      client.destroy();
      upstream?.destroy();
    }

    client.on("error", fail);
    client.once("close", () => {
      sockets.delete(client);
      peer.active.delete(session);
      peer.closed.push(session);
      upstream?.destroy();
    });
    if (upstream) {
      upstream.on("error", fail);
      upstream.once("close", () => {
        sockets.delete(upstream);
        client.destroy();
      });
    }

    frames(
      client,
      (frame) => {
        if (frame[5] === 0xe0) {
          peer.cotpRequests++;
          if (blackholed) peer.blackholedRequests++;
        }
        const pdu = s7Pdu(frame);
        if (pdu?.kind === 1) {
          requests.set(pdu.reference, pdu.functionCode);
          if (pdu.functionCode === WRITE_VAR) {
            peer.writes.push({ session, reference: pdu.reference });
          }
        }
        upstream?.write(frame);
      },
      fail,
    );

    if (upstream) {
      frames(
        upstream,
        (frame) => {
          const pdu = s7Pdu(frame);
          if (pdu?.kind === 3) {
            const request = requests.get(pdu.reference);
            requests.delete(pdu.reference);
            if (
              request === WRITE_VAR &&
              pdu.functionCode === WRITE_VAR &&
              peer.dropWriteAck
            ) {
              peer.dropWriteAck = false;
              peer.droppedWrites.push({
                session,
                reference: pdu.reference,
                fixtureAcknowledged: pdu.writeSucceeded,
              });
              return;
            }
            if (
              request === READ_VAR &&
              pdu.functionCode === READ_VAR &&
              peer.withholdReadAck
            ) {
              peer.withholdReadAck = false;
              peer.withheldReads.push({ session, reference: pdu.reference });
              return;
            }
          }
          client.write(frame);
        },
        fail,
      );
    }
  });
  server.listen(0, loopback);
  await once(server, "listening");
  peer.port = server.address().port;
  peer.close = () =>
    new Promise((resolve, reject) => {
      for (const socket of sockets) socket.destroy();
      server.close((error) => (error ? reject(error) : resolve()));
    });
  return peer;
}

module.exports = { createWirePeer, loopback };
