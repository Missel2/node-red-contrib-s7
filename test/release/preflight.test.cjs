"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertReleaseIdentity,
  assertPack,
  assertSbom,
} = require("../../scripts/release/verify-preflight.cjs");

function fixture() {
  const pkg = {
    name: "@missel2/node-red-contrib-s7",
    version: "0.1.0-alpha.1",
    license: "GPL-3.0-or-later",
    files: ["red/", "src/"],
    publishConfig: { access: "public", tag: "alpha" },
    dependencies: { "@st-one-io/nodes7": "npm:@missel2/nodes7@0.1.0-alpha.1" },
  };
  const lock = {
    name: pkg.name,
    version: pkg.version,
    packages: {
      "": {
        name: pkg.name,
        version: pkg.version,
        dependencies: pkg.dependencies,
      },
      "node_modules/@st-one-io/nodes7": {
        name: "@missel2/nodes7",
        version: "0.1.0-alpha.1",
        resolved:
          "https://registry.npmjs.org/@missel2/nodes7/-/nodes7-0.1.0-alpha.1.tgz",
        integrity:
          "sha512-07lzsDrfxQ5P15iM/+rjxNVbo0gyIGWjKivXfgU/tEUQs1qO+A0upy6690qy85mG7mEiNpek1xqhRVASvb9ktw==",
      },
      "node_modules/iso-on-tcp": { version: "0.1.0" },
    },
  };
  const pack = {
    name: pkg.name,
    version: pkg.version,
    filename: "missel2-node-red-contrib-s7-0.1.0-alpha.1.tgz",
    files: [
      "LICENSE",
      "README.md",
      "package.json",
      "red/s7.js",
      "red/s7.html",
      "red/locales/en-US/s7.json",
      "red/locales/de/s7.json",
      "src/tools.js",
    ].map((path) => ({ path })),
  };
  return { pkg, lock, pack };
}

test("release preflight accepts the controlled alpha identity", () => {
  const { pkg, lock, pack } = fixture();
  assert.doesNotThrow(() => assertReleaseIdentity(pkg, lock));
  assert.doesNotThrow(() => assertPack(pack, pkg));
});

test("wrong dist-tag, scope and dependency changes fail closed", () => {
  const { pkg, lock } = fixture();
  assert.throws(() => assertReleaseIdentity({ ...pkg, name: "other" }, lock));
  assert.throws(() =>
    assertReleaseIdentity(
      { ...pkg, publishConfig: { access: "public", tag: "latest" } },
      lock,
    ),
  );
  assert.throws(() =>
    assertReleaseIdentity(pkg, {
      ...lock,
      packages: {
        ...lock.packages,
        "node_modules/unknown": { version: "0.0.1" },
      },
    }),
  );
});

test("wrong published alias or SHA512 integrity is rejected", () => {
  const { pkg, lock } = fixture();
  assert.throws(() =>
    assertReleaseIdentity(
      { ...pkg, dependencies: { "@st-one-io/nodes7": "npm:@missel2/nodes7@latest" } },
      lock,
    ),
  );
  const nodePath = "node_modules/@st-one-io/nodes7";
  assert.throws(() =>
    assertReleaseIdentity(pkg, {
      ...lock,
      packages: {
        ...lock.packages,
        [nodePath]: {
          ...lock.packages[nodePath],
          integrity: "sha512-incorrect",
        },
      },
    }),
  );
});

test("archive reject-list catches unexpected files and missing runtime assets", () => {
  const { pkg, pack } = fixture();
  assert.throws(() =>
    assertPack(
      { ...pack, files: [...pack.files, { path: "docs/private-note.md" }] },
      pkg,
    ),
  );
  assert.throws(() =>
    assertPack(
      {
        ...pack,
        files: pack.files.filter((item) => item.path !== "red/s7.js"),
      },
      pkg,
    ),
  );
});

test("SBOM rejects missing locked production dependencies", () => {
  const { pkg, lock } = fixture();
  const spdx = {
    spdxVersion: "SPDX-2.3",
    SPDXID: "SPDXRef-DOCUMENT",
    packages: [
      { name: pkg.name, versionInfo: pkg.version },
      { name: "@missel2/nodes7", versionInfo: "0.1.0-alpha.1" },
      { name: "iso-on-tcp", versionInfo: "0.1.0" },
    ],
  };
  const cdx = {
    bomFormat: "CycloneDX",
    metadata: {
      component: {
        purl: "pkg:npm/%40missel2/node-red-contrib-s7@0.1.0-alpha.1",
      },
    },
    components: [
      { name: "@missel2/nodes7", version: "0.1.0-alpha.1" },
      { name: "iso-on-tcp", version: "0.1.0" },
    ],
  };
  assert.doesNotThrow(() => assertSbom(spdx, cdx, pkg, lock));
  assert.throws(() =>
    assertSbom(
      spdx,
      { ...cdx, components: cdx.components.slice(0, 1) },
      pkg,
      lock,
    ),
  );
});
