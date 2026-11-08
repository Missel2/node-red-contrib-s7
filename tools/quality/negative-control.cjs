"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const prettier = require("./node_modules/prettier");

const root = path.resolve(__dirname, "../..");
const eslint = path.join(__dirname, "node_modules/eslint/bin/eslint.js");
const config = path.join(__dirname, "eslint.config.mjs");

function lint(source) {
  const result = spawnSync(
    process.execPath,
    [
      eslint,
      "--config",
      config,
      "--stdin",
      "--stdin-filename",
      "tools/quality/negative-fixture.cjs",
    ],
    { cwd: root, encoding: "utf8", input: source },
  );
  if (result.error) throw result.error;
  return result;
}

async function main() {
  const valid = lint('console.log("valid");\n');
  assert.equal(valid.status, 0, "valid source failed: " + valid.stdout + valid.stderr);

  const invalid = lint("console.log(undeclaredQualityGateSymbol);\n");
  assert.equal(invalid.status, 1, "an undefined symbol MUST fail ESLint");
  assert.match(invalid.stdout, /no-undef/, "expected the actual no-undef diagnostic");

  assert.equal(
    await prettier.check("const broken=1\n", { filepath: "fixture.js" }),
    false,
    "badly formatted source MUST fail Prettier",
  );
  assert.equal(
    await prettier.check("const clean = 1;\n", { filepath: "fixture.js" }),
    true,
    "properly formatted source MUST pass Prettier",
  );
  console.log("Quality negative controls: ESLint red/green and Prettier red/green confirmed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
