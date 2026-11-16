"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  inspectEnvironment,
  inspectPackage,
  inspectMaster,
  inspectRuleset,
  inspectCheckRuns,
  requiredForRelease,
} = require("../../scripts/release/manual-alpha2-release-guard.cjs");

const SHA = "a".repeat(40);
const REPO = "Missel2/node-red-contrib-s7";
const workflow =
  REPO + "/.github/workflows/npm-publish-alpha2-manual.yml@refs/heads/master";
const required = [
  "Wrapper contract (ubuntu-24.04, Node 22)",
  "Analyze (actions)",
];
function env() {
  return {
    GITHUB_REPOSITORY: REPO,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/master",
    GITHUB_WORKFLOW_REF: workflow,
    RELEASE_OPERATION: "verify",
    GITHUB_SHA: SHA,
  };
}
function samplePackage() {
  const pkg = {
    name: "@missel2/node-red-contrib-s7",
    version: "0.1.0-alpha.2",
    license: "GPL-3.0-or-later",
    publishConfig: { tag: "alpha", access: "public" },
    dependencies: { "@st-one-io/nodes7": "npm:@missel2/nodes7@0.1.0-alpha.2" },
  };
  const lock = {
    name: pkg.name,
    version: pkg.version,
    packages: {
      "": { version: pkg.version },
      "node_modules/@st-one-io/nodes7": { version: "0.1.0-alpha.2" },
      "node_modules/iso-on-tcp": { version: "0.1.0" },
    },
  };
  return { pkg, lock };
}
function sampleRuleset() {
  return {
    id: 26751662,
    enforcement: "active",
    bypass_actors: [],
    rules: [
      {
        type: "pull_request",
        parameters: { allowed_merge_methods: ["squash"] },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [
            "Wrapper contract (ubuntu-24.04, Node 22)",
            "Wrapper contract (ubuntu-24.04, Node 24)",
            "Wrapper contract (windows-2025, Node 22)",
            "Wrapper contract (windows-2025, Node 24)",
            "Baseline must fail stale-read regression",
            "Package dependency smoke (Ubuntu, Node 22)",
            "Analyze (javascript-typescript)",
            "Analyze (python)",
            "Analyze (actions)",
          ].map((context) => ({ context })),
        },
      },
    ],
  };
}
function sampleChecks() {
  return {
    total_count: 2,
    check_runs: required.map((name) => ({
      name,
      head_sha: SHA,
      app: { id: 15368 },
      status: "completed",
      conclusion: "success",
      started_at: "2026-11-16T08:00:00Z",
    })),
  };
}
test("manual dispatch admits only exact protected master and selected operation", () => {
  inspectEnvironment(env(), SHA);
  inspectEnvironment({ ...env(), RELEASE_OPERATION: "publish" }, SHA);
  for (const [key, value] of [
    ["GITHUB_REF", "refs/heads/dev"],
    ["GITHUB_EVENT_NAME", "push"],
    ["GITHUB_REPOSITORY", "other/repo"],
    ["GITHUB_WORKFLOW_REF", "other/workflow"],
    ["RELEASE_OPERATION", "stage"],
    ["GITHUB_SHA", "not-a-sha"],
  ]) {
    assert.throws(() => inspectEnvironment({ ...env(), [key]: value }, SHA));
  }
  assert.throws(() => inspectEnvironment(env(), "b".repeat(40)));
});
test("only distinct source prerelease and immutable alias are admissible", () => {
  const { pkg, lock } = samplePackage();
  inspectPackage(pkg, lock);
  assert.throws(() =>
    inspectPackage({ ...pkg, version: "0.1.0-alpha.1" }, lock),
  );
  assert.throws(() =>
    inspectPackage(
      { ...pkg, publishConfig: { tag: "latest", access: "public" } },
      lock,
    ),
  );
  assert.throws(() =>
    inspectPackage(
      {
        ...pkg,
        dependencies: {
          "@st-one-io/nodes7": "npm:@missel2/nodes7@0.1.0-alpha.1",
        },
      },
      lock,
    ),
  );
  assert.throws(() =>
    inspectPackage(pkg, { ...lock, version: "0.1.0-alpha.1" }),
  );
});
test("source must remain on the protected exact commit", () => {
  inspectMaster({ name: "master", protected: true, commit: { sha: SHA } }, SHA);
  assert.throws(() =>
    inspectMaster(
      { name: "master", protected: false, commit: { sha: SHA } },
      SHA,
    ),
  );
  assert.throws(() =>
    inspectMaster(
      { name: "master", protected: true, commit: { sha: "b".repeat(40) } },
      SHA,
    ),
  );
});
test("strict active ruleset and every required check remain mandatory", () => {
  const rule = sampleRuleset();
  const contexts = inspectRuleset(rule);
  assert.equal(contexts.length, 9);
  assert.throws(() => inspectRuleset({ ...rule, enforcement: "disabled" }));
  assert.throws(() =>
    inspectRuleset({ ...rule, bypass_actors: [{ actor_id: 1 }] }),
  );
  assert.throws(() =>
    inspectRuleset({
      ...rule,
      rules: rule.rules.filter((r) => r.type !== "required_status_checks"),
    }),
  );
});
test("missing, failed, pending, stale or foreign-app checks stop publication", () => {
  inspectCheckRuns(sampleChecks(), required, SHA);
  const cases = [
    {
      ...sampleChecks(),
      check_runs: sampleChecks().check_runs.slice(1),
      total_count: 1,
    },
    {
      ...sampleChecks(),
      check_runs: sampleChecks().check_runs.map((c) => ({
        ...c,
        conclusion: "failure",
      })),
    },
    {
      ...sampleChecks(),
      check_runs: sampleChecks().check_runs.map((c) => ({
        ...c,
        status: "in_progress",
      })),
    },
    {
      ...sampleChecks(),
      check_runs: sampleChecks().check_runs.map((c) => ({
        ...c,
        head_sha: "b".repeat(40),
      })),
    },
    {
      ...sampleChecks(),
      check_runs: sampleChecks().check_runs.map((c) => ({
        ...c,
        app: { id: 999 },
      })),
    },
    { ...sampleChecks(), total_count: 101 },
  ];
  for (const item of cases)
    assert.throws(() => inspectCheckRuns(item, required, SHA));
});

test("public release additionally requires runtime, protocol and archive evidence", () => {
  const checks = requiredForRelease(["Analyze (actions)"]);
  for (const name of [
    "Installed Node-RED runtime (windows-2025, Node 24)",
    "Installed Node-RED runtime (ubuntu-24.04, Node 22)",
    "S7 wire tests (windows-2025, Node 22)",
    "Compare immutable alpha2 archive bytes (Ubuntu vs Windows)",
    "Manual alpha2 admission negative controls (Ubuntu, Node 22)",
  ]) {
    assert.ok(checks.includes(name), "Missing release gate: " + name);
  }
  assert.throws(() => inspectCheckRuns(sampleChecks(), checks, SHA));
});
