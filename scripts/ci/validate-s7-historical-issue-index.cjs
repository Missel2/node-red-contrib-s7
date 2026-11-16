"use strict";
// Audit metadata only. A public issue title is never treated as a passing test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const file = path.join(root, "docs/s7-historical-issue-snapshot.json");
const index = JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(index.schemaVersion, 1);
assert.equal(index.date, "2026-11-16");
assert.equal(index.sourceRepositories.length, 7);
assert.equal(index.sourceRetrievalFailures.length, 0);
assert.ok(index.snapshotIssueCount >= 290, "Unexpected issue snapshot loss");
assert.equal(index.entries.length, index.snapshotIssueCount);
const ids = new Set();
for (const entry of index.entries) {
  assert.ok(index.sourceRepositories.includes(entry.repo));
  assert.ok(Number.isSafeInteger(entry.issue) && entry.issue > 0);
  assert.ok(["open", "closed"].includes(entry.state));
  assert.ok(entry.family && typeof entry.family === "string");
  assert.ok(
    ["manually_curated_family", "title_classification_unverified"].includes(
      entry.triage,
    ),
  );
  assert.equal(
    entry.testEvidence,
    "NOT_TESTED_BY_THIS_INVENTORY",
    "Source-issue catalog cannot impersonate runtime proof",
  );
  const id = entry.repo + "#" + entry.issue;
  assert.ok(!ids.has(id), "Duplicate issue reference " + id);
  ids.add(id);
}
for (const [repo, count] of Object.entries(index.countsByRepository)) {
  assert.equal(
    index.entries.filter((entry) => entry.repo === repo).length,
    count,
  );
}
for (const ref of [
  "st-one-io/nodes7#16",
  "st-one-io/nodes7#17",
  "st-one-io/nodes7#20",
  "plcpeople/nodes7#143",
  "Missel2/nodes7#29",
]) {
  assert.ok(ids.has(ref), "Missing high-risk reference " + ref);
}
for (const fileName of [
  "test/comparison/rust-ci-parity.cjs",
  "test/comparison/historical-s7-regressions.cjs",
  "test/comparison/malformed-cotp.cjs",
  "test/comparison/malformed-read.cjs",
  "test/runtime-lab/wire-peer.cjs",
  "docs/S7_HISTORICAL_REGRESSION_AUDIT.md",
  "docs/S7_RUST_CI_TRANSFER_AUDIT.md",
  "docs/s7-regression-contracts.json",
]) {
  assert.ok(fs.existsSync(path.join(root, fileName)));
}
// A named source issue is a lead, not proof. "implemented" only states that an
// executable case exists. PASS/FAIL must come from the exact CI run artifact.
const contracts = JSON.parse(
  fs.readFileSync(path.join(root, "docs/s7-regression-contracts.json"), "utf8"),
);
assert.equal(contracts.schemaVersion, 1);
assert.equal(contracts.sourceIndex, "docs/s7-historical-issue-snapshot.json");
const contractIds = new Set();
let implemented = 0;
let pending = 0;
for (const item of contracts.contracts) {
  assert.ok(!contractIds.has(item.id), "Duplicate fault-contract " + item.id);
  contractIds.add(item.id);
  assert.ok(ids.has(item.source), "Unknown public source issue " + item.source);
  assert.ok(["P0", "P1", "P2"].includes(item.importance));
  assert.ok(["js", "rust", "both"].includes(item.target));
  if (item.implementation === "implemented") {
    implemented++;
    assert.ok(
      typeof item.driver === "string" && item.driver.startsWith("test/"),
    );
    assert.ok(
      typeof item.caseMarker === "string" && item.caseMarker.length > 3,
    );
    const source = fs.readFileSync(path.join(root, item.driver), "utf8");
    assert.ok(
      source.includes(item.caseMarker),
      "Missing executable case " + item.id,
    );
    assert.equal(
      item.verdict,
      undefined,
      "Static manifest cannot assert a candidate passed",
    );
  } else {
    assert.equal(item.implementation, "pending");
    pending++;
    assert.ok(typeof item.reason === "string" && item.reason.length > 20);
    assert.equal(
      item.driver,
      undefined,
      "Unimplemented case cannot have a test driver",
    );
  }
}
assert.ok(implemented >= 14 && pending >= 8);
console.log(
  "S7_FAULT_CONTRACTS_IMPLEMENTED=" +
    implemented +
    " S7_FAULT_CONTRACTS_PENDING=" +
    pending,
);
console.log("HISTORIC_S7_ISSUE_INDEX_VERIFIED=" + index.entries.length);
console.log(
  "HISTORIC_S7_ISSUE_SOURCE_COUNT=" + index.sourceRepositories.length,
);
console.log("HISTORIC_S7_ISSUE_EVIDENCE=metadata_only");
