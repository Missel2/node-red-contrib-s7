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
  // The PR's explicitly reported protected-base SHA is authoritative. On
  // multi-parent development branches, merge-base against a moving local
  // origin/<branch> may select an older common ancestor and incorrectly
  // demand formatting of entirely unchanged historic protocol tests.
  let eventBase = null;
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(
      fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    if (event.pull_request?.base?.sha) {
      eventBase = event.pull_request.base.sha;
      if (!/^[0-9a-f]{40}$/.test(eventBase)) {
        throw new Error("Invalid immutable pull request base SHA");
      }
    }
  }
  const base =
    eventBase ||
    process.env.QUALITY_FORMAT_BASE ||
    (process.env.GITHUB_BASE_REF
      ? "origin/" + process.env.GITHUB_BASE_REF
      : "HEAD^");
  const mergeBase = git("rev-parse", base + "^{commit}");
  // Never silently fall back to an old ancestor if the base commit is absent.
  // A nonzero Git exit throws; with stdio:"ignore" success returns null.
  execFileSync("git", ["merge-base", "--is-ancestor", mergeBase, "HEAD"], {
    cwd: root,
    stdio: "ignore",
  });
  console.log("FORMAT_BASE_SHA=" + mergeBase);
  const raw = git(
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    mergeBase,
    "HEAD",
    "--",
  );
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
    const opts = { filepath: fullPath, endOfLine: "auto" };

    if (previous !== null && !(await prettier.check(previous, opts))) {
      debt++;
      console.log(
        "LEGACY_FORMAT_DEBT: " + file + " (existing unformatted file)",
      );
      continue;
    }
    checked++;
    if (!(await prettier.check(current, opts))) {
      failures.push(file);
      console.error("FORMAT_ERROR: " + file);
      if (file === "scripts/release/verify-preflight.cjs") {
        console.log("PREFLIGHT_FORMAT_BEGIN");
        console.log(await prettier.format(current, opts));
        console.log("PREFLIGHT_FORMAT_END");
      }
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
