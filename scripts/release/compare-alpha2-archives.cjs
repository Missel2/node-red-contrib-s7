"use strict";

// Read-only comparison of two independent npm packs. Only JSON manifests are uploaded.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const NAME = "@missel2/node-red-contrib-s7";
const VERSION = "0.1.0-alpha.2";
const ARTIFACTS = [
  ["contrib-alpha2-archive-ubuntu-24.04-node22", "linux"],
  ["contrib-alpha2-archive-windows-2025-node22", "win32"],
];

function checkManifest(manifest, sourceCommit, platform) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/, "Missing immutable source SHA");
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.status, "preflight-only-not-published");
  assert.equal(manifest.sourceCommit, sourceCommit, "Archive source SHA drift");
  assert.equal(manifest.platform, platform, "Unexpected operating system");
  assert.equal(manifest.package?.name, NAME);
  assert.equal(manifest.package.version, VERSION);
  assert.equal(manifest.package.distTag, "alpha");
  assert.equal(
    manifest.package.fileCount,
    8,
    "Unexpected files in npm package",
  );
  assert.ok(manifest.package.bytes > 10000, "Suspiciously short package");
  assert.match(manifest.package.sha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.package.sha512, /^[a-f0-9]{128}$/);
  assert.equal(
    manifest.package.integrity,
    "sha512-" + Buffer.from(manifest.package.sha512, "hex").toString("base64"),
    "SHA512 hex and SRI must describe the same tarball",
  );
  assert.match(manifest.inputs?.packageJsonSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.inputs.lockfileSha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.licenses?.root, "GPL-3.0-or-later");
  assert.deepEqual(
    manifest.licenses.productionDependencies
      .map((dep) => [dep.name, dep.version, dep.installedAs])
      .sort(),
    [
      ["@missel2/nodes7", "0.1.0-alpha.2", "@st-one-io/nodes7"],
      ["iso-on-tcp", "0.1.0", "iso-on-tcp"],
    ].sort(),
  );
  assert.equal(manifest.releaseGates?.npmPublish, "not-authorized");
}

function compareManifests(linux, windows, sourceCommit) {
  checkManifest(linux, sourceCommit, "linux");
  checkManifest(windows, sourceCommit, "win32");
  for (const field of ["fileCount", "bytes", "sha256", "sha512", "integrity"]) {
    assert.equal(
      linux.package[field],
      windows.package[field],
      "Cross-OS npm archive mismatch: " + field,
    );
  }
  for (const field of ["packageJsonSha256", "lockfileSha256"]) {
    assert.equal(
      linux.inputs[field],
      windows.inputs[field],
      "Cross-OS source input mismatch: " + field,
    );
  }
  return {
    sourceCommit,
    name: NAME,
    version: VERSION,
    bytes: linux.package.bytes,
    sha256: linux.package.sha256,
    integrity: linux.package.integrity,
  };
}

function main() {
  const root = path.resolve(process.argv[2] || "compare-manifests");
  const sourceCommit = process.env.SOURCE_SHA;
  const [linux, windows] = ARTIFACTS.map(([name]) =>
    JSON.parse(fs.readFileSync(path.join(root, name, "manifest.json"), "utf8")),
  );
  const result = compareManifests(linux, windows, sourceCommit);
  console.log(
    "CONTRIB_ALPHA2_CROSS_OS_ARCHIVE_IDENTICAL=" + JSON.stringify(result),
  );
}

if (require.main === module) main();
module.exports = { checkManifest, compareManifests };
