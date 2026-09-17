// 見張り（OPS）の実データ検証。app.html の OPS 定義をそのまま切り出して、ローカルのリポジトリ実ファイルで評価する。
// 使い方: node test/ops-check.mjs            → 結果を表示。赤があれば終了コード1
//         node test/ops-check.mjs --record   → inbox/ops_history.jsonl に1行追記（Macの日次ジョブ用）
// 🔴 目的: (1) push 前にダッシュボードの見張りが壊れていないか確かめる（pre-push フック）
//          (2) 毎朝の結果を積んで「直したものが効いているか」を後から見られるようにする（2026-09-17 メグ指示）
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const HOME = os.homedir();
const app = fs.readFileSync(path.join(HOME, 'repos/dashboard/app.html'), 'utf8');
const slice = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
const parseCsvSrc = slice('function parseCsv', 'function sparkBars');
const opsSrc = slice('const OPS = [', '// ══ 📊 今日の数字');
const base = { 'meyjiro/personal': path.join(HOME, 'repos/personal/'), 'meyjiro/claude-context': path.join(HOME, 'repos/claude-context/') };
const REPO = 'meyjiro/claude-context';
async function repoFile(repo, p) { try { return fs.readFileSync(base[repo] + p, 'utf8'); } catch { return null; } }
const rows = await new Function('fs', 'repoFile', 'REPO', `${parseCsvSrc}\n${opsSrc}\nreturn (async()=>{
  const now=Date.now(); const out=[];
  for(const o of OPS){
    try{
      if(o.check){ const r=await o.check(); const d=r.at?new Date(r.at):null; out.push({name:o.name, days:d?(now-d.getTime())/86400000:0, limit:99, err:r.err||null, note:r.note}); continue; }
      let p=o.pathFn?o.pathFn():o.path; let t=await repoFile(o.repo,p); if(!t&&o.altPathFn) t=await repoFile(o.repo,o.altPathFn());
      if(!t){ out.push({name:o.name, err:'ファイルが無い'}); continue; }
      const raw=o.read(t); if(!raw){ out.push({name:o.name, err:'日付を読めない'}); continue; }
      const d=new Date(String(raw).length<=10? raw+'T12:00:00+09:00': raw);
      const wd=new Date().getDay(); const lim=(o.weekend&&(wd===0||wd===6||wd===1))?o.weekend:o.limit;
      const bad=o.verify?o.verify(t):null;
      out.push({name:o.name, at:d.toISOString(), days:(now-d.getTime())/86400000, limit:lim, err:bad||null});
    }catch(e){ out.push({name:o.name, err:'読み込みに失敗 '+e.message}); }
  }
  return out; })();`)(fs, repoFile, REPO);
const bad = rows.filter(r => r.err || r.days > r.limit);
for (const r of rows) console.log((r.err || r.days > r.limit ? '🔴' : '🟢'), r.name.padEnd(8), r.err || r.note || (r.days.toFixed(2) + '日 / 上限' + r.limit));
if (process.argv.includes('--record')) {
  const line = { date: new Date().toISOString(), bad: bad.map(r => r.name), n: rows.length,
                 items: Object.fromEntries(rows.map(r => [r.name, r.err ? 'err:' + r.err : (r.days > r.limit ? 'stale' : 'ok')])) };
  fs.appendFileSync(path.join(HOME, 'repos/claude-context/inbox/ops_history.jsonl'), JSON.stringify(line) + '\n');
  console.log('recorded', line.bad.length ? line.bad : 'all ok');
}
process.exit(bad.length ? 1 : 0);
