"use strict";

// CI-only syntax and scope checks. GitHub validates server-side after merge.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const prettier = require("./node_modules/prettier");

const root = path.resolve(__dirname, "../..");
const configPath = path.join(root, ".github/dependabot.yml");
const expected = [
  ["npm", "/", "07:00"],
  ["npm", "/tools/quality", "07:30"],
  ["github-actions", "/", "07:15"],
  ["npm", "/test/runtime-lab", "07:45"],
];

function assertScopes(yaml) {
  const sections = yaml.split(/^  - package-ecosystem:\s*/m).slice(1);
  assert.equal(
    sections.length,
    expected.length,
    "Expected four independent Dependabot configurations",
  );
  const actual = sections.map((section, index) => {
    const ecosystem = section
      .split("\n")[0]
      .trim()
      .replace(/^["']|["']$/g, "");
    const directory = section.match(/^    directory: "([^"]+)"$/m)?.[1];
    assert.ok(directory, "Missing manifest directory");
    assert.match(section, /^    schedule:\s*$/m);
    assert.match(section, /^      interval:\s*["']?weekly["']?\s*$/m);
    assert.match(section, /^      day:\s*["']?monday["']?\s*$/m);
    assert.match(section, /^      timezone:\s*["']?Europe\/Berlin["']?\s*$/m);
    const time = section.match(/^      time: "([0-9]{2}:[0-9]{2})"\s*$/m)?.[1];
    assert.equal(
      time,
      expected[index][2],
      "Weekly update windows must remain independent",
    );
    assert.match(section, /^    open-pull-requests-limit:\s*5\s*$/m);
    assert.match(section, /^    groups:\s*$/m);
    assert.match(section, /^        patterns:\s*$/m);
    assert.match(section, /^          - ["']?\*["']?\s*$/m);
    assert.match(section, /^        update-types:\s*$/m);
    assert.match(section, /^          - ["']?minor["']?\s*$/m);
    assert.match(section, /^          - ["']?patch["']?\s*$/m);
    if (ecosystem === "npm") {
      const manifestDir = path.join(root, directory.slice(1));
      for (const name of ["package.json", "package-lock.json"]) {
        assert.ok(
          fs.existsSync(path.join(manifestDir, name)),
          "Missing locked npm manifest: " + directory + "/" + name,
        );
      }
    }
    return [ecosystem, directory];
  });
  assert.deepEqual(
    actual,
    expected.map(([ecosystem, directory]) => [ecosystem, directory]),
    "Dependabot directories and ecosystems must remain independent",
  );
  assert.doesNotMatch(
    yaml,
    /^\s*(?:target-branch|insecure-external-code-execution):/m,
  );
}

async function main() {
  const yaml = fs.readFileSync(configPath, "utf8");
  await prettier.format(yaml, { parser: "yaml" });
  assertScopes(yaml);

  // The negative controls must fail for a missing manifest, missing update
  // scope, duplicate scope, wrong schedule, or malformed YAML.
  const invalidQuality = yaml.replace(
    'directory: "/tools/quality"',
    'directory: "/missing-ci-tools"',
  );
  assert.throws(
    () => assertScopes(invalidQuality),
    /Missing locked npm manifest/,
  );
  const invalidLab = yaml.replace(
    'directory: "/test/runtime-lab"',
    'directory: "/missing-runtime-lab"',
  );
  assert.throws(() => assertScopes(invalidLab), /Missing locked npm manifest/);
  const labHeading = "  # Isolated installed Node-RED software test lab";
  assert.ok(yaml.includes(labHeading), "Missing lab scope comment anchor");
  const missingLab = yaml.slice(0, yaml.indexOf(labHeading));
  assert.throws(() => assertScopes(missingLab), /four independent/);
  const duplicateLab = yaml + yaml.slice(yaml.indexOf(labHeading));
  assert.throws(() => assertScopes(duplicateLab), /four independent/);
  const alteredWindow = yaml.replace('time: "07:45"', 'time: "07:30"');
  assert.throws(() => assertScopes(alteredWindow), /Weekly update windows/);
  await assert.rejects(prettier.format("version: [\n", { parser: "yaml" }));

  const security = fs.readFileSync(path.join(root, "SECURITY.md"), "utf8");
  assert.match(security, /cannot verify that private reporting is enabled/i);
  assert.match(
    security,
    /never test vulnerabilities against a production PLC/i,
  );
  console.log(
    "SECURITY_CONFIG_PASS: four scopes, locked manifests, negative controls",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
