"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const {
  inspectPackument,
  inspectArchive,
} = require("../../scripts/release/verify-nodes7-alpha2-registry.cjs");

const version = "0.1.0-alpha.2";
function packument() {
  return {
    name: "@missel2/nodes7",
    "dist-tags": { alpha: version, latest: "0.0.0-stage" },
    versions: {
      [version]: {
        name: "@missel2/nodes7",
        version,
        license: "GPL-3.0-or-later",
        dependencies: { "iso-on-tcp": "^0.1.0" },
        dist: {
          tarball:
            "https://registry.npmjs.org/@missel2/nodes7/-/nodes7-" +
            version +
            ".tgz",
          shasum: "99aae7b1a1969e252239ff09e9760d514df75a5e",
          integrity: "sha512-aGVsbG8=",
        },
      },
    },
  };
}

test("correct package and independently required alpha tag are accepted", () => {
  const view = inspectPackument(packument());
  assert.equal(view.version, version);
  assert.equal(view.latestTag, "0.0.0-stage");
});
test("unpublished version, wrong package, missing latest or moving latest fail closed", () => {
  const base = packument();
  assert.throws(() => inspectPackument({ ...base, name: "@other/nodes7" }));
  assert.throws(() => inspectPackument({ ...base, versions: {} }));
  assert.throws(() =>
    inspectPackument({ ...base, "dist-tags": { alpha: version } }),
  );
  assert.throws(() =>
    inspectPackument({
      ...base,
      "dist-tags": { alpha: version, latest: version },
    }),
  );
  assert.throws(() =>
    inspectPackument({
      ...base,
      "dist-tags": { alpha: "0.1.0-alpha.1", latest: "0.0.0-stage" },
    }),
  );
});
test("unexpected download URL, shasum, lock dependency or license fail closed", () => {
  const base = packument();
  const p = base.versions[version];
  for (const change of [
    { dist: { ...p.dist, tarball: "https://example.invalid/package.tgz" } },
    { dist: { ...p.dist, shasum: "0".repeat(40) } },
    { dist: { ...p.dist, integrity: "sha512-fake!!!" } },
    { dependencies: { "iso-on-tcp": "^99.0.0" } },
    { license: "UNLICENSED" },
  ]) {
    const modified = { ...base, versions: { [version]: { ...p, ...change } } };
    assert.throws(() => inspectPackument(modified));
  }
});
test("corrupted or non-gzip tarballs never count as approved release", () => {
  const view = inspectPackument(packument());
  assert.throws(() => inspectArchive(Buffer.alloc(14000, 0), view));
  const fake = Buffer.alloc(14000, 0);
  fake[0] = 0x1f;
  fake[1] = 0x8b;
  assert.throws(() => inspectArchive(fake, view));
});
test("registry proof workflow is read-only, on GitHub-hosted Windows/Linux", () => {
  const workflow = fs.readFileSync(
    ".github/workflows/published-alpha-consumer.yml",
    "utf8",
  );
  assert.match(workflow, /name: Published alpha consumer proof \(no publish\)/);
  assert.match(workflow, /on:\r?\n  pull_request:/);
  assert.match(workflow, /os: \[ubuntu-24\.04, windows-2025\]/);
  assert.match(
    workflow,
    /node scripts\/release\/verify-nodes7-alpha2-registry\.cjs/,
  );
  assert.doesNotMatch(
    workflow,
    /id-token: write|npm stage publish|npm stage approve|npm publish|npm dist-tag/,
  );
});
