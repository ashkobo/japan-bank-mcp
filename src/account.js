// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// account.js
// ---------------------------------------------------------------------------
// Account holder names in the 全銀 format: the half-width kana used for
// 受取人名 and 振込依頼人名 in transfers and 全銀 transfer files.
//
// Sources relied on (rules published by banks, all following 内国為替取扱規則):
// - Characters: ｱ-ﾝ ﾞ ﾟ, A-Z, 0-9, space and ( ) - . / ｢ ｣ \ (愛知銀行 FAQ on
//   受取人名). Small kana are not used (ｯ -> ﾂ), letters are upper case, ・ -> .
//   and ー -> - (外為どっとコム 全銀 name rules; the 全銀 data itself writes long
//   vowels as -). Some banks accept only ( ) - . and space (三条信用金庫 FB
//   manual), and ｦ and , not everywhere (マネーフォワード FAQ): those are kept
//   but warned about.
// - Abbreviations and their position: 東邦銀行 and 広島信用金庫 略語一覧,
//   厚生労働省「法人名の略語の記載について」. 法人 and 営業所 terms take
//   parentheses: 株式会社○○ -> ｶ)○○, ○○株式会社△△ -> ○○(ｶ)△△,
//   ○○株式会社 -> ○○(ｶ. 事業 terms take none (○○共済組合 -> ○○ｷﾖｳｻｲ), except
//   at the start, where they are marked like a 法人 term.
// - Length: the 受取人名 field of a 全銀 transfer record is 30 characters, ﾞ and ﾟ
//   counting as one each.

import { halfKana, hiraganaToKatakana, largeKana } from "./kana.js";

const MAX_LENGTH = 30;
const STRICT = /^[ｱ-ﾝﾞﾟA-Z0-9 ().-]$/;
const ALLOWED = /^[ｱ-ﾝﾞﾟｦA-Z0-9 ().\-/｢｣\\,]$/;

