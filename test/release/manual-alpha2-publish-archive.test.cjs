"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { verifyPublishArchive } = require("../../scripts/release/check-alpha2-publish-archive.cjs");

const SHA = "a".repeat(40);
function manifest(platform) {
  const sha512 = "c".repeat(128);
  return {
    schemaVersion: 1,
    status: "preflight-only-not-published",
    sourceCommit: SHA,
    platform,
    package: {
      name: "@missel2/node-red-contrib-s7",
      version: "0.1.0-alpha.2",
      distTag: "alpha",
      fileCount: 8,
      bytes: 39672,
      sha256: "b".repeat(64),
      sha512,
      integrity: "sha512-" + Buffer.from(sha512, "hex").toString("base64"),
    },
    inputs: {
      packageJsonSha256: "d".repeat(64),
      lockfileSha256: "e".repeat(64),
    },
    licenses: {
      root: "GPL-3.0-or-later",
      productionDependencies: [
        { name: "@missel2/nodes7", version: "0.1.0-alpha.2", installedAs: "@st-one-io/nodes7" },
        { name: "iso-on-tcp", version: "0.1.0", installedAs: "iso-on-tcp" },
      ],
    },
    releaseGates: { npmPublish: "not-authorized" },
  };
}
test("publish archive must reproduce BOTH independent OS builds", () => {
  const result = verifyPublishArchive(manifest("linux"), manifest("win32"), manifest("linux"), SHA);
  assert.equal(result.version, "0.1.0-alpha.2");
});
test("publication rejects byte mismatch, wrong source, different lock and version", () => {
  for (const altered of [
    { package: { ...manifest("linux").package, sha256: "f".repeat(64) } },
    { package: { ...manifest("linux").package, bytes: 39673 } },
    { package: { ...manifest("linux").package, sha512: "f".repeat(128) } },
    { inputs: { ...manifest("linux").inputs, lockfileSha256: "f".repeat(64) } },
    { sourceCommit: "f".repeat(40) },
    { package: { ...manifest("linux").package, version: "0.1.0-alpha.1" } },
  ]) {
    assert.throws(() => verifyPublishArchive(
      manifest("linux"), manifest("win32"), { ...manifest("linux"), ...altered }, SHA,
    ));
  }
});
test("manual publication workflow must have only workflow_dispatch and OIDC gate", () => {
  const text = fs.readFileSync(".github/workflows/npm-publish-alpha2-manual.yml", "utf8");
  const trigger = text.slice(text.indexOf("\non:"), text.indexOf("\nconcurrency:"));
  assert.match(trigger, /workflow_dispatch:/);
  assert.doesNotMatch(trigger, /^\s*(push|pull_request|schedule|release):/m);
  assert.match(text, /environment: npm-release/);
  assert.match(text, /id-token: write/);
  assert.match(text, /inputs\.operation == 'publish'/);
  assert.match(text, /check-alpha2-publish-archive\.cjs/);
  assert.match(text, /npm publish \.\/publish-evidence\/missel2-node-red-contrib-s7-0\.1\.0-alpha\.2\.tgz/);
  assert.match(text, /--provenance --ignore-scripts/);
  assert.doesNotMatch(text, /NODE_AUTH_TOKEN|NPM_TOKEN|secrets\.NPM/);
});
