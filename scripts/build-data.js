#!/usr/bin/env node
// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// build-data.js
// ---------------------------------------------------------------------------
// Writes the compact files in data/ from the zengin-code npm package (MIT,
// github.com/zengin-code), which republishes the 全銀協 bank and branch codes.
// zengin-code is a dev dependency only: update it, then run `npm run data`.
//
//   banks.tsv     code  name  kana  roma
//   branches.tsv  bankCode  code  name  kana  roma
//   meta.json     asOf (date in the package version, 1.0.0-p20260824 -> 2026-08-24)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DATA = new URL("../data/", import.meta.url);

// MAIN
// ---------------------------------------------------------------------------

const banks = require("zengin-code");
const { version } = JSON.parse(readFileSync(require.resolve("zengin-code/package.json"), "utf8"));
const date = /-p(\d{4})(\d{2})(\d{2})$/.exec(version);
if (!date) throw new Error(`Cannot read the data date from zengin-code ${version}.`);
const asOf = date.slice(1).join("-");

const bankRows = [];
const branchRows = [];
for (const bank of Object.values(banks).sort(byCode)) {
  bankRows.push([bank.code, bank.name, bank.kana, bank.roma].map(clean));
  for (const branch of Object.values(bank.branches).sort(byCode)) {
    branchRows.push([bank.code, branch.code, branch.name, branch.kana, branch.roma].map(clean));
  }
}

mkdirSync(DATA, { recursive: true });
writeTsv("banks.tsv", bankRows);
writeTsv("branches.tsv", branchRows);
writeFileSync(
  new URL("meta.json", DATA),
  `${JSON.stringify({ asOf, source: `zengin-code ${version} (MIT)` }, null, 2)}\n`,
);
console.log(`asOf ${asOf}: ${bankRows.length} banks, ${branchRows.length} branches`);

// PRIVATE
// ---------------------------------------------------------------------------

function byCode(a, b) {
  return a.code.localeCompare(b.code);
}

// Tabs and newlines would break the TSV; none are expected, so fail loudly.
function clean(value) {
  const text = String(value ?? "").trim();
  if (/[\t\n\r]/.test(text)) throw new Error(`Unexpected tab or newline in "${text}".`);
  return text;
}

function writeTsv(name, rows) {
  const text = rows.map((r) => r.join("\t")).join("\n");
  writeFileSync(new URL(name, DATA), `${text}\n`);
}