// [kind, abbreviation, ...terms]. Kind "corp" takes parentheses, "trade" does not.
const ABBREVIATIONS = [
  ["corp", "ｶ", "株式会社", "カブシキガイシヤ", "カブシキカイシヤ"],
  ["corp", "ﾕ", "有限会社", "ユウゲンガイシヤ", "ユウゲンカイシヤ"],
  ["corp", "ﾒ", "合名会社", "ゴウメイガイシヤ", "ゴウメイカイシヤ"],
  ["corp", "ｼ", "合資会社", "ゴウシガイシヤ", "ゴウシカイシヤ"],
  ["corp", "ﾄﾞ", "合同会社", "ゴウドウガイシヤ", "ゴウドウカイシヤ"],
  ["corp", "ｲ", "医療法人", "医療法人社団", "医療法人財団", "社会医療法人"],
  ["corp", "ｻﾞｲ", "財団法人", "一般財団法人", "公益財団法人"],
  ["corp", "ｼﾔ", "社団法人", "一般社団法人", "公益社団法人"],
  ["corp", "ｼﾕｳ", "宗教法人"],
  ["corp", "ｶﾞｸ", "学校法人"],
  ["corp", "ﾌｸ", "社会福祉法人"],
  ["corp", "ﾎｺﾞ", "更生保護法人"],
  ["corp", "ｿ", "相互会社"],
  ["corp", "ﾄｸﾋ", "特定非営利活動法人", "NPO法人"],
  ["corp", "ﾄﾞｸ", "独立行政法人"],
  ["corp", "ﾁﾄﾞｸ", "地方独立行政法人"],
  ["corp", "ﾍﾞﾝ", "弁護士法人"],
  ["corp", "ﾁﾕｳ", "有限責任中間法人", "無限責任中間法人"],
  ["corp", "ｷﾞﾖ", "行政書士法人"],
  ["corp", "ｼﾎｳ", "司法書士法人"],
  ["corp", "ｾﾞｲ", "税理士法人"],
  ["corp", "ﾀﾞｲ", "国立大学法人", "公立大学法人"],
  ["corp", "ﾉｳ", "農事組合法人"],
  ["corp", "ｶﾝﾘ", "管理組合法人"],
  ["corp", "ﾛｳﾑ", "社会保険労務士法人"],
  ["corp", "ｴｲ", "営業所"],
  ["corp", "ｼﾕﾂ", "出張所"],
  ["trade", "ﾚﾝ", "連合会"],
  ["trade", "ｷﾖｳｻｲ", "共済組合"],
  ["trade", "ｷﾖｳｸﾐ", "協同組合"],
  ["trade", "ｾｲﾒｲ", "生命保険"],
  ["trade", "ｶｲｼﾞﾖｳ", "海上火災保険"],
  ["trade", "ｶｻｲ", "火災海上保険"],
  ["trade", "ｹﾝﾎﾟ", "健康保険組合"],
  ["trade", "ｺｸﾎ", "国民健康保険組合"],
  ["trade", "ｺｸﾎﾚﾝ", "国民健康保険組合連合会", "国民健康保険団体連合会"],
  ["trade", "ｼﾔﾎ", "社会保険診療報酬支払基金"],
  ["trade", "ｺｳﾈﾝ", "厚生年金基金"],
  ["trade", "ｼﾞﾕｳｸﾐ", "従業員組合"],
  ["trade", "ﾛｳｸﾐ", "労働組合"],
  ["trade", "ｾｲｷﾖｳ", "生活協同組合"],
  ["trade", "ｼﾖｸﾊﾝｷﾖｳ", "食糧販売協同組合"],
  ["trade", "ｺｸｷﾖｳﾚﾝ", "国家公務員共済組合連合会"],
  ["trade", "ﾉｳｷﾖｳﾚﾝ", "農業協同組合連合会"],
  ["trade", "ｹｲｻﾞｲﾚﾝ", "経済農業協同組合連合会"],
  ["trade", "ｷﾖｳｻｲﾚﾝ", "共済農業協同組合連合会"],
  ["trade", "ｷﾞﾖｷﾖｳ", "漁業協同組合"],
  ["trade", "ｷﾞﾖﾚﾝ", "漁業協同組合連合会"],
  ["trade", "ｼﾖｸｱﾝ", "公共職業安定所"],
  ["trade", "ｼﾔｷﾖｳ", "社会福祉協議会"],
  ["trade", "ﾄｸﾖｳ", "特別養護老人ホーム"],
  ["trade", "ﾕｳｸﾐ", "有限責任事業組合"],
];

// ㈱ and (株) are NFKC'd to "(株)"; these stand for the full term.
const MARKS = {
  "(株)": "株式会社",
  "(有)": "有限会社",
  "(名)": "合名会社",
  "(資)": "合資会社",
  "(同)": "合同会社",
  "(医)": "医療法人",
  "(財)": "財団法人",
  "(社)": "社団法人",
  "(宗)": "宗教法人",
  "(学)": "学校法人",
  "(福)": "社会福祉法人",
  "(特非)": "特定非営利活動法人",
};

// Longest first, so 医療法人社団 wins over 医療法人 and 国民健康保険組合 over 健康保険組合.
const TERMS = ABBREVIATIONS.flatMap(([kind, abbreviation, ...terms]) =>
  terms.map((term) => ({ kind, abbreviation, term: hiraganaToKatakana(term) })),
).sort((a, b) => b.term.length - a.term.length);

// PUBLIC
// ---------------------------------------------------------------------------

/**
 * 全銀 half-width kana for an account holder name given in kana (any width, hiragana
 * or katakana), with corporate terms such as 株式会社 abbreviated by position.
 * Kanji other than those terms cannot be read and are reported in invalid[].
 *
 * [Example]
 * toZenginName("株式会社ヤマダショウジ").name // "ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ"
 * toZenginName("やまだ　たろう").name         // "ﾔﾏﾀﾞ ﾀﾛｳ"
 */
