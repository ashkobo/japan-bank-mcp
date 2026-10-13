// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// data.js
// ---------------------------------------------------------------------------
// Loads the files in data/ (built by scripts/build-data.js) on first use.
// About 30k rows; parsing takes a fraction of a second.

import { readFileSync } from "node:fs";

const DATA = new URL("../data/", import.meta.url);

let cache;

// PUBLIC
// ---------------------------------------------------------------------------

/**
 * { asOf, banks: bank[], byCode: Map<code, bank> }, each bank with its branches[].
 */
export function data() {
  cache ??= load();
  return cache;
}

// PRIVATE
// ---------------------------------------------------------------------------

function load() {
  const { asOf } = JSON.parse(readFileSync(new URL("meta.json", DATA), "utf8"));

  const banks = rows("banks.tsv").map(([code, name, kana, roma]) => ({
    code,
    name,
    kana,
    roma,
    branches: [],
  }));
  const byCode = new Map(banks.map((b) => [b.code, b]));
  for (const [bankCode, code, name, kana, roma] of rows("branches.tsv")) {
    byCode.get(bankCode).branches.push({ code, name, kana, roma });
  }
  return { asOf, banks, byCode };
}

function rows(name) {
  const text = readFileSync(new URL(name, DATA), "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"));
}
