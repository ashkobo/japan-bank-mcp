// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// check-data.js
// ---------------------------------------------------------------------------

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const directory = new URL("../data/", import.meta.url);
const meta = JSON.parse(await readFile(new URL("meta.json", directory), "utf8"));
assert.match(meta.asOf, /^\d{4}-\d{2}-\d{2}$/, "Data needs an ISO source date.");
assert.equal(new Date(`${meta.asOf}T00:00:00Z`).toISOString().slice(0, 10), meta.asOf);
const banks = await rows("banks.tsv", 4);
const branches = await rows("branches.tsv", 5);
assert.ok(
  banks.length > 1000 && branches.length > 20000,
  "Unexpectedly small dataset: investigate upstream before releasing.",
);
const codes = new Set(banks.map((row) => row[0]));
assert.equal(codes.size, banks.length, "Duplicate bank codes.");
for (const bank of banks) assert.match(bank[0], /^\d{4}$/);
const pairs = new Set();
for (const branch of branches) {
  assert.ok(codes.has(branch[0]), "Unknown bank reference.");
  assert.match(branch[1], /^\d{3}$/, "Branch codes must retain leading zeros.");
  const pair = branch[0] + branch[1];
  assert.ok(!pairs.has(pair), "Duplicate bank/branch code.");
  pairs.add(pair);
}
assert.match(await readFile(new URL("LICENSE-zengin-code.txt", directory), "utf8"), /MIT License/);
const report = { dataAsOf: meta.asOf, banks: banks.length, branches: branches.length };
if (process.argv.includes("--remote")) {
  const response = await fetch("https://registry.npmjs.org/zengin-code/latest", {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}.`);
  const upstream = await response.json();
  const match = /-p(\d{4})(\d{2})(\d{2})$/.exec(upstream.version);
  if (!match) throw new Error("Cannot read the upstream version date; review its format.");
  const latest = match.slice(1).join("-");
  report.upstreamAsOf = latest;
  console.log(JSON.stringify(report));
  if (latest !== meta.asOf)
    throw new Error("Data update needed. Follow MAINTENANCE.md before release.");
} else {
  console.log(JSON.stringify(report));
}

async function rows(name, columns) {
  const text = await readFile(new URL(name, directory), "utf8");
  const result = text
    .replace(/\r?\n$/, "")
    .split("\n")
    .map((line) => line.split("\t"));
  assert.ok(
    result.every((row) => row.length === columns),
    `${name}: unexpected column count.`,
  );
  return result;
}
