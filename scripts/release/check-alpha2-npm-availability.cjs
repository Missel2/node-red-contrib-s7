"use strict";

// PR-only public npm registry collision guard; never performs registry writes.
const assert = require("node:assert/strict");

const NAME = "@missel2/node-red-contrib-s7";
const VERSION = "0.1.0-alpha.2";
const URL = "https://registry.npmjs.org/@missel2%2fnode-red-contrib-s7";

function inspectPublicRegistry(packument) {
  assert.equal(packument?.name, NAME, "Unexpected public npm package");
  assert.ok(packument.versions?.["0.1.0-alpha.1"], "Published alpha1 missing");
  assert.equal(
    packument["dist-tags"]?.latest,
    "0.0.0-stage",
    "The unqualified latest tag must stay on the placeholder",
  );
  assert.equal(
    packument["dist-tags"]?.alpha,
    "0.1.0-alpha.1",
    "Unexpected alpha tag before publishing a new wrapper release",
  );
  assert.ok(
    !Object.hasOwn(packument.versions, VERSION),
    "Contrib alpha2 is already published; do not reuse its immutable version",
  );
}

async function main() {
  const response = await fetch(URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, "Cannot prove registry absence without valid npm GET");
  const text = await response.text();
  assert.ok(text.length < 4 * 1024 * 1024, "Unexpectedly large npm metadata");
  inspectPublicRegistry(JSON.parse(text));
  console.log("CONTRIB_ALPHA2_PUBLIC_REGISTRY_VERSION_ABSENT_CONFIRMED");
}

if (require.main === module)
  main().catch((error) => {
    console.error("CONTRIB_ALPHA2_PUBLIC_REGISTRY_GUARD_FAIL: " + String(error.message));
    process.exitCode = 1;
  });
module.exports = { inspectPublicRegistry };
