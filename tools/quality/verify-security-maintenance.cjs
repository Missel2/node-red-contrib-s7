"use strict";

// CI-only syntax and scope checks. GitHub performs the final Dependabot
// server-side validation after this file is merged to the default branch.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const prettier = require("./node_modules/prettier");

const configPath = path.resolve(__dirname, "../../.github/dependabot.yml");
const expected = [
  ["npm", "/"],
  ["npm", "/tools/quality"],
  ["github-actions", "/"],
];

function assertScopes(yaml) {
  const sections = yaml.split(/^  - package-ecosystem:\s*/m).slice(1);
  assert.equal(sections.length, 3, "Expected three independent Dependabot configurations");
  const actual = sections.map((section) => {
    const ecosystem = section.split("\n")[0].trim().replace(/^["']|["']$/g, "");
    const directory = section.match(/^    directory:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1];
    assert.ok(directory, "Missing manifest directory");
    assert.match(section, /^    schedule:\s*$/m);
    assert.match(section, /^      interval:\s*["']?weekly["']?\s*$/m);
    assert.match(section, /^      timezone:\s*["']?Europe\/Berlin["']?\s*$/m);
    assert.match(section, /^    open-pull-requests-limit:\s*5\s*$/m);
    assert.match(section, /^    groups:\s*$/m);
    assert.match(section, /^        patterns:\s*$/m);
    assert.match(section, /^          - ["']?\*["']?\s*$/m);
    assert.match(section, /^        update-types:\s*$/m);
    assert.match(section, /^          - ["']?minor["']?\s*$/m);
    assert.match(section, /^          - ["']?patch["']?\s*$/m);
    return [ecosystem, directory];
  });
  assert.deepEqual(actual, expected, "The quality-tool npm lock must be independent");
  assert.doesNotMatch(yaml, /^\s*(?:target-branch|insecure-external-code-execution):/m);
}

async function main() {
  const yaml = fs.readFileSync(configPath, "utf8");
  await prettier.format(yaml, { parser: "yaml" });
  assertScopes(yaml);
  assert.throws(
    () => assertScopes(yaml.replace('directory: "/tools/quality"', 'directory: "/missing-ci-tools"')),
    /independent/,
  );
  await assert.rejects(prettier.format("version: [\n", { parser: "yaml" }));
  const security = fs.readFileSync(path.resolve(__dirname, "../../SECURITY.md"), "utf8");
  assert.match(security, /cannot verify that private reporting is enabled/i);
  assert.match(security, /never test vulnerabilities against a production PLC/i);
  console.log("SECURITY_CONFIG_PASS: valid YAML, independent scopes, policy negative controls");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
