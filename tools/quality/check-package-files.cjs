"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const required = [
  "LICENSE",
  "package.json",
  "red/s7.js",
  "red/s7.html",
  "red/locales/en-US/s7.json",
  "src/tools.js",
];

function assertPackageFiles(files) {
  const paths = files.map((item) => item.path);
  const included = new Set(paths);
  for (const file of required) {
    assert.ok(included.has(file), "Missing Node-RED runtime file: " + file);
  }
  assert.ok(
    paths.every((name) => !name.startsWith("tools/quality/")),
    "CI-only quality tools must not ship in the npm tarball",
  );
}

const file = process.argv[2];
if (!file) throw new Error("Missing npm pack JSON path");
const packs = JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(packs.length, 1, "npm pack must describe exactly one package");
assertPackageFiles(packs[0].files);

assert.throws(
  () =>
    assertPackageFiles([
      ...packs[0].files,
      { path: "tools/quality/package-lock.json" },
    ]),
  /CI-only quality tools/,
  "Negative control must reject accidentally shipping quality-tool lockfiles",
);

console.log(
  "PACKAGE_MANIFEST_PASS: Node-RED runtime present, CI quality tools excluded, negative control red",
);
