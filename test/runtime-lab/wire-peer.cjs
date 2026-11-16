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

// A partial/malformed reply may not contain header fields at their usual
// offsets. The observer itself must never throw while recording such a frame.
function read16IfPresent(frame, offset) {
  return frame.length >= offset + 2 ? frame.readUInt16BE(offset) : null;
}

// Opt-in deterministic corruption of a LIVE fixture ReadVar ACK. Keep actual
// COTP/S7 handshake and read request authentic; only the selected reply is
// mutated. The normal relay is byte-identical when readReplyMutation is null.
function corruptReadReply(original, mutation) {
  assert.ok(original.length >= 22 && original[7] === 0x32 && original[8] === 3);
  assert.equal(original[19], READ_VAR);
  if (mutation === "error_items_nonzero_length") {
    assert.equal(
      original[20],
      3,
      "Negative control requires 3 separate READ_VAR items",
    );
    const dataStart = 19 + original.readUInt16BE(13);
    assert.ok(dataStart <= original.length, "Read response parameter bounds");
    // plcpeople/nodeS7#143: 0x0A (missing DB), size=0, length=4, *no data*.
    // A legal outer TPKT and S7 header contains three intentionally invalid
    // return items; unsafe clients have crashed on non-integer parse offsets.
    const invalidItem = Buffer.from([0x0a, 0x00, 0x00, 0x04]);
    const frame = Buffer.concat([
      original.subarray(0, dataStart),
      invalidItem,
      invalidItem,
      invalidItem,
    ]);
    frame.writeUInt16BE(12, 15);
    frame.writeUInt16BE(frame.length, 2);
    return frame;
  }
  if (mutation === "short_s7_reply") {
    const frame = Buffer.from(original.subarray(0, 12));
    frame.writeUInt16BE(frame.length, 2);
    return frame;
  }
  if (mutation === "inconsistent_data_length") {
    const frame = Buffer.from(original);
    frame.writeUInt16BE(0x7fff, 15);
    return frame;
  }
  if (mutation === "wrong_pdu_reference") {
    const frame = Buffer.from(original);
    frame.writeUInt16BE((frame.readUInt16BE(11) + 1) & 0xffff, 11);
    return frame;
  }
  throw new Error("Unknown approved READ_VAR reply mutation");
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
    reads: [],
    readReplyMutation: null,
    mutatedReadReplies: [],
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
          if (pdu.functionCode === READ_VAR) {
            peer.reads.push({
              session,
              reference: pdu.reference,
              itemCount: frame[18],
            });
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
            if (request === READ_VAR && peer.readReplyMutation) {
              const selected = peer.readReplyMutation;
              peer.readReplyMutation = null;
              const mutant = corruptReadReply(frame, selected);
              peer.mutatedReadReplies.push({
                session,
                reference: pdu.reference,
                mutation: selected,
                requestObserved: true,
                originalBytes: frame.length,
                deliveredBytes: mutant.length,
                originalItemCount: frame[20],
                originalPduRef: frame.readUInt16BE(11),
                deliveredPduRef: read16IfPresent(mutant, 11),
                originalDataLength: frame.readUInt16BE(15),
                deliveredDataLength: read16IfPresent(mutant, 15),
                originalTpktLength: frame.readUInt16BE(2),
                deliveredTpktLength: mutant.readUInt16BE(2),
              });
              client.write(mutant);
              return;
            }
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

module.exports = { createWirePeer, loopback, read16IfPresent };
