"use strict";

const assert = require("node:assert/strict");
const { execFile, spawn } = require("node:child_process");
const { createHash } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { promisify } = require("node:util");

const exec = promisify(execFile);
const root = path.resolve(__dirname, "../..");
const evidenceFile = path.join(root, "test-reports/s7-runtime-lab.json");
const python = process.env.S7_FIXTURE_PYTHON || "python";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function digest(file, algorithm = "sha256", encoding = "hex") {
  return createHash(algorithm).update(fs.readFileSync(file)).digest(encoding);
}

function run(command, args, cwd, timeout) {
  return exec(command, args, {
    cwd,
    timeout,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function npm(args, cwd) {
  assert.ok(process.env.npm_execpath, "Run with npm run test:runtime-lab");
  return run(
    process.execPath,
    [process.env.npm_execpath, ...args],
    cwd,
    120000,
  );
}

function deadline(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function exportSource(commit, sandbox) {
  const listing = await run(
    "git",
    ["ls-tree", "-rz", "--name-only", commit],
    root,
    10000,
  );
  const files = listing.stdout.split("\0").filter(Boolean);
  assert.equal(
    new Set(files.map((file) => file.toLowerCase())).size,
    files.length,
    "The Git source contains case-colliding paths",
  );
  const archive = path.join(sandbox, "source.zip");
  const source = path.join(sandbox, "source");
  await run(
    "git",
    [
      "-c",
      "core.autocrlf=false",
      "-c",
      "core.eol=lf",
      "archive",
      "--format=zip",
      "--output=" + archive,
      commit,
    ],
    root,
    10000,
  );
  await run(python, ["-m", "zipfile", "-e", archive, source], sandbox, 10000);
  for (const file of [
    "package-lock.json",
    "test/runtime-lab/package-lock.json",
  ]) {
    const blob = await run("git", ["show", commit + ":" + file], root, 10000);
    assert.ok(
      fs
        .readFileSync(path.join(source, file))
        .equals(Buffer.from(blob.stdout, "utf8")),
      "Archived lock bytes differ from the Git blob: " + file,
    );
  }
  return source;
}

function startFixture() {
  const child = spawn(
    python,
    ["-u", path.join(root, "test/protocol/fixture_server.py")],
    {
      cwd: root,
      env: { ...process.env, S7_FIXTURE_PORT: "0" },
      stdio: ["ignore", "pipe", "inherit"],
      windowsHide: true,
    },
  );
  const lines = readline.createInterface({ input: child.stdout });
  const closed = new Promise((resolve) => child.once("close", resolve));
  const error = new Promise((_, reject) => child.once("error", reject));
  const ready = deadline(
    Promise.race([
      once(lines, "line").then(([line]) => {
        const match = /^S7_WIRE_FIXTURE_READY (\d+) (3\.3\.1)$/.exec(line);
        assert.ok(
          match,
          "Expected a ready python-snap7 3.3.1 loopback fixture",
        );
        const port = Number(match[1]);
        assert.ok(port >= 1024 && port <= 65535);
        return { port, version: match[2] };
      }),
      closed.then((code) => {
        throw new Error("S7 fixture exited before readiness: " + code);
      }),
      error,
    ]),
    12000,
    "S7 fixture did not become ready",
  );
  return {
    ready,
    async stop() {
      lines.close();
      if (child.exitCode === null && child.signalCode === null) child.kill();
      try {
        await deadline(closed, 7500, "S7 fixture did not stop");
      } catch (err) {
        child.kill("SIGKILL");
        await deadline(closed, 3000, "S7 fixture could not be reaped");
        throw err;
      }
    },
  };
}

async function packArtifact(source, sandbox, report) {
  const packed = await npm(
    ["pack", "--ignore-scripts", "--json", "--pack-destination", sandbox],
    source,
  );
  const packs = JSON.parse(packed.stdout);
  assert.equal(packs.length, 1);
  const [pack] = packs;
  assert.equal(pack.name, "node-red-contrib-s7");
  const packMetadata = path.join(sandbox, "pack.json");
  fs.writeFileSync(packMetadata, packed.stdout);
  await run(
    process.execPath,
    ["tools/quality/check-package-files.cjs", packMetadata],
    source,
    10000,
  );
  const tarball = path.join(sandbox, path.basename(pack.filename));
  const integrity = "sha512-" + digest(tarball, "sha512", "base64");
  assert.equal(
    pack.integrity,
    integrity,
    "npm metadata must describe the actual bytes",
  );
  report.tarball = {
    name: pack.name,
    version: pack.version,
    filename: path.basename(tarball),
    bytes: fs.statSync(tarball).size,
    sha256: digest(tarball),
    integrity,
  };
  return tarball;
}

async function installArtifact(
  source,
  sandbox,
  tarball,
  artifact,
  mode,
  evidence,
) {
  const expected = readJson(path.join(source, "package-lock.json")).packages;
  const userDir = path.join(sandbox, mode);
  const manifest = { name: "s7-lab-user-dir", version: "0.0.0", private: true };
  if (mode === "locked") {
    // Reproduce the repository's transitive transport version in this userDir.
    manifest.overrides = {
      "iso-on-tcp": expected["node_modules/iso-on-tcp"].version,
    };
  }
  fs.mkdirSync(userDir);
  fs.writeFileSync(
    path.join(userDir, "package.json"),
    JSON.stringify(manifest),
  );
  await npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      "--fetch-retries=1",
      "--fetch-timeout=30000",
      tarball,
    ],
    userDir,
  );

  const installed = readJson(path.join(userDir, "package-lock.json")).packages;
  const wrapper = "node_modules/node-red-contrib-s7";
  assert.equal(
    installed[wrapper].integrity,
    artifact.integrity,
    "Installed artifact integrity",
  );
  assert.equal(installed[wrapper].version, artifact.version);
  assert.deepEqual(installed[wrapper].dependencies, expected[""].dependencies);
  const dependencies = Object.keys(expected).filter(Boolean);
  assert.deepEqual(
    Object.keys(installed)
      .filter((key) => key !== "" && key !== wrapper)
      .sort(),
    dependencies.sort(),
    "The consumer install must resolve the same production dependency tree",
  );
  evidence.dependencies = {};
  for (const key of dependencies) {
    const { version, resolved, integrity } = installed[key];
    assert.match(integrity, /^sha512-/);
    const name = key.slice("node_modules/".length);
    evidence.dependencies[name] = { version, resolved, integrity };
    if (mode === "locked" || name === "@st-one-io/nodes7") {
      for (const field of ["version", "resolved", "integrity"]) {
        assert.equal(
          installed[key][field],
          expected[key][field],
          key + " " + field,
        );
      }
    } else {
      assert.equal(new URL(resolved).origin, "https://registry.npmjs.org");
    }
  }
  const nodes7 = installed["node_modules/@st-one-io/nodes7"];
  const commit = nodes7.resolved.split("/").pop();
  assert.match(commit, /^[a-f0-9]{40}$/);
  evidence.nodes7Commit = commit;
  evidence.transportDiffersFromRepoLock =
    installed["node_modules/iso-on-tcp"].version !==
    expected["node_modules/iso-on-tcp"].version;
  return userDir;
}

async function exercise(userDir, sandbox, evidence) {
  const observations = path.join(userDir, "observations.json");
  const fixture = startFixture();
  try {
    const { port, version } = await fixture.ready;
    evidence.pythonSnap7 = version;
    const result = await run(
      process.execPath,
      [
        path.join(__dirname, "runtime.test.cjs"),
        userDir,
        String(port),
        observations,
        evidence.nodes7Commit,
      ],
      sandbox,
      90000,
    );
    process.stdout.write(result.stdout);
    evidence.observations = readJson(observations);
    assert.equal(evidence.observations.completed, true);
    evidence.runtimeExited = true;
  } finally {
    if (!evidence.observations && fs.existsSync(observations)) {
      evidence.observations = readJson(observations);
    }
    await fixture.stop();
  }
}

async function main() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "s7-runtime-lab-"));
  const report = {
    schemaVersion: 1,
    result: "failed",
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    hil: "PENDING_HARDWARE",
    installs: {},
  };
  let stage = "identify source";
  try {
    const commit = (
      await run("git", ["rev-parse", "HEAD"], root, 10000)
    ).stdout.trim();
    const status = await run("git", ["status", "--porcelain"], root, 10000);
    const hosted = process.env.GITHUB_ACTIONS === "true";
    const source = hosted ? await exportSource(commit, sandbox) : root;
    const toolLock = path.join(source, "test/runtime-lab/package-lock.json");
    assert.deepEqual(
      readJson(toolLock),
      readJson(path.join(__dirname, "package-lock.json")),
      "The installed test toolchain lock must match the packaging source",
    );
    report.source = {
      commit,
      packagingInput: hosted ? "git-archive" : "working-tree",
      dirty: !hosted && Boolean(status.stdout.trim()),
      checkoutDirty: Boolean(status.stdout.trim()),
      productionLockSha256: digest(path.join(source, "package-lock.json")),
      runtimeToolLockSha256: digest(toolLock),
    };
    report.npm = (await npm(["--version"], root)).stdout.trim();
    report.nodeRed = require("node-red/package.json").version;
    assert.equal(
      report.nodeRed,
      readJson(path.join(__dirname, "package.json")).devDependencies[
        "node-red"
      ],
    );

    stage = "pack artifact";
    const tarball = await packArtifact(source, sandbox, report);
    for (const mode of ["locked", "consumer"]) {
      const evidence = {};
      report.installs[mode] = evidence;
      stage = "install " + mode;
      const userDir = await installArtifact(
        source,
        sandbox,
        tarball,
        report.tarball,
        mode,
        evidence,
      );
      stage = "exercise " + mode + " runtime and await process exit";
      console.log("S7 runtime lab: " + mode + " install");
      await exercise(userDir, sandbox, evidence);
    }
    report.result = Object.values(report.installs).some(
      (install) =>
        install.observations.postRemoval.verdict === "known-failure-reproduced",
    )
      ? "characterized-with-known-failure"
      : "passed";
  } catch (error) {
    report.failedStage = stage;
    report.error = String(error.message).slice(0, 1200);
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    console.error(report.failedStage + ": " + report.error);
    process.exitCode = 1;
  } finally {
    try {
      fs.rmSync(sandbox, {
        recursive: true,
        force: true,
        maxRetries: 4,
        retryDelay: 100,
      });
    } catch (error) {
      report.result = "failed";
      report.cleanupError = String(error.message);
      console.error(error);
      process.exitCode = 1;
    } finally {
      fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
      fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2) + "\n");
      console.log("S7 runtime lab result: " + report.result);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
