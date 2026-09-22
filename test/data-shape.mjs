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
// 🧬 世界図鑑（2026-09-23 カンブリア作り替え）: 画面が読む 図鑑.json の形。70マス＝14枚×5枠で level 0〜3、一本道の課の順番、スタンプ
try {
  const z = J(C + 'knowledge/学習/図鑑.json');
  const names = Object.keys(z.cards || {});
  must(names.length === 14, `図鑑.json: カードが${names.length}枚（14枚のはず）`);
  must(Array.isArray(z.order) && z.order.length === 14 && z.order.every(n => z.cards[n]), '図鑑.json: order が14枚のカード名になっていない');
  for (const n of names) {
    const c = z.cards[n];
    must(['world', 'sci', 'inv'].includes(c.track), `図鑑.json: ${n} の track が不明（${c.track}）`);
    for (const k of ['1', '2', '3', '4', '5']) {
      const sl = (c.slots || {})[k];
      must(sl && [0, 1, 2, 3].includes(sl.level) && Array.isArray(sl.answers) && typeof sl.body === 'string', `図鑑.json: ${n} の枠${k} の形が違う（level 0〜3・answers[]・body）`);
    }
  }
  must(Array.isArray(z.lessons) && z.lessons.every(x => x.key && x.title && names.includes(x.card) && x.slot >= 1 && x.slot <= 5 && Array.isArray(x.check)), '図鑑.json: lessons（一本道の課）に key/title/card/slot/check が無いものがある');
  must(Array.isArray(z.stamps) && z.stamps.every(x => x.key && (x.score === null || [0, 1, 2, 3].includes(x.score))), '図鑑.json: stamps の形が違う');
  must(z.qindex && Object.values(z.qindex).every(v => Array.isArray(v) && names.includes(v[0]) && v[1] >= 1 && v[1] <= 5), '図鑑.json: qindex（問い→マス）の形が違う');
  must(z.stock && typeof z.stock.unread === 'number', '図鑑.json: stock.unread が無い');
  // 問い.jsonl の全問に 70マスの札（card は14枚のどれか・slot 1〜5）
  const bank = fs.readFileSync(C + 'knowledge/学習/問い.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const bad = bank.filter(q => !names.includes(q.card) || !(q.slot >= 1 && q.slot <= 5)).map(q => q.id);
  must(!bad.length, `問い.jsonl: 70マスの札（card/slot）が無い問い ${bad.length}件: ${bad.slice(0, 5).join(' ')}`);
  const st = J(path.join(os.homedir(), 'repos/dashboard/img/stamps/stamps.json'));
  must([0, 1, 2, 3].every(k => (st.score[String(k)] || []).length) && (st.extra || []).length, 'stamps.json: 点数0〜3と extra の候補がそろっていない');
  for (const f of Object.values(st.score).flat().concat(st.extra)) must(fs.existsSync(path.join(os.homedir(), `repos/dashboard/img/stamps/${f}.png`)), `stamps.json: ${f}.png が無い`);
} catch (e) { errs.push('図鑑.json: ' + e.message); }
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
