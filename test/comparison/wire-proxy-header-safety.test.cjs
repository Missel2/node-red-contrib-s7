"use strict";
// Negative control for test instrumentation: truncated S7 header must be
// observed without the *observer itself* causing a RangeError.
// This protects the malformed READ_VAR regression's reliability.
const assert = require("node:assert/strict");
const test = require("node:test");
const { read16IfPresent } = require("../runtime-lab/wire-peer.cjs");

test("a 12-byte S7 reply cannot contain a complete PDU ref at offset 11", () => {
  const short = Buffer.alloc(12);
  assert.equal(read16IfPresent(short, 11), null);
  assert.equal(read16IfPresent(short, 15), null);
});
test("a truncated data-length field is never read beyond the buffer", () => {
  assert.equal(read16IfPresent(Buffer.alloc(16), 15), null);
  const valid = Buffer.alloc(17);
  valid.writeUInt16BE(0x1234, 15);
  assert.equal(read16IfPresent(valid, 15), 0x1234);
});
test("a complete PDU reference remains visible and unchanged", () => {
  const valid = Buffer.alloc(13);
  valid.writeUInt16BE(0xabcd, 11);
  assert.equal(read16IfPresent(valid, 11), 0xabcd);
});
