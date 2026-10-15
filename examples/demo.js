// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// demo.js
// ---------------------------------------------------------------------------

import assert from "node:assert/strict";
import { findBranches, searchBanks, toZenginName, yuchoToBank } from "japan-bank-mcp";

assert.equal(searchBanks("みずほ銀行").results[0].code, "0001");
assert.equal(findBranches("0005", "本店").results[0].code, "001");
const name = toZenginName("株式会社ヤマダショウジ").name;
assert.equal(name, "ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ");
const account = yuchoToBank("11940", "12345671");
assert.equal(account.branchCode, "198");
assert.equal(account.accountNumber, "1234567");
console.log(`株式会社ヤマダショウジ -> ${name}`);
console.log(
  `11940-12345671 -> bank 9900, branch ${account.branchCode}, account ${account.accountNumber}`,
);
