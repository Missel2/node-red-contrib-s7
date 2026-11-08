"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const prettier = require("./node_modules/prettier");

const root = path.resolve(__dirname, "../..");
const checkExtensions = new Set([".js", ".cjs", ".mjs", ".json"]);
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function readOriginal(ref, file) {
  try {
    return execFileSync("git", ["show", ref + ":" + file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

async function main() {
  const base = process.env.GITHUB_BASE_REF
    ? "origin/" + process.env.GITHUB_BASE_REF
    : process.env.QUALITY_FORMAT_BASE || "HEAD^";
  const mergeBase = git("merge-base", "HEAD", base);
  const raw = git("diff", "--name-only", "--diff-filter=ACMR", mergeBase + "..HEAD");
  const files = raw
    .split("\n")
    .filter((file) => file && checkExtensions.has(path.extname(file)));
  let checked = 0;
  let debt = 0;
  const failures = [];

  for (const file of files) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const current = fs.readFileSync(fullPath, "utf8");
    const previous = readOriginal(mergeBase, file);
    const opts = { filepath: fullPath };

    if (previous !== null && !(await prettier.check(previous, opts))) {
      debt++;
      console.log("LEGACY_FORMAT_DEBT: " + file + " (existing unformatted file)");
      continue;
    }
    checked++;
    if (!(await prettier.check(current, opts))) {
      failures.push(file);
      console.error("FORMAT_ERROR: " + file);
    }
  }

  console.log(
    "Changed-file Prettier: " +
      checked +
      " enforced, " +
      debt +
      " legacy-debt exclusions, " +
      failures.length +
      " failures",
  );
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
