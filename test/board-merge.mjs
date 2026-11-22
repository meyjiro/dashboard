// やりとり板：書き込みがぶつかったときに、先に入ったクロードの返事を消さないことを確かめる（2026-11-22）。
// app.html から板の関数をそのまま切り出し、fetch を差し替えて走らせる。本番の板には何も書かない。
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const app = fs.readFileSync(path.join(os.homedir(), 'repos/dashboard/app.html'), 'utf8');
const cut = (a, b) => { const i = app.indexOf(a), j = app.indexOf(b, i); if (i < 0 || j < 0) throw new Error('切り出せない: ' + a); return app.slice(i, j); };
const src = [
  cut('async function api(', 'async function getFile('),
  cut('const enc = s =>', 'function ts()'),
  cut('async function getFileWithSha(', '\n}\n') + '\n}\n',
  cut('function bdApply(', 'async function bdAct('),
].join('\n');
const errs = []; const must = (c, m) => { if (!c) errs.push(m); };
// 偽の GitHub：1つのファイルを sha つきで持ち、古い sha の PUT は 409 を返す
function fakeGitHub(initial) {
  let doc = initial, sha = 'v1', n = 1; const log = [];
  const enc = s => Buffer.from(s, 'utf8').toString('base64');
  const f = async (url, opts = {}) => {
    const m = opts.method || 'GET'; log.push(m);
    const res = (st, body) => ({ status: st, ok: st < 300, json: async () => body, text: async () => JSON.stringify(body) });
    if (m === 'GET') return res(200, { content: enc(JSON.stringify(doc)), sha });
    const b = JSON.parse(opts.body);
    if (b.sha !== sha) return res(409, { message: 'conflict' });
    doc = JSON.parse(Buffer.from(b.content, 'base64').toString('utf8')); sha = 'v' + (++n);
    return res(200, { content: { sha } });
  };
  return { f, get doc() { return doc; }, set doc(d) { doc = d; sha = 'v' + (++n); }, log };
}
const run = async (fetchImpl) => new Function('fetch', 'toast', 'REPO', 'BRANCH', 'pat', `${src}\nreturn { bdApply, bdWrite };`)(fetchImpl, m => errs.push('toast: ' + m), 'x/y', 'main', 't');
const base = { id: 'b1', from: 'megu', title: 't', status: 'open', thread: [{ who: 'megu', at: '2026-11-22T00:00:00Z', text: '質問' }], updated: '2026-11-22T00:00:00Z' };
// 1) 手元は古い（v1）。その間にクロードが返事を書いた（v2）。メグが「完了」→ 返事が残り、完了も載る
{
  const gh = fakeGitHub(JSON.parse(JSON.stringify(base)));
  const local = Object.assign(JSON.parse(JSON.stringify(base)), { __path: 'inbox/board/b1.json', __sha: 'v1' });
  gh.doc = Object.assign(JSON.parse(JSON.stringify(base)), { status: 'open', thread: base.thread.concat({ who: 'claude', at: '2026-11-22T00:01:00Z', text: '先に入った返事' }) });
  const { bdWrite } = await run(gh.f);
  const saved = await bdWrite(local, 'done', '', '2026-11-22T00:02:00Z', 'test');
  const texts = gh.doc.thread.map(t => t.text);
  must(saved, '1) 書けなかった');
  must(texts.includes('先に入った返事'), '1) 先に入ったクロードの返事が消えた');
  must(texts.includes('✅ 完了にした') && gh.doc.status === 'done', '1) 完了が載っていない');
  must(texts.filter(t => t === '✅ 完了にした').length === 1, '1) 完了が2回載った');
  must(saved && saved.__sha === 'v3' && saved.thread.length === 3, '1) 画面の手元の中身が最新になっていない');
}
// 2) ぶつからないときは、読み直さずに1回で書く
{
  const gh = fakeGitHub(JSON.parse(JSON.stringify(base)));
  const local = Object.assign(JSON.parse(JSON.stringify(base)), { __path: 'inbox/board/b1.json', __sha: 'v1' });
  const { bdWrite } = await run(gh.f);
  await bdWrite(local, 'send', '返事です', '2026-11-22T00:02:00Z', 'test');
  must(gh.log.join(',') === 'PUT', '2) 余計な読み直しがある: ' + gh.log.join(','));
  must(gh.doc.status === 'answered' && gh.doc.thread.at(-1).text === '返事です', '2) 返事が載っていない');
  must(!('__sha' in gh.doc) && !('__path' in gh.doc), '2) 画面用の印（__sha 等）が板のJSONに入った');
}
// 3) 「読んだ」は status を done にする
{
  const gh = fakeGitHub(JSON.parse(JSON.stringify(base)));
  const local = Object.assign(JSON.parse(JSON.stringify(base)), { __path: 'inbox/board/b1.json', __sha: 'v1' });
  const { bdWrite } = await run(gh.f);
  await bdWrite(local, 'read', '', '2026-11-22T00:02:00Z', 'test');
  must(gh.doc.status === 'done', '3) 読んだで done にならない');
}
for (const e of errs) console.log('🔴 板:', e);
if (!errs.length) console.log('🟢 板の書き込み（ぶつかっても返事が残る・読んだ）');
process.exit(errs.length ? 1 : 0);
