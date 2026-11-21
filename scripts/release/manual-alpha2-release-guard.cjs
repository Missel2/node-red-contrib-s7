"use strict";

// Fail-closed, read-only admission for the human-dispatched Contrib alpha.2 release.
// GitHub API reads use the job's short-lived GITHUB_TOKEN; no npm token is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = "Missel2/node-red-contrib-s7";
const VERSION = "0.1.0-alpha.2";
const RULESET_ID = 26751662;
const WORKFLOW_REF =
  REPO + "/.github/workflows/npm-publish-alpha2-manual.yml@refs/heads/master";
const BASE_REQUIRED = [
  "Wrapper contract (ubuntu-24.04, Node 22)",
  "Wrapper contract (ubuntu-24.04, Node 24)",
  "Wrapper contract (windows-2025, Node 22)",
  "Wrapper contract (windows-2025, Node 24)",
  "Baseline must fail stale-read regression",
  "Package dependency smoke (Ubuntu, Node 22)",
  "Analyze (javascript-typescript)",
  "Analyze (python)",
  "Analyze (actions)",
];
const RELEASE_REQUIRED = [
  "Alpha archive, SBOM and license preflight",
  "Canonical Contrib alpha2 archive (ubuntu-24.04, Node 22)",
  "Canonical Contrib alpha2 archive (windows-2025, Node 22)",
  "Compare immutable alpha2 archive bytes (Ubuntu vs Windows)",
  "Installed Node-RED runtime (ubuntu-24.04, Node 22)",
  "Installed Node-RED runtime (ubuntu-24.04, Node 24)",
  "Installed Node-RED runtime (windows-2025, Node 22)",
  "Installed Node-RED runtime (windows-2025, Node 24)",
  "NPM lockfile (ubuntu-24.04, Node 22)",
  "NPM lockfile (windows-2025, Node 22)",
  "Pinned nodes7 integration (ubuntu-24.04, Node 22)",
  "Pinned nodes7 integration (windows-2025, Node 22)",
  "Public npm consumer (ubuntu-24.04, Node 22)",
  "Public npm consumer (windows-2025, Node 22)",
  "Published nodes7 alpha2 artifact (ubuntu-24.04, Node 22)",
  "Published nodes7 alpha2 artifact (windows-2025, Node 22)",
  "S7 wire tests (ubuntu-24.04, Node 22)",
  "S7 wire tests (windows-2025, Node 22)",
  "Static quality (ubuntu-24.04, Node 22)",
  "Static quality (windows-2025, Node 22)",
  "Manual alpha2 admission negative controls (Ubuntu, Node 22)",
];
const root = path.resolve(__dirname, "../..");

