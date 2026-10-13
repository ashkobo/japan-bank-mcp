// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// kana.js
// ---------------------------------------------------------------------------
// Kana helpers shared by the search and the 全銀 name conversion.

// The 全銀 kana set has no small kana: banks register ｷﾖｳ for キョウ, ﾂ for ッ.
const SMALL = {
  ァ: "ア",
  ィ: "イ",
  ゥ: "ウ",
  ェ: "エ",
  ォ: "オ",
  ッ: "ツ",
  ャ: "ヤ",
  ュ: "ユ",
  ョ: "ヨ",
  ヮ: "ワ",
  ヵ: "カ",
  ヶ: "ケ",
  ヰ: "イ",
  ヱ: "エ",
};

// Full-width katakana -> half-width, built from NFKC (which maps the other way).
const HALF = new Map();
for (let c = 0xff66; c <= 0xff9f; c++) {
  const half = String.fromCharCode(c);
  HALF.set(half.normalize("NFKC"), half);
}

export function hiraganaToKatakana(text) {
  return text.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function largeKana(text) {
  return text.replace(/[ァィゥェォッャュョヮヵヶヰヱ]/g, (c) => SMALL[c]);
}

/**
 * Half-width form of one full-width katakana, with ﾞ / ﾟ split off (ガ -> ｶﾞ).
 * Returns undefined for anything else.
 */
export function halfKana(c) {
  if (HALF.has(c)) return HALF.get(c);
  const [base, mark] = c.normalize("NFD");
  if (!HALF.has(base)) return undefined;
  if (mark === "゙") return `${HALF.get(base)}ﾞ`;
  if (mark === "゚") return `${HALF.get(base)}ﾟ`;
  return undefined;
}

/**
 * Search key: the ways people write the same name come out equal.
 * Full / half width, hiragana / katakana, small / large kana, case, spaces, long vowels.
 *
 * [Example]
 * keyOf("三菱ＵＦＪ")              // "三菱UFJ"
 * keyOf("みつびしゆーえふじぇい") // "ミツビシユエフジエイ"
 */
export function keyOf(text) {
  const nfkc = String(text).normalize("NFKC").toUpperCase();
  return largeKana(hiraganaToKatakana(nfkc)).replace(/[\s・.\-－ー‐−―、,]/g, "");
}
