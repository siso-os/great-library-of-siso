#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const base = process.env.GLS_IMMUTABLE_BASE || "HEAD";
const immutableDirectories = ["registry/releases", "registry/snapshots", "registry/assemblies", "registry/decisions", "registry/events"];
const inventoryDirectory = "registry/source-inventories";

function git(args, allowFailure = false) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    console.error(result.stderr.trim() || `git ${args.join(" ")} failed`);
    process.exit(result.status || 1);
  }
  return result;
}

const inside = git(["rev-parse", "--is-inside-work-tree"], true);
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  console.log("PASS immutable history: source archive is not a Git checkout; registry schema checks remain active");
  process.exit(0);
}
const prefix = git(["rev-parse", "--show-prefix"]).stdout.trim();

if (git(["rev-parse", "--verify", `${base}^{commit}`], true).status !== 0) {
  console.error(`FAIL immutable history: comparison base ${base} does not resolve`);
  process.exit(1);
}

const diff = git([
  "diff", "--relative", "--name-status", "--find-renames", "--diff-filter=MRTD", base, "--",
  ...immutableDirectories, inventoryDirectory,
]).stdout.trim();

const violations = [];
for (const line of diff ? diff.split("\n") : []) {
  const fields = line.split("\t");
  const status = fields[0];
  const originalPath = fields[1];
  const currentPath = status.startsWith("R") ? fields[2] : originalPath;
  const protectedCore = immutableDirectories.some((directory) => originalPath.startsWith(`${directory}/`) || currentPath.startsWith(`${directory}/`));
  if (protectedCore) {
    violations.push(`${status}\t${originalPath}${currentPath !== originalPath ? ` -> ${currentPath}` : ""}`);
    continue;
  }

  let immutable = false;
  if (!status.startsWith("D")) {
    try {
      immutable = JSON.parse(await readFile(currentPath, "utf8")).immutable === true;
    } catch {
      // Registry validation reports malformed or missing current files.
    }
  }
  if (!immutable) {
    const previous = git(["show", `${base}:${prefix}${originalPath}`], true);
    if (previous.status === 0) {
      try { immutable = JSON.parse(previous.stdout).immutable === true; }
      catch { /* Registry validation reports malformed historical records. */ }
    }
  }
  if (immutable) violations.push(`${status}\t${originalPath}${currentPath !== originalPath ? ` -> ${currentPath}` : ""}`);
}

if (violations.length) {
  console.error(`FAIL immutable history: ${violations.length} accepted record${violations.length === 1 ? "" : "s"} modified, renamed, type-changed, or deleted relative to ${base}`);
  violations.forEach((violation) => console.error(`- ${violation}`));
  console.error("Add a successor Release, Snapshot, Assembly, or Source Inventory instead of rewriting history.");
  process.exit(1);
}

console.log(`PASS immutable history: no protected records changed relative to ${base}`);
