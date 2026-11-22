#!/bin/bash
# ダッシュボードの検査を全部走らせる。push 前（pre-push）と毎朝（launchd）に使う。
cd "$(dirname "$0")/.." || exit 1
echo "== データの形"; node test/data-shape.mjs; a=$?
echo "== 見張り（実データ）"; node test/ops-check.mjs "$@"; b=$?
echo "== やりとり板の書き込み"; node test/board-merge.mjs; c=$?

# CSSの事故検知（2026-09-19）: 「セレクタ /* コメント */」のように、セレクタの直後に { が無い行があると、
# 次の規則が子孫セレクタに巻き込まれて効かなくなる（カンブリアのリーダーが開かなかった原因）。
node -e "
const fs=require('fs');const s=fs.readFileSync(process.env.HOME+'/repos/dashboard/app.html','utf8');
const css=s.slice(s.indexOf('<style>'),s.indexOf('</style>'));
const bad=css.split('\\n').filter(l=>/^[#.][\\w-]+(\\s+[.#>\\[\\w-]+)*\\s*\\/\\*/.test(l));
if(bad.length){console.log('🔴 css-selector-comment:',bad.map(x=>x.slice(0,60)));process.exit(1)}else console.log('🟢 CSS セレクタの巻き込みなし');"; d=$?
# app.html の script が構文として正しいか（data-shape にもあるが、こちらは push を止める側）
node -e "
const fs=require('fs');const s=fs.readFileSync(process.env.HOME+'/repos/dashboard/app.html','utf8');
try{for(const m of s.matchAll(/<script[^>]*>([\\s\\S]*?)<\\/script>/g)) new Function(m[1]); console.log('🟢 app.html の構文')}catch(e){console.log('🔴 app.html の構文エラー',e.message);process.exit(1)}"; e=$?
# 🔴 2026-11-22: push を止めるのは「コードの壊れ」だけ（板の書き込み・CSS・構文）。
#    データの形（a）と見張り（b）は外のデータの新しさで赤くなるので、表示だけにして止めない。
#    止めると、道場の自動 push（_tools/run-dojo.sh）まで止まり、道場の見張りがさらに赤くなる（自分で自分を閉じ込める）
[ $a -eq 0 ] && [ $b -eq 0 ] || echo "⚠️ データの形か見張りに赤がある（push は止めない。中身を見て直す）"
[ $c -eq 0 ] && [ $d -eq 0 ] && [ $e -eq 0 ]
