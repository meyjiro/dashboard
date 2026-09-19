#!/bin/bash
# ダッシュボードの検査を全部走らせる。push 前（pre-push）と毎朝（launchd）に使う。
cd "$(dirname "$0")/.." || exit 1
echo "== データの形"; node test/data-shape.mjs; a=$?
echo "== 見張り（実データ）"; node test/ops-check.mjs "$@"; b=$?
[ $a -eq 0 ] && [ $b -eq 0 ]

# CSSの事故検知（2026-09-19）: 「セレクタ /* コメント */」のように、セレクタの直後に { が無い行があると、
# 次の規則が子孫セレクタに巻き込まれて効かなくなる（カンブリアのリーダーが開かなかった原因）。
node -e "
const fs=require('fs');const s=fs.readFileSync(process.env.HOME+'/repos/dashboard/app.html','utf8');
const css=s.slice(s.indexOf('<style>'),s.indexOf('</style>'));
const bad=css.split('\\n').filter(l=>/^[#.][\\w-]+(\\s+[.#>\\[\\w-]+)*\\s*\\/\\*/.test(l));
if(bad.length){console.log('🔴 css-selector-comment:',bad.map(x=>x.slice(0,60)));process.exit(1)}else console.log('🟢 CSS セレクタの巻き込みなし');"
