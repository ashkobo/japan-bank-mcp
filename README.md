<img src=".github/assets/ash.png" alt="" width="110" align="right">

# japan-bank-mcp

**Give your AI agent the Japanese bank code book.** An MCP server for 金融機関コード and 支店コード, 全銀 kana account names and ゆうちょ 記号番号.

- Offline — the whole 全銀協 bank and branch code list ships with the package. No network, no API keys.
- All 1,100+ banks, 信用金庫, 信用組合, 労働金庫 and JA, and their 28,000+ branches.
- Reads names as people write them: みずほ銀行 / みずほ / ミズホ / ﾐｽﾞﾎ, 城南信用金庫, JA横浜, 新宿支店, 本店.
- Turns an account holder name into the half-width kana that transfers need (ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ), with the standard 法人略語.
- Converts a ゆうちょ 記号・番号 into the 店名・店番・口座番号 for a transfer from another bank.
- Works with Claude Code, Codex, Claude Desktop, Cursor and any MCP client.

LLMs often guess bank and branch codes, and get them almost right — which is worse than wrong on a transfer.

## Install

Claude Code:

```sh
claude mcp add japan-bank -- npx -y japan-bank-mcp
```

Codex:

```sh
codex mcp add japan-bank -- npx -y japan-bank-mcp
```

Claude Desktop / Cursor (`mcpServers` in the config file):

```json
{
  "mcpServers": {
    "japan-bank": { "command": "npx", "args": ["-y", "japan-bank-mcp"] }
  }
}
```

Requires Node.js 18 or later.

## Tools

| Tool | What it does | Example |
|---|---|---|
| `japan_bank_search` | Bank code from a name, or name from a code | `三菱UFJ銀行` → `0005` |
| `japan_bank_branch` | Branch code of a bank from a name, or name from a code | `みずほ銀行` `東京` → `001` 東京営業部 |
| `japan_bank_account_name` | Account holder name in 全銀 half-width kana | `株式会社ヤマダショウジ` → `ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ` |
| `japan_bank_yucho` | ゆうちょ 記号・番号 → 店名・店番・預金種目・口座番号 | `11940-12345671` → 一九八店 `198` 普通 `1234567` |

Account names follow the rules banks publish for 受取人名 (内国為替取扱規則):

| Name | 全銀 kana |
|---|---|
| やまだ　たろう | ﾔﾏﾀﾞ ﾀﾛｳ |
| ㈱さんしん | ｶ)ｻﾝｼﾝ |
| さんしん株式会社 | ｻﾝｼﾝ(ｶ |
| ロウドウショウジ株式会社 カスミガセキシシャ | ﾛｳﾄﾞｳｼﾖｳｼﾞ(ｶ)ｶｽﾐｶﾞｾｷｼｼﾔ |
| 一般社団法人ミライ | ｼﾔ)ﾐﾗｲ |
| ピーター・パン | ﾋﾟ-ﾀ-.ﾊﾟﾝ |

Small kana become large (ｯ → ﾂ), ー becomes -, ・ becomes ., letters are upper case. Characters outside the 全銀 set (ｱ-ﾝ ﾞ ﾟ A-Z 0-9 space ( ) - . / ｢ ｣ \) are reported, not dropped; kanji other than the 法人 terms cannot be read, so give the name in kana. Some banks accept fewer symbols, and the transfer record holds 30 characters: both come back as warnings.

Each result carries `dataAsOf`, the date of the bank code data it was built from.

## As a library

```js
import { findBranches, searchBanks, toZenginName, yuchoToBank } from "japan-bank-mcp";

searchBanks("じょうなんしんきん").results[0].code;  // "1344"
findBranches("0005", "本店").results[0].code;       // "001"
toZenginName("株式会社ヤマダショウジ").name;         // "ｶ)ﾔﾏﾀﾞｼﾖｳｼﾞ"
yuchoToBank("11940", "12345671").accountNumber;     // "1234567"
```

## Data

The bank and branch codes come from [zengin-code](https://github.com/zengin-code) (the `zengin-code` npm package, MIT License; see `data/LICENSE-zengin-code.txt`), which republishes the 全銀協 list. Names are as the 全銀 data writes them: without 銀行, and 信金 / 信組 / 農協 for the others. `npm run data` rebuilds `data/` from the installed `zengin-code` package.

The ゆうちょ conversion follows Japan Post Bank's published rule (記号･番号から振込用の店名・預金種目・口座番号への変換の公式). Always confirm a transfer destination with the account holder.

## 日本語

AI エージェントに金融機関コード簿を渡す MCP サーバーです。銀行・信用金庫・信用組合・労働金庫・JA の金融機関コードと支店コードを、名前やよみから引けます（逆も）。データを丸ごと同梱しているので、ネットにつながず、API キーも要りません。

「みずほ銀行／みずほ／ミズホ／ﾐｽﾞﾎ」「城南信用金庫」「JA横浜」「新宿支店」「本店」のような書き方の違いに対応しています。

口座名義を振込で使う半角カナ（全銀の文字）に直せます。小さい文字は大きく（ｯ → ﾂ）、長音は -、株式会社 → ｶ) / (ｶ) / (ｶ のような法人略語も位置に合わせて付けます。使えない文字は黙って消さずに知らせます。

ゆうちょ銀行の記号・番号から、他の銀行から振り込むときの店名・店番・預金種目・口座番号も出せます。

## License

MIT. The bank code data is from zengin-code (MIT).