export function toZenginName(input, { abbreviate = true } = {}) {
  const text = String(input ?? "").trim();
  if (!text) throw new RangeError("Give a name in kana, e.g. ヤマダ タロウ or 株式会社ヤマダ.");

  let src = largeKana(hiraganaToKatakana(text.normalize("NFKC")));
  for (const [mark, term] of Object.entries(MARKS)) src = src.replaceAll(mark, term);

  const parts = abbreviate ? split(src) : [{ text: src }];
  const abbreviations = [];
  const out = parts.map((part, i) => {
    if (part.text !== undefined) return convert(part.text);
    const position = positionOf(parts, i);
    abbreviations.push({ term: part.term, abbreviation: part.abbreviation, position });
    return mark(part, position);
  });

  const name = join(parts, out).replace(/ {2,}/g, " ").trim();
  const chars = [...name];
  const invalid = [...new Set(chars.filter((c) => !ALLOWED.test(c)))];
  const warnings = [];
  const loose = [...new Set(chars.filter((c) => ALLOWED.test(c) && !STRICT.test(c)))];
  if (loose.length) {
    warnings.push(
      `Some banks refuse ${loose.join(" ")}, though the 全銀 character set allows them.`,
    );
  }
  if (chars.length > MAX_LENGTH) {
    warnings.push(
      `${chars.length} characters: the 全銀 transfer record holds ${MAX_LENGTH} ` +
        "(ﾞ and ﾟ count as one).",
    );
  }
  if (invalid.some((c) => /\p{Script=Han}/u.test(c))) {
    warnings.push("Kanji cannot be converted: give the name in kana.");
  }
  return {
    input,
    name,
    length: chars.length,
    valid: invalid.length === 0,
    invalid,
    abbreviations,
    warnings,
  };
}

// PRIVATE
// ---------------------------------------------------------------------------

// Splits the text into plain parts and abbreviation terms, left to right.
function split(text) {
  const parts = [];
  let plain = "";
  for (let i = 0; i < text.length; ) {
    const hit = TERMS.find((t) => text.startsWith(t.term, i));
    if (!hit) {
      plain += text[i++];
      continue;
    }
    if (plain) parts.push({ text: plain });
    plain = "";
    parts.push(hit);
    i += hit.term.length;
  }
  if (plain) parts.push({ text: plain });
  return parts;
}

function positionOf(parts, i) {
  const blank = (p) => p.text !== undefined && !p.text.trim();
  if (parts.slice(0, i).every(blank)) return "start";
  if (parts.slice(i + 1).every(blank)) return "end";
  return "middle";
}

function mark({ kind, abbreviation }, position) {
  if (position === "start") return `${abbreviation})`;
  if (kind === "trade") return abbreviation;
  return position === "end" ? `(${abbreviation}` : `(${abbreviation})`;
}

// Spaces next to a parenthesised abbreviation are dropped: ﾔﾏﾀﾞ(ｶ)ﾄｳｷﾖｳ, not ﾔﾏﾀﾞ(ｶ) ﾄｳｷﾖｳ.
function join(parts, out) {
  let result = "";
  for (let i = 0; i < out.length; i++) {
    let piece = out[i];
    const prev = parts[i - 1];
    const next = parts[i + 1];
    if (parts[i].text !== undefined) {
      if (prev && prev.text === undefined && /[()]$/.test(out[i - 1])) piece = piece.trimStart();
      if (next && next.text === undefined && /^[()]/.test(out[i + 1])) piece = piece.trimEnd();
    }
    result += piece;
  }
  return result;
}

// One plain stretch of NFKC'd katakana text -> 全銀 characters; unknown ones stay as they are.
function convert(text) {
  let out = "";
  for (const c of text) {
    if (/[ー\-－‐−―]/.test(c)) out += "-";
    else if (c === "・" || c === "。") out += ".";
    else if (c === "、") out += ",";
    else if (c === "「") out += "｢";
    else if (c === "」") out += "｣";
    else if (c === "¥") out += "\\";
    else if (/\s/.test(c)) out += " ";
    else if (/[a-z]/.test(c)) out += c.toUpperCase();
    else out += halfKana(c) ?? c;
  }
  return out;
}
