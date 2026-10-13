// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// bank.test.js
// ---------------------------------------------------------------------------

import assert from "node:assert/strict";
import { test } from "node:test";
import { data } from "../src/data.js";
import { findBranches, searchBanks } from "../src/index.js";

const bank = (query) => searchBanks(query).results.map((b) => b.code);
const branch = (b, query) => findBranches(b, query).results.map((r) => `${r.code} ${r.name}`);

test("well-known bank codes", () => {
  assert.deepEqual(bank("0001"), ["0001"]);
  assert.equal(searchBanks("0001").results[0].name, "みずほ");
  assert.equal(searchBanks("0005").results[0].name, "三菱ＵＦＪ");
  assert.equal(searchBanks("0009").results[0].name, "三井住友");
  assert.equal(searchBanks("9900").results[0].name, "ゆうちょ");
  // From the banks' own 全銀 file format guides
  assert.equal(searchBanks("0038").results[0].name, "ドコモＳＭＴＢネット");
  assert.equal(searchBanks("0164").results[0].name, "但馬");
  assert.equal(searchBanks("0140").results[0].name, "第四北越");
});

test("bank names as people write them", () => {
  for (const q of ["みずほ銀行", "みずほ", "ミズホ", "ﾐｽﾞﾎ", "mizuho"])
    assert.deepEqual(bank(q), ["0001"], q);
  for (const q of ["三菱UFJ銀行", "三菱ＵＦＪ", "MUFG", "みつびしゆーえふじぇい"]) {
    assert.deepEqual(bank(q), ["0005"], q);
  }
  for (const q of ["ゆうちょ銀行", "ゆうちょ", "ユウチョ", "郵便局"])
    assert.deepEqual(bank(q), ["9900"], q);
  assert.deepEqual(bank("三井住友銀行"), ["0009"]);
  assert.deepEqual(bank("住信SBIネット銀行"), ["0038"]);
});

test("信用金庫, 信用組合, 農協 and JA", () => {
  assert.deepEqual(bank("城南信用金庫"), ["1344"]);
  assert.deepEqual(bank("じょうなんしんきん"), ["1344"]);
  assert.deepEqual(bank("北央信用組合"), ["2011"]);
  assert.deepEqual(bank("横浜農業協同組合"), ["5114"]);
  assert.deepEqual(bank("JA横浜"), ["5114"]);
});

test("match tiers, unknown and bad input", () => {
  assert.equal(searchBanks("5").match, "code");
  assert.equal(searchBanks("三井住友").match, "exact");
  assert.equal(searchBanks("三井住友銀行").match, "base");
  const partial = searchBanks("住友");
  assert.ok(["prefix", "partial"].includes(partial.match));
  assert.ok(partial.results.some((b) => b.code === "0009"));
  assert.equal(searchBanks("xyz").match, "none");
  assert.equal(searchBanks("1234").match, "none");
  assert.throws(() => searchBanks(" "), /Give a bank/);
});

test("well-known branch codes", () => {
  assert.deepEqual(branch("みずほ", "001"), ["001 東京営業部"]);
  assert.deepEqual(branch("三菱UFJ銀行", "本店"), ["001 本店"]);
  assert.deepEqual(branch("0038", "106"), ["106 法人第一"]);
  assert.deepEqual(branch("第四北越銀行", "本店"), ["200 本店営業部"]);
  assert.deepEqual(branch("ゆうちょ", "〇一八"), ["018 〇一八"]);
});

test("branch names as people write them", () => {
  assert.deepEqual(branch("みずほ", "東京"), ["001 東京営業部"]);
  assert.deepEqual(branch("みずほ", "東京営業部"), ["001 東京営業部"]);
  assert.deepEqual(branch("0038", "法人第一支店"), ["106 法人第一"]);
  assert.deepEqual(branch("0038", "ほうじんだいいち"), ["106 法人第一"]);
  assert.deepEqual(branch("ゆうちょ", "〇一八店"), ["018 〇一八"]);
  assert.deepEqual(branch("ゆうちょ", "ゼロイチハチ"), ["018 〇一八"]);
  assert.deepEqual(branch("ゆうちょ", "18"), ["018 〇一八"]);
});

test("branch list, unknown branch and ambiguous bank", () => {
  const all = findBranches("0001", undefined, { limit: 1000 });
  assert.equal(all.match, "all");
  assert.equal(all.total, all.results.length);
  assert.ok(all.total > 100);
  assert.equal(findBranches("0001", "xyz").match, "none");
  assert.throws(() => findBranches("住友", "本店"), /matches \d+ banks/);
  assert.throws(() => findBranches("xyz", "本店"), /No bank/);
});

// Every bank and branch of the data must be found again by its own name and code.
test("every bank is found by its name and code", () => {
  const missed = [];
  for (const b of data().banks) {
    if (!bank(b.code).includes(b.code)) missed.push(`${b.code} by code`);
    const byName = searchBanks(b.name, { limit: 1000 }).results.map((r) => r.code);
    if (!byName.includes(b.code)) missed.push(`${b.code} ${b.name}`);
  }
  assert.deepEqual(missed, []);
});

test("every branch is found by its name and code", () => {
  const missed = [];
  for (const b of data().banks) {
    for (const br of b.branches) {
      const byCode = findBranches(b.code, br.code).results.map((r) => r.code);
      if (!byCode.includes(br.code)) missed.push(`${b.code}-${br.code} by code`);
      const byName = findBranches(b.code, br.name, { limit: 1000 }).results.map((r) => r.code);
      if (!byName.includes(br.code)) missed.push(`${b.code}-${br.code} ${br.name}`);
    }
  }
  assert.deepEqual(missed, []);
});
