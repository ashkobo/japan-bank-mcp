// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// server.test.js
// ---------------------------------------------------------------------------

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "test", version: "0" });

before(async () => {
  const server = fileURLToPath(new URL("../src/server.js", import.meta.url));
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
});
after(() => client.close());

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return { ...res, json: res.isError ? null : JSON.parse(res.content[0].text) };
}

test("lists the tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "japan_bank_account_name",
    "japan_bank_branch",
    "japan_bank_search",
    "japan_bank_yucho",
  ]);
  for (const t of tools) assert.equal(t.annotations.readOnlyHint, true);
});

test("bank, branch, account name and ゆうちょ", async () => {
  const bank = (await call("japan_bank_search", { query: "みずほ銀行" })).json;
  assert.equal(bank.results[0].code, "0001");
  assert.match(bank.dataAsOf, /^\d{4}-\d{2}-\d{2}$/);

  const branch = (await call("japan_bank_branch", { bank: "0005", branch: "本店" })).json;
  assert.equal(branch.results[0].code, "001");

  const name = (await call("japan_bank_account_name", { name: "株式会社ヤマダショウジ" })).json;
  assert.equal(name.name, "ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ");

  const yucho = (await call("japan_bank_yucho", { kigo: "11940", bango: "12345671" })).json;
  assert.equal(yucho.branchCode, "198");
  assert.equal(yucho.accountNumber, "1234567");
});

test("bad input is a tool error, not a crash", async () => {
  const res = await call("japan_bank_branch", { bank: "xyz", branch: "本店" });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /No bank/);
});
