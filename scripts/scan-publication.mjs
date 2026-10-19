#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv.slice(2);
const targets = requested.length ? requested : ["."];
// These independently checked sibling repositories are outside the catalog
// publication surface, as declared by the catalog root .gitignore.
const siblingRepositories = new Set(["knowledge", "people-graph", "foundry", "banks", "works"]);
const findings = [];
const scanned = [];
const rules = [
  ["private-key", /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/],
  ["github-token", /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}/],
  ["api-key", /\bsk-[A-Za-z0-9_-]{16,}/],
  ["aws-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["machine-path", /(?:\/Users\/[^\s\"'<>]+|\/home\/[^\s\"'<>]+|[A-Za-z]:\\Users\\[^\s\"'<>]+)/],
  ["file-uri", /file:\/\/[^\s\"'<>]+/],
  ["local-socket", new RegExp("(?:\\.so" + "ck\\b|unix:\\/\\/)")]
];

async function walk(target) {
  let entries;
  try { entries = await readdir(target, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    if ([".git", ".local", ".claude", "node_modules"].includes(entry.name)) continue;
    if (path.resolve(target) === root && siblingRepositories.has(entry.name)) continue;
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.isFile()) await scan(child);
  }
}

async function scan(file) {
  const buffer = await readFile(file);
  if (buffer.includes(0)) return;
  scanned.push(file);
  const lines = buffer.toString("utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [rule, pattern] of rules) if (pattern.test(line)) findings.push(`${path.relative(root, file)}:${index + 1} [${rule}]`);
  });
}

for (const target of targets) await walk(path.resolve(root, target));
if (findings.length) {
  console.error(`FAIL publication scan (${findings.length} finding${findings.length === 1 ? "" : "s"})`);
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`PASS publication scan: ${scanned.length} text files across ${targets.join(", ")}`);