function requiredForRelease(required) {
  return [...new Set([...required, ...RELEASE_REQUIRED])];
}
function inspectEnvironment(env, checkedOutSha) {
  assert.equal(env.GITHUB_REPOSITORY, REPO, "Wrong publishing repository");
  assert.equal(
    env.GITHUB_EVENT_NAME,
    "workflow_dispatch",
    "Not a manual dispatch",
  );
  assert.equal(env.GITHUB_REF, "refs/heads/master", "Not protected master");
  assert.equal(env.GITHUB_WORKFLOW_REF, WORKFLOW_REF, "Unexpected workflow");
  assert.ok(
    ["verify", "publish"].includes(env.RELEASE_OPERATION),
    "Unknown release operation",
  );
  assert.match(
    env.GITHUB_SHA || "",
    /^[a-f0-9]{40}$/,
    "Missing exact source SHA",
  );
  assert.equal(
    checkedOutSha,
    env.GITHUB_SHA,
    "Checkout did not match dispatch SHA",
  );
}
function inspectPackage(pkg, lock) {
  assert.equal(pkg.name, "@missel2/node-red-contrib-s7");
  assert.equal(pkg.version, VERSION);
  assert.equal(pkg.publishConfig?.tag, "alpha");
  assert.equal(pkg.publishConfig?.access, "public");
  assert.equal(pkg.license, "GPL-3.0-or-later");
  assert.equal(
    pkg.dependencies?.["@st-one-io/nodes7"],
    "npm:@missel2/nodes7@0.1.0-alpha.2",
  );
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages?.[""]?.version, pkg.version);
  assert.equal(
    lock.packages?.["node_modules/@st-one-io/nodes7"]?.version,
    "0.1.0-alpha.2",
  );
  assert.equal(lock.packages?.["node_modules/iso-on-tcp"]?.version, "0.1.0");
}
function inspectMaster(branch, sha) {
  assert.equal(branch.name, "master");
  assert.equal(branch.protected, true, "Master is not protected");
  assert.equal(branch.commit?.sha, sha, "Master moved after dispatch");
}
function inspectRuleset(ruleset) {
  assert.equal(ruleset.id, RULESET_ID);
  assert.equal(ruleset.enforcement, "active", "Master ruleset is inactive");
  assert.deepEqual(ruleset.bypass_actors, [], "Unexpected ruleset bypass");
  const pull = ruleset.rules?.find((r) => r.type === "pull_request");
  assert.ok(
    pull?.parameters?.allowed_merge_methods?.includes("squash"),
    "Squash policy missing",
  );
  const required = ruleset.rules?.find(
    (r) => r.type === "required_status_checks",
  );
  assert.equal(
    required?.parameters?.strict_required_status_checks_policy,
    true,
  );
  const contexts = required.parameters.required_status_checks.map(
    (c) => c.context,
  );
  for (const name of BASE_REQUIRED)
    assert.ok(contexts.includes(name), "Missing protected check " + name);
  return contexts;
}
function inspectCheckRuns(payload, required, sha) {
  assert.ok(Array.isArray(payload.check_runs), "No GitHub check-runs");
  assert.ok(
    payload.total_count <= payload.check_runs.length,
    "Check pagination not handled",
  );
  for (const name of required) {
    const matches = payload.check_runs.filter(
      (c) => c.name === name && c.head_sha === sha && c.app?.id === 15368,
    );
    assert.ok(
      matches.length,
      "Required check missing on exact master: " + name,
    );
    matches.sort(
      (a, b) =>
        Date.parse(b.started_at || b.created_at || 0) -
        Date.parse(a.started_at || a.created_at || 0),
    );
    assert.equal(
      matches[0].status,
      "completed",
      "Required check incomplete: " + name,
    );
    assert.equal(
      matches[0].conclusion,
      "success",
      "Required check failed: " + name,
    );
  }
}
async function readGithub(subpath, token) {
  assert.ok(token, "Missing GitHub read token");
  const url = "https://api.github.com/repos/" + REPO + subpath;
  const response = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "contrib-alpha2-manual-release-guard",
    },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    200,
    "GitHub source/CI check unavailable: " + subpath,
  );
  const body = await response.text();
  assert.ok(
    body.length < 3 * 1024 * 1024,
    "Unexpected GitHub API response size",
  );
  return JSON.parse(body);
}
async function main() {
  const env = process.env;
  const actualSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
  }).trim();
  inspectEnvironment(env, actualSha);
  inspectPackage(
    JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
    JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")),
  );
  const master = await readGithub("/branches/master", env.GITHUB_TOKEN);
  inspectMaster(master, env.GITHUB_SHA);
  const ruleset = await readGithub("/rulesets/" + RULESET_ID, env.GITHUB_TOKEN);
  const required = inspectRuleset(ruleset);
  const checks = await readGithub(
    "/commits/" + env.GITHUB_SHA + "/check-runs?per_page=100",
    env.GITHUB_TOKEN,
  );
  inspectCheckRuns(checks, requiredForRelease(required), env.GITHUB_SHA);
  console.log(
    "CONTRIB_ALPHA2_PROTECTED_MASTER_AND_CI_VERIFIED=" + env.GITHUB_SHA,
  );
  console.log("CONTRIB_ALPHA2_RELEASE_OPERATION=" + env.RELEASE_OPERATION);
}
if (require.main === module)
  main().catch((error) => {
    console.error("CONTRIB_ALPHA2_MANUAL_RELEASE_GUARD_FAIL: " + error.message);
    process.exitCode = 1;
  });
module.exports = {
  inspectEnvironment,
  inspectPackage,
  inspectMaster,
  inspectRuleset,
  inspectCheckRuns,
  requiredForRelease,
};
