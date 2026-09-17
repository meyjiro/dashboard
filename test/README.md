# ダッシュボードの検査（2026-09-17 新設）

メグ「ダッシュボードで時間を取られる状態を終わりにしたい。小手先でなく根本的に。直したら効いたかのアフターフォローも」。

| 何 | いつ | 何をする |
|---|---|---|
| `test/data-shape.mjs` | push前・毎朝 | 画面が読むJSON/CSVの**形**（morning.json の paper・world、briefing の配列、watchlist の plain、daily.csv の列、app.html の構文） |
| `test/ops-check.mjs` | push前・毎朝 | app.html の見張り（OPS 12項目）を**ローカルの実ファイル**で評価。`--record` で `claude-context/inbox/ops_history.jsonl` に1行積む |
| `.git/hooks/pre-push` | push前 | 上2つが赤なら push を止める（`--no-verify` で強行できる） |
| launchd `com.megu.ops-check` | 毎朝 09:40 JST | `--record` で履歴を積み、push。ダッシュボードの見張りの折りたたみに「直近14日」の帯として出る |

## 直したあとのアフターフォロー
`inbox/故障.md` の「機械チェックを足したか」欄に **OPSの項目名** を書く。毎週の週次レビュー（日曜21:00）が
`ops_history.jsonl` を見て、直後7日間その項目が🟢だったかを「アフターフォロー」欄に書く。
