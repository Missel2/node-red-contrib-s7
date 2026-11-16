"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const {
  checkManifest,
  compareManifests,
} = require("../../scripts/release/compare-alpha2-archives.cjs");
const {
  inspectPublicRegistry,
} = require("../../scripts/release/check-alpha2-npm-availability.cjs");

const SOURCE = "a".repeat(40);

function candidate(platform) {
  const digest = "c".repeat(128);
  return {
    schemaVersion: 1,
    status: "preflight-only-not-published",
    sourceCommit: SOURCE,
    platform,
    package: {
      name: "@missel2/node-red-contrib-s7",
      version: "0.1.0-alpha.2",
      distTag: "alpha",
      fileCount: 8,
      bytes: 39672,
      sha256: "b".repeat(64),
      sha512: digest,
      integrity: "sha512-" + Buffer.from(digest, "hex").toString("base64"),
    },
    inputs: {
      packageJsonSha256: "d".repeat(64),
      lockfileSha256: "e".repeat(64),
    },
    licenses: {
      root: "GPL-3.0-or-later",
      productionDependencies: [
        {
          name: "@missel2/nodes7",
          version: "0.1.0-alpha.2",
          installedAs: "@st-one-io/nodes7",
        },
        { name: "iso-on-tcp", version: "0.1.0", installedAs: "iso-on-tcp" },
      ],
    },
    releaseGates: { npmPublish: "not-authorized" },
  };
}

function publicRegistry() {
  return {
    name: "@missel2/node-red-contrib-s7",
    versions: { "0.0.0-stage": {}, "0.1.0-alpha.1": {} },
    "dist-tags": { latest: "0.0.0-stage", alpha: "0.1.0-alpha.1" },
  };
}

test("same-source Windows/Linux independent candidate bytes are accepted", () => {
  const result = compareManifests(candidate("linux"), candidate("win32"), SOURCE);
  assert.equal(result.sha256, "b".repeat(64));
  assert.equal(result.version, "0.1.0-alpha.2");
});
test("different byte hashes, package size, source or lock must fail closed", () => {
  const linux = candidate("linux");
  for (const changed of [
    { package: { ...candidate("win32").package, sha256: "f".repeat(64) } },
    { package: { ...candidate("win32").package, bytes: 39673 } },
    { inputs: { ...candidate("win32").inputs, lockfileSha256: "f".repeat(64) } },
    { sourceCommit: "f".repeat(40) },
  ]) {
    assert.throws(() =>
      compareManifests(linux, { ...candidate("win32"), ...changed }, SOURCE),
    );
  }
});
test("different SRI, package name, version, permission or host must fail", () => {
  const original = candidate("linux");
  for (const change of [
    { package: { ...original.package, integrity: "sha512-forged" } },
    { package: { ...original.package, version: "0.1.0-alpha.1" } },
    { package: { ...original.package, name: "other" } },
    { releaseGates: { npmPublish: "authorized" } },
    { platform: "win32" },
  ]) {
    assert.throws(() =>
      checkManifest({ ...original, ...change }, SOURCE, "linux"),
    );
  }
});
test("current public npm stage and alpha1 tags admit a new version", () => {
  assert.doesNotThrow(() => inspectPublicRegistry(publicRegistry()));
});
test("already published candidate, moved tags or untrusted metadata fail closed", () => {
  const p = publicRegistry();
  assert.throws(() =>
    inspectPublicRegistry({
      ...p,
      versions: { ...p.versions, "0.1.0-alpha.2": {} },
    }),
  );
  assert.throws(() =>
    inspectPublicRegistry({
      ...p,
      "dist-tags": { ...p["dist-tags"], latest: "0.1.0-alpha.1" },
    }),
  );
  assert.throws(() =>
    inspectPublicRegistry({
      ...p,
      "dist-tags": { ...p["dist-tags"], alpha: "0.1.0-alpha.2" },
    }),
  );
  assert.throws(() => inspectPublicRegistry({ ...p, name: "other" }));
  assert.throws(() => inspectPublicRegistry({ ...p, versions: {} }));
});
test("cross-OS GitHub workflow cannot publish or upload the tarball", () => {
  const workflow = fs
    .readFileSync(".github/workflows/alpha2-archive-reproducibility.yml", "utf8")
    .replace(/\r\n/g, "\n");
  assert.match(workflow, /on:\n  pull_request:\n  push:/);
  assert.match(workflow, /os: \[ubuntu-24\.04, windows-2025\]/);
  assert.match(workflow, /node scripts\/release\/verify-preflight\.cjs/);
  assert.match(workflow, /node scripts\/release\/compare-alpha2-archives\.cjs/);
  assert.match(workflow, /path: release-evidence\/manifest\.json/);
  assert.doesNotMatch(workflow, /id-token: write|npm stage|npm publish|npm dist-tag/);
});
