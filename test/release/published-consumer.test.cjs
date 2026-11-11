"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  inspectRegistry,
  inspectPack,
  inspectInstall,
} = require("../../scripts/release/verify-published-consumer.cjs");

const version = "0.1.0-alpha.1";
const integrity =
  "sha512-uXJpLOQLQ0hlUfWeFF+q4pswN3KWK+kKjzEP/rKn4DQ9P/xDS1uec74qBHWPi6kdJfUfkFRDFzCU2ETm3a8jzA==";
const view = {
  name: "@missel2/node-red-contrib-s7",
  version,
  license: "GPL-3.0-or-later",
  dependencies: { "@st-one-io/nodes7": "npm:@missel2/nodes7@0.1.0-alpha.1" },
  dist: { shasum: "03085bab0e75a2065398b795cce7c4e881eb79b2", integrity },
};
const tags = { alpha: version, latest: "0.0.0-stage" };
const lock = {
  packages: {
    "node_modules/@missel2/node-red-contrib-s7": { integrity },
    "node_modules/@st-one-io/nodes7": {
      integrity:
        "sha512-07lzsDrfxQ5P15iM/+rjxNVbo0gyIGWjKivXfgU/tEUQs1qO+A0upy6690qy85mG7mEiNpek1xqhRVASvb9ktw==",
    },
  },
};
const wrapper = {
  name: view.name,
  version,
  "node-red": { nodes: { s7: "red/s7.js" } },
};
const alias = { name: "@missel2/nodes7", version };

test("Expected public registry metadata is accepted", () => {
  assert.doesNotThrow(() => inspectRegistry(view, tags));
});
test("Wrong tags, integrity and unexpected dependency alias fail closed", () => {
  assert.throws(() => inspectRegistry(view, { ...tags, alpha: "0.0.0-stage" }));
  assert.throws(() => inspectRegistry(view, { ...tags, latest: version }));
  assert.throws(() =>
    inspectRegistry(
      { ...view, dist: { ...view.dist, integrity: "sha512-wrong" } },
      tags,
    ),
  );
  assert.throws(() =>
    inspectRegistry(
      {
        ...view,
        dependencies: { "@st-one-io/nodes7": "npm:@missel2/nodes7@latest" },
      },
      tags,
    ),
  );
});
test("Consumer alias and upstream Node-RED version are enforced", () => {
  assert.doesNotThrow(() =>
    inspectInstall(lock, wrapper, alias, { version: "5.0.9" }),
  );
  assert.throws(() =>
    inspectInstall(
      lock,
      wrapper,
      { ...alias, version: "1.1.2" },
      { version: "5.0.9" },
    ),
  );
  assert.throws(() =>
    inspectInstall(lock, wrapper, alias, { version: "5.0.8" }),
  );
});
test("Corrupt package bytes or wrong file mode cannot be certified", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "s7-negative-archive-"));
  try {
    const file = path.join(dir, "damaged.tgz");
    fs.writeFileSync(file, "intentionally incorrect");
    const files = [
      "LICENSE",
      "README.md",
      "package.json",
      "red/locales/de/s7.json",
      "red/locales/en-US/s7.json",
      "red/s7.html",
      "red/s7.js",
      "src/tools.js",
    ].map((p) => ({ path: p, mode: 420 }));
    const record = {
      name: view.name,
      version,
      filename: "missel2-node-red-contrib-s7-0.1.0-alpha.1.tgz",
      size: 39672,
      shasum: view.dist.shasum,
      integrity,
      files,
    };
    assert.throws(() => inspectPack(record, file));
    assert.throws(() =>
      inspectPack(
        { ...record, files: files.map((f) => ({ ...f, mode: 384 })) },
        file,
      ),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
