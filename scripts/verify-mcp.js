// (c) 2026 Ash
// SPDX-License-Identifier: MIT
// verify-mcp.js
// ---------------------------------------------------------------------------

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "package-smoke", version: "1.0.0" });
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL("./server.js", import.meta.resolve("japan-bank-mcp")))],
      env: process.env,
    }),
  );
  assert.equal((await client.listTools()).tools.length, 4);
  const result = await client.callTool({
    name: "japan_bank_search",
    arguments: { query: "三菱UFJ銀行" },
  });
  assert.notEqual(result.isError, true, JSON.stringify(result));
  const response = JSON.parse(result.content[0].text);
  assert.equal(response.results[0].code, "0005");
} finally {
  await client.close();
}
