// 画面が読むデータの「形」の検査。routine が形を変えて書くと画面が黙って空になる（9/17 朝のメニューの paper で実例）。
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const C = path.join(os.homedir(), 'repos/claude-context/');
const P = path.join(os.homedir(), 'repos/personal/');
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const errs = [];
const must = (cond, msg) => { if (!cond) errs.push(msg); };
try {
  const m = J(C + 'inbox/morning.json');
  must(m.generated_at, 'morning.json: generated_at が無い');
  const pp = m.paper; const KEYS = ['top', 'life', 'north', 'event', 'asean'];
  const okShape = pp && Array.isArray(pp.sections) && pp.sections.every(s => s.key && Array.isArray(s.items));
  const dictShape = pp && KEYS.some(k => Array.isArray(pp[k]));
  must(okShape || dictShape, 'morning.json: paper の形が不明（sections も面ごとの配列も無い）');
  if (dictShape && !okShape) console.log('⚠️ morning.json: paper が辞書形（画面は読める。routine の仕様違反）');
  const n = okShape ? pp.sections.reduce((a, s) => a + s.items.length, 0) : KEYS.reduce((a, k) => a + ((pp[k] || []).length), 0);
  must(n >= 3, `morning.json: 新聞の記事が${n}本しか無い`);
  must(m.world && m.world.title && m.world.note, 'morning.json: 今日の1本（world）が欠けている');
  // 🎓 朝の問い（2026-09-23）: 深い問いに text、浅い問いに id・text・answer_key（道場の4択と間隔反復がこれを使う）
  const qz = m.quiz || {};
  must(Array.isArray(qz.items) && qz.items.length && qz.items.every(x => x.id && x.text), 'morning.json: quiz.items（深い問い）が空か id/text が無い');
  must(Array.isArray(qz.quick) && qz.quick.length && qz.quick.every(x => x.id && x.text && x.answer_key), 'morning.json: quiz.quick（浅い問い）が空か id/text/answer_key が無い');
  if (m.thai_none && n > 0) console.log('⚠️ morning.json: thai_none=true なのに記事がある（フラグの付け間違い。画面には影響なし）');
} catch (e) { errs.push('morning.json: ' + e.message); }
try {
  const b = J(C + 'inbox/briefing.json');
  must(Array.isArray(b.today) && Array.isArray(b.attention), 'briefing.json: today/attention が配列でない');
  must(b.generated_at, 'briefing.json: generated_at が無い');
} catch (e) { errs.push('briefing.json: ' + e.message); }
try {
  const w = J(C + 'inbox/watchlist.json'); must(Array.isArray(w.entries) && w.entries.length, 'watchlist.json: entries が空');
  const last = w.entries[w.entries.length - 1]; must(last.plain && last.plain.what, 'watchlist.json: 最新の候補に plain が無い（不良品）');
} catch (e) { errs.push('watchlist.json: ' + e.message); }
try {
  const csv = fs.readFileSync(P + 'health/data/daily.csv', 'utf8').replace(/\r/g, '');
  const head = csv.split('\n')[0].split(',');
  for (const c of ['date', 'steps', 'resting_hr', 'hrv_ms', 'sleep_min', 'walking_speed_kmh']) must(head.includes(c), `daily.csv: 列 ${c} が無い`);
} catch (e) { errs.push('daily.csv: ' + e.message); }
try {
  const md = fs.readFileSync(P + `diary/${new Date().toISOString().slice(0, 7)}.md`, 'utf8');
  must(/^## \d{4}-\d{2}-\d{2}/m.test(md), 'diary: 日付見出しが無い');
} catch (e) { console.log('⚠️ diary: 今月のファイルが無い（月初なら正常）'); }
// app.html 自身: script が構文エラーでないか
try {
  const app = fs.readFileSync(path.join(os.homedir(), 'repos/dashboard/app.html'), 'utf8');
  for (const m of app.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Function(m[1]);
} catch (e) { errs.push('app.html: script の構文エラー ' + e.message); }
for (const e of errs) console.log('🔴', e);
if (!errs.length) console.log('🟢 データの形は全部OK');
process.exit(errs.length ? 1 : 0);
