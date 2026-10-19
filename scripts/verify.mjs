import { spawnSync } from "node:child_process";

const checks = [
  ["immutable history", "scripts/check-immutable-history.mjs"],
  ["gls registration contract", "tests/gls.test.mjs"],
  ["gls read and task-entry contract", "tests/gls-read.test.mjs"],
  ["promotion contract tests", "tests/promotion-contract.test.mjs"],
  ["intelligence contract tests", "tests/intelligence-contract.test.mjs"],
  ["laptop estate contract tests", "tests/laptop-estate.test.mjs"],
  ["private overlay contract tests", "tests/laptop-estate-private-overlay.test.mjs"],
  ["private estate status tests", "tests/estate-status.test.mjs"],
  ["research question contract tests", "tests/research-contract.test.mjs"],
  ["God Questions infrastructure contract tests", "tests/god-questions-infrastructure.test.mjs"],
  ["UI integration diagnostic contracts", "tests/ui-integration-audit.test.mjs"],
  ["Frontier operating kit contracts", "tests/frontier.test.mjs"],
  ["registry validation", "scripts/validate.mjs"],
  ["site build", "scripts/build.mjs"],
  ["reading surface contract", "tests/reading-surface.test.mjs"],
  ["Foundry industry and value readers", "tests/industries.test.mjs"],
  ["site links and identity", "scripts/check-site.mjs"],
  ["publication safety scan", "scripts/scan-publication.mjs"]
];

for (const [label, script] of checks) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("\nAll Great Library checks passed.");
