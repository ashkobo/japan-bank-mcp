// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// yucho.test.js
// ---------------------------------------------------------------------------
// The four examples are the ones on Japan Post Bank's page
// 「記号･番号から振込用の店名・預金種目・口座番号への変換の公式」.

import assert from "node:assert/strict";
import { test } from "node:test";
import { data } from "../src/data.js";
import { yuchoToBank } from "../src/index.js";

const pick = (r) => [r.branchCode, r.branchName, r.branchKana, r.accountType, r.accountNumber];

test("総合口座, 番号 8 digits", () => {
  const r = yuchoToBank("11940", "12345671");
  assert.deepEqual(pick(r), ["198", "一九八店", "イチキユウハチ", "普通", "1234567"]);
  assert.equal(r.bankCode, "9900");
});

test("総合口座, 番号 7 digits or fewer", () => {
  const r = yuchoToBank("11940", "1234561");
  assert.deepEqual(pick(r), ["198", "一九八店", "イチキユウハチ", "普通", "0123456"]);
  assert.equal(r.accountNumberAsIs, "123456");
});

test("振替口座, 番号 6 digits and 5 digits or fewer", () => {
  const six = yuchoToBank("01940-1-123456");
  assert.deepEqual(pick(six), ["199", "一九九店", "イチキユウキユウ", "当座", "0123456"]);
  assert.equal(six.accountNumberAsIs, "123456");

  const five = yuchoToBank("01940", "1-12345");
  assert.deepEqual(pick(five), ["199", "一九九店", "イチキユウキユウ", "当座", "0012345"]);
});

test("input forms", () => {
  for (const args of [["11940-12345671"], ["11940 12345671"], ["１１９４０", "１２３４５６７１"]]) {
    assert.equal(yuchoToBank(...args).accountNumber, "1234567", args.join());
  }
  assert.throws(() => yuchoToBank("11940", "12345672"), /ends in 1/);
  assert.throws(() => yuchoToBank("21940", "12345671"), /not a ゆうちょ 記号/);
  assert.throws(() => yuchoToBank("11940"), /番号/);
});

// The 全銀 data lists the ゆうちょ branches with their names and readings:
// the kanji and kana built from the 店番 must match them.
test("店名 and reading agree with the 全銀 data", () => {
  const branches = data().byCode.get("9900").branches;
  assert.ok(branches.length > 50);
  for (const b of branches) {
    const kigo = `0${b.code.slice(0, 2)}00`;
    const r = b.code.endsWith("8")
      ? yuchoToBank(`1${kigo.slice(1)}`, "11")
      : yuchoToBank(kigo, "1");
    assert.equal(r.branchCode, b.code);
    assert.equal(r.branchName, `${b.name}店`);
    assert.equal(r.branchKana, b.kana);
    assert.deepEqual(
      r.notes.filter((n) => /not in/.test(n)),
      [],
    );
  }
});
