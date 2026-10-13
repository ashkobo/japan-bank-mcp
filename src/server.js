#!/usr/bin/env node
// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// server.js
// ---------------------------------------------------------------------------
// MCP server over stdio. The bank data ships with the package: no network, no API keys.
// Each tool is a thin wrapper over the library in index.js.

import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { asOf, findBranches, searchBanks, toZenginName, yuchoToBank } from "./index.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

// HELPERS
// ---------------------------------------------------------------------------

// A bad input comes back as a tool error instead of crashing the server.
function reply(fn) {
  return async (args) => {
    try {
      const result = { ...fn(args), dataAsOf: asOf() };
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: err.message }] };
    }
  };
}

// TOOLS
// ---------------------------------------------------------------------------

const server = new McpServer({ name: "japan-bank-mcp", version });

server.registerTool(
  "japan_bank_search",
  {
    title: "Find a Japanese bank and its code",
    description:
      "Japanese banks and other financial institutions with their 4-digit 金融機関コード " +
      "(全銀協), e.g. みずほ銀行 → 0001, 0005 → 三菱UFJ. " +
      "Takes a code, a name or its reading in any kana; 銀行 can be left out and " +
      "信用金庫 / 信用組合 / 農業協同組合 / JA○○ are understood. " +
      "Names come as the 全銀 data writes them: without 銀行, and 信金 / 信組 / 農協 " +
      'for the others. match: "code", "exact", "base" (exact once 銀行 etc. is left out), ' +
      '"prefix", "partial" or "none".',
    inputSchema: {
      query: z
        .string()
        .describe('Bank code or name, e.g. "0005", "三菱UFJ銀行", "じょうなんしんきん".'),
      limit: z.number().int().min(1).max(100).optional().describe("Max results. Default 10."),
    },
    annotations: READ_ONLY,
  },
  reply(({ query, limit }) => searchBanks(query, { limit })),
);

server.registerTool(
  "japan_bank_branch",
  {
    title: "Find a branch of a Japanese bank and its code",
    description:
      "Branches of a Japanese bank with their 3-digit 支店コード (店番), e.g. みずほ銀行 東京 → 001 東京営業部. " +
      "The bank is a code or a name that matches one bank. The branch is a code or a name or " +
      "its reading; 支店 can be left out, 本店 finds 本店営業部. Leave the branch out to list branches. " +
      'match: "code", "exact", "base", "prefix", "partial", "all" or "none".',
    inputSchema: {
      bank: z.string().describe('Bank code or name, e.g. "0001" or "みずほ銀行".'),
      branch: z
        .string()
        .optional()
        .describe('Branch code or name, e.g. "001", "新宿支店", "ほんてん".'),
      limit: z.number().int().min(1).max(1000).optional().describe("Max results. Default 10."),
    },
    annotations: READ_ONLY,
  },
  reply(({ bank, branch, limit }) => findBranches(bank, branch, { limit })),
);

server.registerTool(
  "japan_bank_account_name",
  {
    title: "Account holder name in 全銀 half-width kana",
    description:
      "Converts an account holder name to the half-width kana used in Japanese bank transfers " +
      "(受取人名 / 振込依頼人名 in 全銀 format), e.g. 株式会社ヤマダショウジ → ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ, " +
      "やまだ たろう → ﾔﾏﾀﾞ ﾀﾛｳ. Small kana become large (ｯ → ﾂ), ー becomes -, letters upper case. " +
      "株式会社, 有限会社, 合同会社, 一般社団法人 and the other standard terms are abbreviated by position " +
      "(ｶ)ﾔﾏﾀﾞ at the start, ﾔﾏﾀﾞ(ｶ)ﾄｳｷﾖｳ in the middle, ﾔﾏﾀﾞ(ｶ at the end). " +
      "Give the name in kana: kanji other than those terms " +
      "cannot be read and are listed in invalid. Check valid and warnings before using the name.",
    inputSchema: {
      name: z.string().describe('Name in kana, e.g. "ヤマダ タロウ" or "株式会社ヤマダショウジ".'),
      abbreviate: z
        .boolean()
        .optional()
        .describe("Abbreviate 株式会社 and the other terms. Default true."),
    },
    annotations: READ_ONLY,
  },
  reply(({ name, abbreviate }) => toZenginName(name, { abbreviate })),
);

server.registerTool(
  "japan_bank_yucho",
  {
    title: "ゆうちょ 記号番号 to transfer details",
    description:
      "Converts a ゆうちょ銀行 記号・番号 (e.g. 11940-12345671) to the 店名・店番・預金種目・口座番号 " +
      "that other banks need to transfer to it (一九八店, 198, 普通, 1234567), by Japan Post Bank's " +
      "published rule. 記号 starting with 1 = 総合口座 / 通常貯金, with 0 = 振替口座.",
    inputSchema: {
      kigo: z
        .string()
        .describe('記号, 5 digits, e.g. "11940". Or 記号 and 番号 together: "11940-12345671".'),
      bango: z.string().optional().describe('番号, e.g. "12345671".'),
    },
    annotations: READ_ONLY,
  },
  reply(({ kigo, bango }) => yuchoToBank(kigo, bango)),
);

await server.connect(new StdioServerTransport());
