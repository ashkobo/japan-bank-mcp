// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// bank.js
// ---------------------------------------------------------------------------
// Banks and branches by code, name, kana or romaji.
//
// The 全銀 data names banks without their kind (みずほ, not みずほ銀行) and uses
// short forms for the others (城南信金, 北央信組, 横浜農協), so the query is
// shortened the same way. Results come from the best tier that has any:
// code, exact, base (支店 / 営業部 / 銀行 left out), prefix, partial.

import { data } from "./data.js";
import { keyOf } from "./kana.js";

const TIERS = ["exact", "base", "prefix", "partial"];

// Long forms that people write -> the short forms in the data (keys, so katakana).
const BANK_SUFFIXES = [
  [/(銀行|ギンコウ|BANK)$/, ""],
  [/信用金庫$/, "信金"],
  [/シンヨウキンコ$/, "シンキン"],
  [/信用組合$/, "信組"],
  [/シンヨウクミアイ$/, "シンクミ"],
  [/労働金庫$/, "労金"],
  [/ロウドウキンコ$/, "ロウキン"],
  [/農業協同組合$/, "農協"],
  [/ノウギヨウキヨウドウクミアイ$/, "ノウキヨウ"],
  [/漁業協同組合$/, "漁協"],
  [/ギヨギヨウキヨウドウクミアイ$/, "ギヨキヨウ"],
];

// Names the data does not carry: groups, former names, everyday names.
const ALIASES = {
  MUFG: "0005",
  SMBC: "0009",
  住信SBIネット: "0038",
  住信SBI: "0038",
  ジャパンネット: "0033",
  新生: "0397",
  郵便局: "9900",
  ゆうびんきょく: "9900",
};

const BRANCH_SUFFIX = /(支店|営業部|出張所|支所|シテン|エイギヨウブ|シユツチヨウシヨ|シシヨ)$/;

let index;

// PUBLIC
// ---------------------------------------------------------------------------

/**
 * Banks by code ("0005", "5") or name, tolerant of how it is written.
 * match is "code", "exact", "base", "prefix", "partial" or "none".
 *
 * [Example]
 * searchBanks("三菱UFJ銀行").results[0].code // "0005"
 * searchBanks("じょうなんしんきん").results[0] // { code: "1344", name: "城南信金", ... }
 */
export function searchBanks(query, { limit = 10 } = {}) {
  const text = String(query ?? "")
    .normalize("NFKC")
    .trim();
  if (!text) throw new RangeError("Give a bank name or a 4-digit bank code, e.g. みずほ or 0001.");

  let match = "none";
  let rows = [];
  if (/^\d{1,4}$/.test(text)) {
    const bank = data().byCode.get(text.padStart(4, "0"));
    match = bank ? "code" : "none";
    rows = bank ? [bank] : [];
  } else {
    ({ match, rows } = best(bankIndex(), bankKeys(text)));
  }
  return { query, match, total: rows.length, results: rows.slice(0, limit).map(format) };
}

/**
 * Branches of one bank by code ("001") or name. The bank is a code or a name that
 * matches one bank. Without a branch query, lists the branches.
 *
 * [Example]
 * findBranches("みずほ", "東京").results[0] // { code: "001", name: "東京営業部", ... }
 */
export function findBranches(bankQuery, branchQuery, { limit = 10 } = {}) {
  const bank = resolveBank(bankQuery);
  const text = String(branchQuery ?? "")
    .normalize("NFKC")
    .trim();

  let match;
  let rows;
  if (!text) {
    match = "all";
    rows = bank.branches;
  } else if (/^\d{1,3}$/.test(text)) {
    const code = text.padStart(3, "0");
    rows = bank.branches.filter((b) => b.code === code);
    match = rows.length ? "code" : "none";
  } else {
    ({ match, rows } = best(branchIndex(bank), branchKeys(text)));
  }
  return {
    bank: format(bank),
    query: branchQuery ?? "",
    match,
    total: rows.length,
    results: rows.slice(0, limit).map(format),
  };
}

export function asOf() {
  return data().asOf;
}

// MATCHING
// ---------------------------------------------------------------------------

// The best tier with any hit, in code order.
function best(entries, keys) {
  for (const tier of TIERS) {
    const rows = entries.filter((e) => test(tier, e, keys)).map((e) => e.row);
    if (rows.length) return { match: tier, rows: [...new Set(rows)] };
  }
  return { match: "none", rows: [] };
}

function test(tier, entry, { full, base }) {
  switch (tier) {
    case "exact":
      return entry.keys.includes(full);
    case "base":
      return entry.bases.some((k) => base.includes(k));
    case "prefix":
      return entry.keys.some((k) => base.some((q) => k.startsWith(q)));
    default:
      return entry.keys.some((k) => base.some((q) => k.includes(q)));
  }
}

function bankKeys(text) {
  const full = keyOf(text);
  const base = new Set([full]);
  let short = full.replace(/^(株式会社|カブシキガイシヤ)|(株式会社|カブシキガイシヤ)$/g, "");
  for (const [re, to] of BANK_SUFFIXES) short = short.replace(re, to);
  base.add(short);
  // JA横浜 -> 横浜農協, JFしまね漁協 is already in the data as written
  const ja = /^(JA|ジエイエイ)(.+)$/.exec(short);
  if (ja) base.add(`${ja[2]}農協`).add(`${ja[2]}ノウキヨウ`);
  return { full, base: [...base].filter(Boolean) };
}

function branchKeys(text) {
  const full = keyOf(text);
  return { full, base: [...new Set([full, branchBase(full)])].filter(Boolean) };
}

// 本店営業部 -> 本店, 東京営業部 -> 東京, 新宿支店 -> 新宿, 一〇八店 -> 一〇八; 本店 stays.
function branchBase(key) {
  const short = key.replace(BRANCH_SUFFIX, "");
  return /[^本]店$/.test(short) ? short.slice(0, -1) : short;
}

function resolveBank(query) {
  const found = searchBanks(query, { limit: 5 });
  if (found.match === "none") throw new RangeError(`No bank matches "${query}".`);
  if (found.total > 1) {
    const list = found.results.map((b) => `${b.code} ${b.name}`).join(", ");
    throw new RangeError(
      `"${query}" matches ${found.total} banks (${list}${found.total > 5 ? ", ..." : ""}). ` +
        "Give the bank code or a fuller name.",
    );
  }
  return data().byCode.get(found.results[0].code);
}

// INDEX
// ---------------------------------------------------------------------------

function bankIndex() {
  if (index) return index.banks;
  const byCode = data().byCode;
  const banks = data().banks.map((b) => {
    const keys = [keyOf(b.name), keyOf(b.kana), keyOf(b.roma)];
    return { row: b, keys, bases: keys };
  });
  for (const [alias, code] of Object.entries(ALIASES)) {
    const key = keyOf(alias);
    banks.push({ row: byCode.get(code), keys: [key], bases: [key] });
  }
  index = { banks, branches: new Map() };
  return index.banks;
}

function branchIndex(bank) {
  bankIndex();
  if (!index.branches.has(bank.code)) {
    const entries = bank.branches.map((b) => {
      const keys = [keyOf(b.name), keyOf(b.kana), keyOf(b.roma)];
      return { row: b, keys, bases: [...new Set(keys.map(branchBase))] };
    });
    index.branches.set(bank.code, entries);
  }
  return index.branches.get(bank.code);
}

function format(b) {
  return { code: b.code, name: b.name, kana: b.kana };
}
