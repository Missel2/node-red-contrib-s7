"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const required = [
  "LICENSE",
  "package.json",
  "red/s7.js",
  "red/s7.html",
  "red/locales/en-US/s7.json",
  "red/locales/de/s7.json",
  "src/tools.js",
];
const excluded = [".github/", "docs/", "test/", "tools/", "scripts/", "test-reports/"];

function assertPackageFiles(files) {
  const paths = files.map((item) => item.path);
  const allowedRoots = ["LICENSE", "README.md", "package.json", "red/", "src/"];
  for (const file of paths) {
    assert.ok(
      allowedRoots.some((root) => file === root || (root.endsWith("/") && file.startsWith(root))),
      "Unexpected release package content: " + file,
    );
  }
  const included = new Set(paths);
  for (const file of required) {
    assert.ok(included.has(file), "Missing Node-RED runtime file: " + file);
  }
  for (const prefix of excluded) {
    assert.ok(
      paths.every((name) => !name.startsWith(prefix)),
      "Test-only package content: " + prefix,
    );
  }
}

const file = process.argv[2];
if (!file) throw new Error("Missing npm pack JSON path");
const packs = JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(packs.length, 1, "npm pack must describe exactly one package");
assert.equal(packs[0].name, "@missel2/node-red-contrib-s7");
assert.equal(packs[0].version, "0.1.0-alpha.1");
assertPackageFiles(packs[0].files);

for (const prefix of excluded) {
  assert.throws(
    () =>
      assertPackageFiles([
        ...packs[0].files,
        { path: prefix + "example.json" },
      ]),
    /Test-only package content/,
  );
}
assert.throws(
  () =>
    assertPackageFiles(
      packs[0].files.filter(({ path }) => path !== "red/locales/de/s7.json"),
    ),
  /Missing Node-RED runtime file/,
);

console.log(
  "PACKAGE_MANIFEST_PASS: Node-RED runtime and locales present, test tools and reports excluded",
);
