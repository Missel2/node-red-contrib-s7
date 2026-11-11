"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const expectedName = "@missel2/node-red-contrib-s7";
const expectedVersion = "0.1.0-alpha.1";
const dependencies = ["@st-one-io/nodes7", "iso-on-tcp"];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function digest(data, algorithm, encoding = "hex") {
  return crypto.createHash(algorithm).update(data).digest(encoding);
}

function assertReleaseIdentity(pkg, lock) {
  assert.equal(pkg.name, expectedName, "Unexpected release package identity");
  assert.equal(pkg.version, expectedVersion, "Unexpected release version");
  assert.equal(pkg.license, "GPL-3.0-or-later", "Root license changed");
  assert.deepEqual(pkg.files, ["red/", "src/"], "Release file allowlist changed");
  assert.equal(pkg.publishConfig?.tag, "alpha", "Non-alpha dist-tag");
  assert.equal(pkg.publishConfig?.access, "public", "Unexpected publish visibility");
  assert.equal(lock.name, pkg.name, "Root lockfile name mismatch");
  assert.equal(lock.version, pkg.version, "Root lockfile version mismatch");
  assert.equal(lock.packages?.[""]?.name, pkg.name);
  assert.equal(lock.packages?.[""]?.version, pkg.version);
  assert.deepEqual(lock.packages?.[""]?.dependencies, pkg.dependencies);
  assert.deepEqual(
    Object.keys(lock.packages).filter(Boolean).sort(),
    dependencies.map((item) => "node_modules/" + item).sort(),
    "Production dependency set changed without release review",
  );
}

function assertPack(record, pkg) {
  assert.equal(record.name, pkg.name);
  assert.equal(record.version, pkg.version);
  assert.equal(
    record.filename,
    pkg.name.slice(1).replace("/", "-") + "-" + pkg.version + ".tgz",
    "Unexpected tarball filename",
  );
  assert.ok(Array.isArray(record.files) && record.files.length >= 7);
  const allowed = ["LICENSE", "README.md", "package.json", "red/", "src/"];
  const paths = record.files.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length, "Duplicate package file names");
  for (const filename of paths) {
    assert.ok(
      allowed.some(
        (part) =>
          filename === part ||
          (part.endsWith("/") && filename.startsWith(part)),
      ),
      "Unexpected file in publishable tarball",
    );
    assert.ok(
      !filename.includes("..") && !path.posix.isAbsolute(filename),
      "Invalid package archive path",
    );
  }
  for (const needed of [
    "LICENSE",
    "README.md",
    "package.json",
    "red/s7.js",
    "red/s7.html",
    "src/tools.js",
  ]) {
    assert.ok(paths.includes(needed), "Required package content missing");
  }
  return paths;
}

function readLicenseInventory(lock) {
  const result = [];
  for (const name of dependencies) {
    const location = path.join(root, "node_modules", name);
    const pkg = readJson(path.join(location, "package.json"));
    const locked = lock.packages["node_modules/" + name];
    assert.equal(pkg.name, name, "Installed dependency name changed");
    assert.equal(pkg.version, locked.version, "Installed dependency version mismatch");
    assert.equal(
      pkg.license,
      "GPL-3.0-or-later",
      "Dependency license changed or is missing",
    );
    const files = fs.readdirSync(location);
    const notices = files.filter((name) => /^(license|copying)(\..*)?$/i.test(name));
    assert.ok(notices.length > 0, "Dependency license text missing");
    result.push({
      name,
      version: pkg.version,
      licenseDeclared: pkg.license,
      licenseFilePresent: true,
    });
  }
  return result;
}

function assertSbom(spdx, cdx, pkg, lock) {
  assert.ok(spdx.spdxVersion?.startsWith("SPDX-2."));
  assert.equal(spdx.SPDXID, "SPDXRef-DOCUMENT");
  assert.equal(cdx.bomFormat, "CycloneDX");
  assert.ok(Array.isArray(spdx.packages));
  assert.ok(Array.isArray(cdx.components));
  const expected = [
    [pkg.name, pkg.version],
    ...dependencies.map((name) => [name, lock.packages["node_modules/" + name].version]),
  ];
  for (const [name, version] of expected) {
    assert.ok(
      spdx.packages.some((p) => p.name === name && p.versionInfo === version),
      "SPDX missing production component",
    );
  }
  for (const name of dependencies) {
    const version = lock.packages["node_modules/" + name].version;
    assert.ok(
      cdx.components.some((p) => p.name === name && p.version === version),
      "CycloneDX missing production dependency",
    );
  }
  assert.equal(
    cdx.metadata?.component?.purl,
    "pkg:npm/%40missel2/node-red-contrib-s7@" + pkg.version,
    "CycloneDX root purl mismatch",
  );
}

