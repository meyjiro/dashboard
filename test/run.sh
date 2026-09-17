#!/bin/bash
# ダッシュボードの検査を全部走らせる。push 前（pre-push）と毎朝（launchd）に使う。
cd "$(dirname "$0")/.." || exit 1
echo "== データの形"; node test/data-shape.mjs; a=$?
echo "== 見張り（実データ）"; node test/ops-check.mjs "$@"; b=$?
[ $a -eq 0 ] && [ $b -eq 0 ]
