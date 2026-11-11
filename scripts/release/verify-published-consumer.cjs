"use strict";

// Read-only post-publication proof: public npm registry, no PLC or release writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");

const NAME = "@missel2/node-red-contrib-s7";
const VERSION = "0.1.0-alpha.1";
const HASH = "310798891f65201267bcfbdfc16a7145f953d36ada89f5f2992746b257a5e40b";
const SRI = "sha512-uXJpLOQLQ0hlUfWeFF+q4pswN3KWK+kKjzEP/rKn4DQ9P/xDS1uec74qBHWPi6kdJfUfkFRDFzCU2ETm3a8jzA==";
const NODES7_SRI = "sha512-07lzsDrfxQ5P15iM/+rjxNVbo0gyIGWjKivXfgU/tEUQs1qO+A0upy6690qy85mG7mEiNpek1xqhRVASvb9ktw==";
const FILES = ["LICENSE", "README.md", "package.json", "red/locales/de/s7.json", "red/locales/en-US/s7.json", "red/s7.html", "red/s7.js", "src/tools.js"].sort();
const REGISTRY = "https://registry.npmjs.org/";

function npm(args, cwd) {
  return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd, encoding: "utf8", timeout: 240000, windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function sha(p) { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
function inspectRegistry(view, tags) {
  assert.equal(view.name, NAME);
  assert.equal(view.version, VERSION);
  assert.equal(view.dist?.shasum, "03085bab0e75a2065398b795cce7c4e881eb79b2");
  assert.equal(view.dist?.integrity, SRI);
  assert.equal(tags.alpha, VERSION);
  assert.equal(tags.latest, "0.0.0-stage", "latest must not be set to alpha");
  assert.equal(view.license, "GPL-3.0-or-later");
  assert.equal(view.dependencies?.["@st-one-io/nodes7"], "npm:@missel2/nodes7@0.1.0-alpha.1");
}
function inspectPack(record, file) {
  assert.equal(record.name, NAME);
  assert.equal(record.version, VERSION);
  assert.equal(record.size, 39672);
  assert.equal(record.shasum, "03085bab0e75a2065398b795cce7c4e881eb79b2");
  assert.equal(record.integrity, SRI);
  assert.deepEqual(record.files.map((f) => f.path).sort(), FILES);
  assert.ok(record.files.every((f) => f.mode === 420), "Expected mode 0644 for all 8 files");
  assert.equal(sha(file), HASH, "Downloaded npm artifact differs from GitHub release preflight");
}
function inspectInstall(lock, wrapper, alias, nodeRed) {
  const packages = lock.packages;
  assert.equal(packages["node_modules/@missel2/node-red-contrib-s7"]?.integrity, SRI);
  assert.equal(packages["node_modules/@st-one-io/nodes7"]?.integrity, NODES7_SRI);
  assert.equal(wrapper.name, NAME);
  assert.equal(wrapper.version, VERSION);
  assert.deepEqual(wrapper["node-red"]?.nodes, { s7: "red/s7.js" });
  assert.equal(alias.name, "@missel2/nodes7");
  assert.equal(alias.version, VERSION);
  assert.equal(nodeRed.version, "5.0.9");
}
function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "s7-public-consumer-"));
  const report = {
    schemaVersion: 1, result: "failed", package: NAME + "@" + VERSION,
    platform: process.platform, node: process.version, source: "public-npm-registry",
    expectedSha256: HASH, realControllerTest: false, hil: "PENDING_HARDWARE",
  };
  try {
    const view = JSON.parse(npm(["view", NAME + "@" + VERSION, "--json", "--registry=" + REGISTRY], tmp));
    const tags = JSON.parse(npm(["view", NAME, "dist-tags", "--json", "--registry=" + REGISTRY], tmp));
    inspectRegistry(view, tags);
    const packs = JSON.parse(npm(["pack", NAME + "@" + VERSION, "--json", "--ignore-scripts", "--registry=" + REGISTRY, "--pack-destination", tmp], tmp));
    assert.equal(packs.length, 1);
    inspectPack(packs[0], path.join(tmp, packs[0].filename));
    const user = path.join(tmp, "consumer");
    fs.mkdirSync(user);
    fs.writeFileSync(path.join(user, "package.json"), JSON.stringify({ name: "public-s7-consumer-proof", version: "0.0.0", private: true }) + "\n");
    // Pin both packages, preserve the upstream Node-RED 5.0.9 host unchanged.
    npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", "--registry=" + REGISTRY, NAME + "@" + VERSION, "node-red@5.0.9"], user);
    const wrapperPath = path.join(user, "node_modules", "@missel2", "node-red-contrib-s7");
    const wrapper = readJson(path.join(wrapperPath, "package.json"));
    const alias = createRequire(path.join(wrapperPath, "package.json"))("@st-one-io/nodes7/package.json");
    inspectInstall(readJson(path.join(user, "package-lock.json")), wrapper, alias, readJson(path.join(user, "node_modules", "node-red", "package.json")));
    for (const f of FILES) assert.ok(fs.statSync(path.join(wrapperPath, f)).isFile(), "Missing published asset " + f);
    report.downloadedSha256 = HASH;
    report.tags = { alpha: tags.alpha, latest: tags.latest };
    report.nodes7 = alias.name + "@" + alias.version;
    report.nodeRed = "5.0.9";
    report.result = "passed";
  } catch (error) {
    report.error = String(error.message).slice(0, 750);
    console.error("PUBLIC_NPM_CONSUMER_FAIL: " + report.error);
    process.exitCode = 1;
  } finally {
    const dest = path.resolve("test-reports/public-npm-consumer.json");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(report, null, 2) + "\n");
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
    console.log("PUBLIC_NPM_CONSUMER_" + (report.result === "passed" ? "PASS" : "FAIL"));
  }
}
module.exports = { inspectRegistry, inspectPack, inspectInstall };
if (require.main === module) main();
