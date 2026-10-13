// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// yucho.js
// ---------------------------------------------------------------------------
// ゆうちょ銀行 記号・番号 -> the 店名・店番・預金種目・口座番号 that other banks
// need to transfer to it. The rule is Japan Post Bank's own page
// 「記号･番号から振込用の店名・預金種目・口座番号への変換の公式」:
//
//   記号 1xxxx (総合口座・通常貯金・通常貯蓄貯金)
//     店番     = 2nd-3rd digits of 記号 + "8"          11940 -> 198
//     口座番号 = 番号 without its last digit "1"       12345671 -> 1234567
//     預金種目 = 普通 (通常貯蓄貯金: 貯蓄)
//   記号 0xxxx (振替口座)
//     店番     = 2nd-3rd digits of 記号 + "9"          01940 -> 199
//     口座番号 = 番号 as it is (the 1 digit between 記号 and 番号 is not used)
//     預金種目 = 当座
//
// 店名 is 店番 in kanji digits (一九八店, read イチキユウハチ). Some banks want the
// 口座番号 padded to 7 digits with leading zeros, so both forms are returned.

import { data } from "./data.js";

const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const READING = ["ゼロ", "イチ", "ニ", "サン", "ヨン", "ゴ", "ロク", "ナナ", "ハチ", "キユウ"];

// PUBLIC
// ---------------------------------------------------------------------------

/**
 * Accepts the 記号 and 番号 apart ("11940", "12345671") or together in kigo
 * ("11940-12345671", "01940-1-123456").
 *
 * [Example]
 * yuchoToBank("11940", "12345671") // { branchCode: "198", accountNumber: "1234567", ... }
 */
export function yuchoToBank(kigo, bango) {
  const [k, b] = parse(kigo, bango);
  const savings = k[0] === "1";

  let account;
  if (savings) {
    if (!b.endsWith("1")) {
      throw new RangeError(`番号 "${b}" of a 記号 1xxxx account ends in 1; check the number.`);
    }
    account = b.slice(0, -1);
  } else {
    account = b;
  }
  if (!account || account.length > 7) {
    throw new RangeError(`番号 "${b}" is too long for the 記号 ${k} kind of account.`);
  }

  const branchCode = k.slice(1, 3) + (savings ? "8" : "9");
  const digits = [...branchCode].map(Number);
  const yucho = data().byCode.get("9900");
  const known = yucho.branches.some((br) => br.code === branchCode);
  return {
    kigo: k,
    bango: b,
    kind: savings ? "総合口座・通常貯金・通常貯蓄貯金" : "振替口座",
    bankCode: "9900",
    bankName: "ゆうちょ銀行",
    branchCode,
    branchName: `${digits.map((d) => KANJI[d]).join("")}店`,
    branchKana: digits.map((d) => READING[d]).join(""),
    accountType: savings ? "普通" : "当座",
    accountNumber: account.padStart(7, "0"),
    accountNumberAsIs: account,
    notes: [
      ...(savings ? ["通常貯蓄貯金 accounts use 預金種目 貯蓄 instead of 普通."] : []),
      ...(known ? [] : [`店番 ${branchCode} is not in the bank code data: check the 記号 "${k}".`]),
    ],
  };
}

// PRIVATE
// ---------------------------------------------------------------------------

function parse(kigo, bango) {
  let k = digitsOf(kigo);
  let b = bango === undefined || bango === null ? "" : digitsOf(bango);
  // Everything in kigo: 記号-番号 or 記号-x-番号
  if (!b) {
    const parts = String(kigo)
      .normalize("NFKC")
      .trim()
      .split(/[\s\-‐−ー]+/);
    if (parts.length < 2) throw new RangeError("Give the 番号 as well as the 記号.");
    k = parts[0];
    b = parts.at(-1);
  } else {
    // 番号 written with the extra digit of a 振替口座: 1-123456
    const parts = String(bango)
      .normalize("NFKC")
      .trim()
      .split(/[\s\-‐−ー]+/);
    if (parts.length === 2 && parts[0].length === 1) b = parts[1];
  }
  if (!/^[01]\d{4}$/.test(k)) {
    throw new RangeError(`記号 "${k}" is not a ゆうちょ 記号 (5 digits starting with 1 or 0).`);
  }
  if (!/^\d{1,8}$/.test(b)) throw new RangeError(`番号 "${b}" is not 1 to 8 digits.`);
  return [k, b];
}

function digitsOf(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, "");
}
