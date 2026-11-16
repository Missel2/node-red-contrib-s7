"use strict";

// Compare the PUBLICATION job's freshly rebuilt archive against BOTH
// independent Windows and Ubuntu archives from this exact workflow dispatch.
// No executable archive is accepted from an Actions artifact.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { compareManifests } = require("./compare-alpha2-archives.cjs");

function verifyPublishArchive(linux, windows, local, sourceSha) {
  const reference = compareManifests(linux, windows, sourceSha);
  assert.equal(local.sourceCommit, sourceSha, "Publish checkout/source mismatch");
  assert.equal(local.package?.name, reference.name);
  assert.equal(local.package?.version, reference.version);
  assert.equal(local.package?.distTag, "alpha");
  assert.equal(local.package?.bytes, reference.bytes, "Publish archive size changed");
  assert.equal(local.package?.sha256, reference.sha256, "Publish archive SHA-256 changed");
  assert.equal(local.package?.integrity, reference.integrity, "Publish archive SHA-512 changed");
  assert.equal(local.package?.sha512, linux.package.sha512, "Publish SHA-512 hex mismatch");
  assert.equal(local.inputs?.packageJsonSha256, linux.inputs.packageJsonSha256, "Publish manifest changed");
  assert.equal(local.inputs?.lockfileSha256, linux.inputs.lockfileSha256, "Publish lock changed");
  return reference;
}
function main() {
  const sourceSha = process.env.SOURCE_SHA;
  const root = path.resolve(process.argv[2] || "compare-manifests");
  const localFilename = path.resolve(process.argv[3] || "publish-evidence/manifest.json");
  const linux = JSON.parse(fs.readFileSync(path.join(root,
    "contrib-alpha2-archive-ubuntu-24.04-node22", "manifest.json"), "utf8"));
  const windows = JSON.parse(fs.readFileSync(path.join(root,
    "contrib-alpha2-archive-windows-2025-node22", "manifest.json"), "utf8"));
  const local = JSON.parse(fs.readFileSync(localFilename, "utf8"));
  const result = verifyPublishArchive(linux, windows, local, sourceSha);
  console.log("CONTRIB_ALPHA2_PUBLICATION_ARCHIVE_MATCH=" + JSON.stringify(result));
}
if (require.main === module) main();
module.exports = { verifyPublishArchive };
