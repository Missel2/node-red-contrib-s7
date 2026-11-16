"use strict";

// Independent READ-ONLY public npm artifact proof for the already published nodes7.
// No credentials, npm writes, PLC endpoints or Node-RED host changes.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const NAME = "@missel2/nodes7";
const VERSION = "0.1.0-alpha.2";
const SHA1 = "99aae7b1a1969e252239ff09e9760d514df75a5e";
const SHA256 =
  "11327c208ad99dae5eca2fd4a6fd9a83e17637b8eb4ad1f2018c6ba98bd6c81e";
const REGISTRY = "https://registry.npmjs.org";
const TARBALL = REGISTRY + "/@missel2/nodes7/-/nodes7-" + VERSION + ".tgz";
const PACKUMENT_URL = REGISTRY + "/@missel2%2fnodes7";

function inspectPackument(packument) {
  assert.equal(packument?.name, NAME, "Wrong npm package identity");
  const pkg = packument.versions?.[VERSION];
  assert.ok(pkg, "Published alpha.2 version not in npm registry");
  assert.equal(pkg.name, NAME);
  assert.equal(pkg.version, VERSION);
  assert.equal(pkg.license, "GPL-3.0-or-later");
  assert.deepEqual(pkg.dependencies, { "iso-on-tcp": "^0.1.0" });
  assert.equal(
    packument["dist-tags"]?.alpha,
    VERSION,
    "alpha tag must resolve to alpha.2",
  );
  assert.ok(packument["dist-tags"]?.latest, "latest tag missing");
  assert.notEqual(
    packument["dist-tags"].latest,
    VERSION,
    "alpha.2 must not take the latest tag",
  );
  assert.equal(pkg.dist?.tarball, TARBALL, "Unexpected npm tarball origin");
  assert.equal(
    pkg.dist?.shasum,
    SHA1,
    "SHA-1 differs from successful GitHub npm publish",
  );
  assert.match(pkg.dist?.integrity || "", /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  return {
    name: pkg.name,
    version: pkg.version,
    integrity: pkg.dist.integrity,
    sha1: pkg.dist.shasum,
    tarball: pkg.dist.tarball,
    alphaTag: packument["dist-tags"].alpha,
    latestTag: packument["dist-tags"].latest,
    license: pkg.license,
    dependencies: pkg.dependencies,
    provenanceUrl: pkg.dist?.attestations?.provenance?.url || null,
  };
}

function inspectArchive(buffer, view) {
  assert.ok(Buffer.isBuffer(buffer), "Expected downloaded archive bytes");
  assert.ok(
    buffer.length > 10240 && buffer.length < 2097152,
    "Tarball size out of range",
  );
  assert.equal(buffer[0], 0x1f, "Not a gzip archive");
  assert.equal(buffer[1], 0x8b, "Not a gzip archive");
  const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const integrity =
    "sha512-" + crypto.createHash("sha512").update(buffer).digest("base64");
  assert.equal(sha1, SHA1, "Downloaded npm tarball SHA-1 mismatch");
  assert.equal(
    sha256,
    SHA256,
    "Downloaded npm tarball not identical to approved GitHub build",
  );
  assert.equal(
    integrity,
    view?.integrity,
    "Downloaded npm tarball SHA-512 mismatches registry",
  );
  return { sha1, sha256, integrity, size: buffer.length };
}

async function getBytes(url) {
  const response = await fetch(url, {
    // Full npm packument retains manifest license/credits, unlike install-v1 metadata.
    headers: {
      Accept:
        url === PACKUMENT_URL ? "application/json" : "application/octet-stream",
    },
    signal: AbortSignal.timeout(25000),
  });
  assert.equal(response.status, 200, "Public npm GET failed for " + url);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length < 4 * 1024 * 1024, "Oversized registry response");
  return bytes;
}

async function main() {
  const packument = JSON.parse(
    (await getBytes(PACKUMENT_URL)).toString("utf8"),
  );
  const view = inspectPackument(packument);
  const artifact = inspectArchive(await getBytes(view.tarball), view);
  const report = {
    schemaVersion: 1,
    result: "passed",
    source: "independent public npm GET (not GitHub publish response)",
    platform: process.platform,
    node: process.version,
    package: NAME + "@" + VERSION,
    ...view,
    archive: artifact,
    exactGitHubSource: "8c20db1db83ebc687cef280f589f22052825e909",
    githubPublishRun: 43751615794,
    noProductionOrPlcAccess: true,
    hil: "PENDING_HARDWARE",
  };
  const dest = path.resolve(
    "test-reports/nodes7-alpha2-registry-" + process.platform + ".json",
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(report, null, 2) + "\n");
  console.log(
    "NODES7_ALPHA2_PUBLIC_REGISTRY_VERIFIED=" +
      JSON.stringify({
        version: view.version,
        integrity: artifact.integrity,
        sha256: artifact.sha256,
        sha1: artifact.sha1,
        latest: view.latestTag,
        alpha: view.alphaTag,
        provenanceUrl: view.provenanceUrl,
        size: artifact.size,
      }),
  );
}
if (require.main === module)
  main().catch((error) => {
    console.error(
      "NODES7_ALPHA2_PUBLIC_REGISTRY_FAIL: " +
        String(error.message).slice(0, 280),
    );
    process.exitCode = 1;
  });
module.exports = { inspectPackument, inspectArchive };