function main() {
  const evidenceDir = path.resolve(process.argv[2] || "release-evidence");
  const pkg = readJson(path.join(root, "package.json"));
  const lock = readJson(path.join(root, "package-lock.json"));
  assertReleaseIdentity(pkg, lock);

  const packs = readJson(path.join(evidenceDir, "pack.json"));
  assert.equal(packs.length, 1, "Expected exactly one npm archive");
  const record = packs[0];
  const filePaths = assertPack(record, pkg);
  const tarball = path.join(evidenceDir, record.filename);
  assert.equal(path.dirname(tarball), evidenceDir);
  const tarBytes = fs.readFileSync(tarball);
  const integrity = "sha512-" + digest(tarBytes, "sha512", "base64");
  assert.equal(record.integrity, integrity, "Pack metadata integrity mismatch");
  assert.equal(record.shasum, digest(tarBytes, "sha1"), "Pack shasum mismatch");

  const archived = execFileSync("tar", ["-tzf", tarball], {
    encoding: "utf8",
    timeout: 10000,
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((item) => {
      assert.ok(item.startsWith("package/"), "Unexpected archive root");
      return item.slice("package/".length);
    })
    .filter((item) => item && !item.endsWith("/"));
  assert.deepEqual(archived.sort(), filePaths.sort(), "Archive and npm metadata differ");

  const spdxFile = path.join(evidenceDir, "sbom.spdx.json");
  const cdxFile = path.join(evidenceDir, "sbom.cdx.json");
  assertSbom(readJson(spdxFile), readJson(cdxFile), pkg, lock);
  const licenses = readLicenseInventory(lock);
  const sourceSha = process.env.SOURCE_SHA;
  assert.match(sourceSha || "", /^[0-9a-f]{40}$/, "Missing exact source commit");
  const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
  }).trim();
  assert.equal(checkoutSha, sourceSha, "Checked-out commit differs from requested source");

  const manifest = {
    schemaVersion: 1,
    status: "preflight-only-not-published",
    sourceCommit: sourceSha,
    node: process.version,
    npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
    platform: process.platform,
    package: {
      name: pkg.name,
      version: pkg.version,
      distTag: pkg.publishConfig.tag,
      fileCount: filePaths.length,
      bytes: tarBytes.length,
      sha256: digest(tarBytes, "sha256"),
      sha512: digest(tarBytes, "sha512"),
      integrity,
    },
    inputs: {
      packageJsonSha256: digest(fs.readFileSync(path.join(root, "package.json")), "sha256"),
      lockfileSha256: digest(fs.readFileSync(path.join(root, "package-lock.json")), "sha256"),
    },
    billOfMaterials: {
      type: "lockfile-derived, production dependencies only",
      spdxSha256: digest(fs.readFileSync(spdxFile), "sha256"),
      cyclonedxSha256: digest(fs.readFileSync(cdxFile), "sha256"),
    },
    licenses: {
      root: pkg.license,
      productionDependencies: licenses,
      manualLegalReview: "required-before-publish",
    },
    releaseGates: {
      publicDisclosureAndHistoryReview: "requires-maintainer-decision",
      physicalControllerQualification: "not-performed",
      npmPublish: "not-authorized",
    },
  };
  fs.writeFileSync(
    path.join(evidenceDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log("RELEASE_PREFLIGHT_PASS: archive, integrity, dependency SBOM and license metadata");
  console.log("RELEASE_PREFLIGHT_SOURCE_SHA=" + sourceSha);
  console.log("RELEASE_PREFLIGHT_TARBALL_SHA256=" + manifest.package.sha256);
  console.log("RELEASE_PREFLIGHT_STATUS=not-published");
}

if (require.main === module) {
  main();
}

module.exports = { assertReleaseIdentity, assertPack, assertSbom };
