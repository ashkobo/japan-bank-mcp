// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// account.test.js
// ---------------------------------------------------------------------------
// The expected names are the examples published by 厚生労働省, 東邦銀行,
// 広島信用金庫 and 三条信用金庫 (see the sources in src/account.js).

import assert from "node:assert/strict";
import { test } from "node:test";
import { toZenginName } from "../src/index.js";

const name = (input, options) => toZenginName(input, options).name;

test("published abbreviation examples", () => {
  // 厚生労働省「法人名の略語の記載について」
  assert.equal(name("株式会社 ロウドウショウジ"), "ｶ)ﾛｳﾄﾞｳｼﾖｳｼﾞ");
  assert.equal(name("ロウドウショウジ 株式会社"), "ﾛｳﾄﾞｳｼﾖｳｼﾞ(ｶ");
  assert.equal(name("ロウドウショウジ 株式会社 カスミガセキシシャ"), "ﾛｳﾄﾞｳｼﾖｳｼﾞ(ｶ)ｶｽﾐｶﾞｾｷｼｼﾔ");
  // 三条信用金庫, 広島信用金庫
  assert.equal(name("㈱さんしん"), "ｶ)ｻﾝｼﾝ");
  assert.equal(name("さんしん㈱"), "ｻﾝｼﾝ(ｶ");
  assert.equal(name("さんしん㈱新潟営業所".replace("新潟", "ニイガタ")), "ｻﾝｼﾝ(ｶ)ﾆｲｶﾞﾀ(ｴｲ");
  assert.equal(name("ヒロシン　株式会社"), "ﾋﾛｼﾝ(ｶ");
  // 東邦銀行: 事業略語 without parentheses, and combined
  assert.equal(name("マルマル共済組合"), "ﾏﾙﾏﾙｷﾖｳｻｲ");
  assert.equal(name("マルマル火災海上保険株式会社サンカク営業所"), "ﾏﾙﾏﾙｶｻｲ(ｶ)ｻﾝｶｸ(ｴｲ");
});

test("more 法人 terms, longest first", () => {
  assert.equal(name("合同会社アシタ"), "ﾄﾞ)ｱｼﾀ");
  assert.equal(name("有限会社アシタ"), "ﾕ)ｱｼﾀ");
  assert.equal(name("一般社団法人アシタ"), "ｼﾔ)ｱｼﾀ");
  assert.equal(name("医療法人社団アシタカイ"), "ｲ)ｱｼﾀｶｲ");
  assert.equal(name("特定非営利活動法人アシタ"), "ﾄｸﾋ)ｱｼﾀ");
  assert.equal(name("地方独立行政法人アシタ"), "ﾁﾄﾞｸ)ｱｼﾀ");
  assert.equal(name("(有)アシタ"), "ﾕ)ｱｼﾀ");
  assert.equal(name("かぶしきがいしゃ あした"), "ｶ)ｱｼﾀ");
  assert.equal(name("株式会社アシタ", { abbreviate: false }), "株式会社ｱｼﾀ");
});

test("person names in any kana", () => {
  assert.equal(name("やまだ　たろう"), "ﾔﾏﾀﾞ ﾀﾛｳ");
  assert.equal(name("ヤマダ タロウ"), "ﾔﾏﾀﾞ ﾀﾛｳ");
  assert.equal(name("ﾔﾏﾀﾞ  ﾀﾛｳ"), "ﾔﾏﾀﾞ ﾀﾛｳ");
  assert.equal(name("きっかわ しょうこ"), "ｷﾂｶﾜ ｼﾖｳｺ");
  assert.equal(name("ピーター・パン"), "ﾋﾟ-ﾀ-.ﾊﾟﾝ");
  assert.equal(name("ヴィヴィアン"), "ｳﾞｲｳﾞｲｱﾝ");
  assert.equal(name("john smith"), "JOHN SMITH");
  assert.equal(name("ＡＢＣ　１２３"), "ABC 123");
});

test("invalid characters are reported, not dropped", () => {
  const r = toZenginName("山田 タロウ");
  assert.equal(r.valid, false);
  assert.equal(r.name, "山田 ﾀﾛｳ");
  assert.deepEqual(r.invalid, ["山", "田"]);
  assert.match(r.warnings.join(), /Kanji/);

  assert.deepEqual(toZenginName("A&B").invalid, ["&"]);
  assert.equal(toZenginName("ﾔﾏﾀﾞ").valid, true);
});

test("warnings: loose characters and length", () => {
  const wo = toZenginName("ヲノ");
  assert.equal(wo.name, "ｦﾉ");
  assert.equal(wo.valid, true);
  assert.match(wo.warnings.join(), /refuse ｦ/);

  const long = toZenginName("ア".repeat(31));
  assert.equal(long.length, 31);
  assert.match(long.warnings.join(), /30/);
  assert.deepEqual(toZenginName("ア".repeat(30)).warnings, []);
  assert.throws(() => toZenginName(" "), /Give a name/);
});
