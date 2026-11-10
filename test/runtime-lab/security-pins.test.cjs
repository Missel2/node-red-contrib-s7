"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const lab = __dirname;
const manifest = JSON.parse(
  fs.readFileSync(path.join(lab, "package.json"), "utf8"),
);
const lock = JSON.parse(
  fs.readFileSync(path.join(lab, "package-lock.json"), "utf8"),
);
const scopedOverrides = {
  "@node-red/editor-api": { multer: "2.5.0" },
  "@node-red/nodes": { multer: "2.5.0" },
  "@node-red/registry": { npm: "11.21.2" },
};
const patchedPackages = [
  ["node_modules/multer", "2.5.0"],
  ["node_modules/npm", "11.21.2"],
  ["node_modules/npm/node_modules/undici", "6.29.1"],
];

function assertPartialSecurityPins(source, installed) {
  assert.equal(source.private, true, "Lab must stay private");
  assert.deepEqual(source.devDependencies, { "node-red": "5.0.9" });
  assert.deepEqual(
    source.overrides,
    scopedOverrides,
    "No blanket overrides, implicit downgrades or untested packages",
  );
  assert.deepEqual(installed.packages[""].devDependencies, {
    "node-red": "5.0.9",
  });
  assert.equal(installed.packages["node_modules/node-red"].version, "5.0.9");
  for (const [name, version] of patchedPackages) {
    const record = installed.packages[name];
    assert.ok(record, "Missing security-reviewed package: " + name);
    assert.equal(record.version, version, "Unexpected resolved " + name);
    if (record.inBundle) {
      assert.match(
        installed.packages["node_modules/npm"].integrity,
        /^sha512-/,
        "Bundled package must be covered by the parent npm tarball integrity",
      );
    } else {
      assert.match(
        record.integrity || "",
        /^sha512-/,
        "Missing registry integrity for " + name,
      );
    }
  }
  assert.equal(
    installed.packages["node_modules/@node-red/editor-api"].version,
    "5.0.9",
  );
  assert.equal(
    installed.packages["node_modules/@node-red/nodes"].version,
    "5.0.9",
  );
  assert.equal(
    installed.packages["node_modules/@node-red/registry"].version,
    "5.0.9",
  );
}

test("test-only scoped fixes preserve the installed Node-RED 5.0.9 baseline", () => {
  assertPartialSecurityPins(manifest, lock);
});

test("negative controls detect a reverted advisory fix or unexpected override", () => {
  for (const [name] of patchedPackages) {
    const modified = structuredClone(lock);
    modified.packages[name].version = "0.0.0";
    assert.throws(
      () => assertPartialSecurityPins(manifest, modified),
      /Unexpected resolved/,
    );
  }
  const modifiedManifest = structuredClone(manifest);
  modifiedManifest.overrides.minimatch = "11.0.1";
  assert.throws(
    () => assertPartialSecurityPins(modifiedManifest, lock),
    /No blanket overrides/,
  );
  modifiedManifest.overrides = scopedOverrides;
  modifiedManifest.devDependencies["node-red"] = "4.1.8";
  assert.throws(
    () => assertPartialSecurityPins(modifiedManifest, lock),
    /deep-equal/,
  );
});

test("keep unresolved bundled minimatch security debt visible (issue 27)", () => {
  const bundled = lock.packages["node_modules/npm/node_modules/minimatch"];
  assert.ok(bundled, "Record the real npm-bundled minimatch version");
  console.log(
    "SECURITY_DEBT_OPEN: npm bundles minimatch@" +
      bundled.version +
      "; check GHSA-g3hv-75wg-m249; this partial fix is not audit-clean",
  );
});
