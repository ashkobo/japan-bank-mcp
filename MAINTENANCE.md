# Maintaining japan-bank-mcp

The bundled bank dictionary comes from zengin-code, not a live bank master. The snapshot date
must remain visible in MCP responses. Confirm a destination with the holder and receiving bank
before a real transfer; matching and normalization do not establish account existence.

## Weekly source check

`npm run data:status` validates the local files and compares their source date with the latest
zengin-code npm version. It makes no writes. Once published, the read-only weekly Data freshness
workflow fails on an upstream change or unreadable version format. It never updates or releases
the package automatically.

## Updating and releasing

1. Check `npm run data:status`. If upstream changed, review its changes and exact version.
2. Update the `zengin-code` development dependency and lockfile, then run `npm run data`.
   Rebuilding without updating that dependency rebuilds the same snapshot.
3. Run `npm run data:check`: code widths, bank references, duplicates, minimum counts and the
   bundled MIT notice must pass. Investigate format/size changes before adjusting any guard.
4. Inspect `git diff --stat -- data` and `git diff -- data/meta.json`; review merged/renamed
   banks and branches and any aliases they affect. Preserve `data/LICENSE-zengin-code.txt`.
5. Run `npm run lint`, `npm test`, `npm run demo` and `npm run verify:package`. Confirm the
   candidate's CI and packed file list. Note the source date in release notes and seek approval.

If a build fails, do not release partly updated files. Keep the last known good release while
investigating the upstream source or parser. Never replace an unknown institution with a guess.

## Conversion rules and reports

Review kana abbreviations and ゆうちょ conversion against the receiving bank's published rules
when changing them. Unsupported characters must remain visible as errors/warnings. Bank-specific
symbol and length restrictions are not the same as the general 全銀 character set.

Ask for synthetic names, bank/branch identifiers, input and expected output, package version,
data date and the public rule behind the expectation. Never request an actual customer's
account number or payment file in a public Issue.

- [zengin-code JavaScript package](https://github.com/zengin-code/zengin-js)
- [Upstream source changes](https://github.com/zengin-code/source-data)
- [Japan Post Bank transfer conversion](https://www.jp-bank.japanpost.jp/kojin/sokin/koza/kj_sk_kz_furikomi_ksk.html)
