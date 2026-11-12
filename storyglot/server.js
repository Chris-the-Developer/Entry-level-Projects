'use strict';
/*
 * Storyglot server — no dependencies, Node 18+.
 *
 * Serves the app, keeps the AI and voice keys on the server, saves progress,
 * and fetches YouTube transcripts. Configure with environment variables
 * (on Azure: App Service → Settings → Environment variables):
 *
 *   APP_PASSWORD          password the tablet must enter (required when hosted)
 *   DEEPSEEK_API_KEY      enables stories, tutor, explanations and AI translation
 *   AZURE_SPEECH_KEY      enables Azure neural voices
 *   AZURE_SPEECH_REGION   e.g. westeurope
 *   DEEPSEEK_URL, DEEPSEEK_MODEL, DATA_DIR, PORT   optional overrides
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, 'www');
const HOSTED = !!process.env.WEBSITE_SITE_NAME;                       // set by Azure App Service
const DATA = process.env.DATA_DIR || (HOSTED ? '/home/storyglot-data' : path.join(__dirname, 'data'));   // /home persists on App Service
const PW = process.env.APP_PASSWORD || '';
const DS_KEY = process.env.DEEPSEEK_API_KEY || '';
const DS_URL = (process.env.DEEPSEEK_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DS_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const AZ_KEY = process.env.AZURE_SPEECH_KEY || '';
const AZ_REGION = (process.env.AZURE_SPEECH_REGION || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const AZ_URL = (process.env.AZURE_SPEECH_URL || `https://${AZ_REGION}.tts.speech.microsoft.com/cognitiveservices`).replace(/\/+$/, '');
const LOCKED = HOSTED && !PW;                                         // never expose paid keys on the internet without a password

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'], '/capacitor.js': ['capacitor.js', 'text/javascript; charset=utf-8'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'], '/icon-192.png': ['icon-192.png', 'image/png'], '/icon-512.png': ['icon-512.png', 'image/png']
};

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, {'Content-Type': type, 'Content-Length': buf.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra});
  res.end(buf);
};
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const readJson = async (req, limit) => { try { return JSON.parse((await readBody(req, limit)).toString('utf8') || '{}'); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'Invalid JSON'); } };

/* ---------- password check with lock-out ---------- */
const fails = new Map();
const hash = s => crypto.createHash('sha256').update(String(s)).digest();
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().replace(/:\d+$/, '');
function checkAuth(req) {
  if (LOCKED) throw new HttpError(503, 'Set APP_PASSWORD in the server settings to use this app.');
  if (!PW) return;                                                    // running on your own computer
  const ip = clientIp(req), f = fails.get(ip);
  if (f && f.until > Date.now()) throw new HttpError(429, 'Too many wrong passwords. Try again in 15 minutes.');
  if (crypto.timingSafeEqual(hash(req.headers['x-app-password'] || ''), hash(PW))) { fails.delete(ip); return; }
  const n = (f ? f.n : 0) + 1;
  fails.set(ip, {n, until: n >= 10 ? Date.now() + 15 * 60e3 : 0});
  if (fails.size > 5000) fails.clear();
  throw new HttpError(401, 'Wrong password');
}

/* ---------- progress storage: one JSON file, revisioned, with daily backups ---------- */
const stateFile = path.join(DATA, 'state.json');
let writing = Promise.resolve();
function loadState() { try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) { return {rev: 0, state: null}; } }
function saveState(baseRev, state) {
  const run = async () => {
    const cur = loadState();
    if (cur.rev !== baseRev) return {conflict: cur};
    fs.mkdirSync(DATA, {recursive: true});
    const day = new Date().toISOString().slice(0, 10), backup = path.join(DATA, `backup-${day}.json`);
    if (cur.state && !fs.existsSync(backup)) {
      fs.copyFileSync(stateFile, backup);
      fs.readdirSync(DATA).filter(f => /^backup-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().slice(0, -7).forEach(f => fs.unlinkSync(path.join(DATA, f)));
    }
    const next = {rev: cur.rev + 1, saved: new Date().toISOString(), state}, tmp = stateFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next));
    fs.renameSync(tmp, stateFile);
    return {rev: next.rev};
  };
  return (writing = writing.then(run, run));
}

/* ---------- AI relay ---------- */
async function aiRelay(body) {
  if (!DS_KEY) throw new HttpError(503, 'DEEPSEEK_API_KEY is not set on the server.');
  if (!Array.isArray(body.messages) || !body.messages.length) throw new HttpError(400, 'messages required');
  const payload = {model: DS_MODEL, messages: body.messages.map(m => ({role: String(m.role), content: String(m.content)})),
    temperature: Number(body.temperature) || 1, max_tokens: Math.min(Number(body.max_tokens) || 2000, 8000)};
  if (body.response_format && body.response_format.type === 'json_object') payload.response_format = {type: 'json_object'};
  let r;
  try { r = await fetch(DS_URL + '/chat/completions', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + DS_KEY}, body: JSON.stringify(payload), signal: AbortSignal.timeout(120e3)}); }
  catch (e) { throw new HttpError(502, 'The server could not reach the AI service.'); }
  const text = await r.text();
  // never pass an upstream 401 through: the app would mistake it for a wrong app password
  return {status: r.status === 401 ? 502 : r.status, text: r.status === 401 ? JSON.stringify({error: {message: 'The server\'s DeepSeek key was rejected.'}}) : text};
}

/* ---------- Azure voices ---------- */
let voiceCache = null, voiceAt = 0;
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));
function needAzure() { if (!AZ_KEY || !AZ_REGION) throw new HttpError(503, 'AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set on the server.'); }
async function azVoices() {
  needAzure();
  if (voiceCache && Date.now() - voiceAt < 864e5) return voiceCache;
  let r;
  try { r = await fetch(AZ_URL + '/voices/list', {headers: {'Ocp-Apim-Subscription-Key': AZ_KEY}, signal: AbortSignal.timeout(30e3)}); }
  catch (e) { throw new HttpError(502, 'The server could not reach Azure Speech.'); }
  if (!r.ok) throw new HttpError(502, r.status === 401 || r.status === 403 ? 'Azure rejected the server\'s Speech key or region.' : 'Azure Speech error ' + r.status + '.');
  voiceCache = (await r.json()).map(v => ({ShortName: v.ShortName, Locale: v.Locale, LocalName: v.LocalName, DisplayName: v.DisplayName, Gender: v.Gender}));
  voiceAt = Date.now();
  return voiceCache;
}
async function azSpeak(body) {
  needAzure();
  const text = String(body.text || '').slice(0, 3000), voice = String(body.voice || ''), locale = String(body.locale || '');
  if (!text.trim() || !/^[\w-]{3,80}$/.test(voice) || !/^[\w-]{2,20}$/.test(locale)) throw new HttpError(400, 'text, voice and locale required');
  let r;
  try {
    r = await fetch(AZ_URL + '/v1', {method: 'POST', signal: AbortSignal.timeout(60e3),
      headers: {'Ocp-Apim-Subscription-Key': AZ_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'storyglot'},
      body: `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}">${xml(text)}</voice></speak>`});
  } catch (e) { throw new HttpError(502, 'The server could not reach Azure Speech.'); }
  if (!r.ok) throw new HttpError(502, r.status === 401 || r.status === 403 ? 'Azure rejected the server\'s Speech key or region.' : r.status === 429 ? 'Azure Speech quota reached.' : 'Azure Speech error ' + r.status + '.');
  return Buffer.from(await r.arrayBuffer());
}

/* ---------- YouTube transcripts (best effort: YouTube changes this and may refuse cloud servers) ---------- */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const unent = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function parseCaptions(raw) {
  const clean = s => unent(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  let cues = [];
  try {
    cues = JSON.parse(raw).events.filter(e => e.segs).map(e => ({t: (e.tStartMs || 0) / 1000, text: e.segs.map(s => s.utf8 || '').join('').replace(/\s+/g, ' ').trim()}));
  } catch (e) {
    for (const m of raw.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)) cues.push({t: +m[1], text: clean(unent(m[2]))});
    if (!cues.length) for (const m of raw.matchAll(/<p t="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)) cues.push({t: +m[1] / 1000, text: clean(m[2])});
  }
  return cues.filter(c => c.text);
}
async function ytTranscript(id, lang) {
  if (!/^[\w-]{11}$/.test(id)) throw new HttpError(400, 'Bad video id');
  const fail = () => new HttpError(502, 'YouTube did not hand over the transcript (it often refuses cloud servers). Paste the transcript instead.');
  let page;
  try { page = await (await fetch('https://www.youtube.com/watch?v=' + id, {headers: {'User-Agent': UA, 'Accept-Language': 'en', Cookie: 'CONSENT=YES+1; SOCS=CAI'}, signal: AbortSignal.timeout(20e3)})).text(); }
  catch (e) { throw fail(); }
  const key = (page.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1];
  let tracks = null, title = '';
  if (key) {
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {method: 'POST', signal: AbortSignal.timeout(20e3),
        headers: {'Content-Type': 'application/json', 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)'},
        body: JSON.stringify({context: {client: {clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34}}, videoId: id})});
      const j = await r.json();
      tracks = j.captions && j.captions.playerCaptionsTracklistRenderer && j.captions.playerCaptionsTracklistRenderer.captionTracks;
      title = (j.videoDetails && j.videoDetails.title) || '';
    } catch (e) { /* fall through to the page data */ }
  }
  if (!tracks) { const m = page.match(/"captionTracks":(\[.*?\])/); if (m) try { tracks = JSON.parse(m[1]); } catch (e) {} }
  if (!title) title = unent((page.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]).replace(/ - YouTube$/, '').trim();
  if (!tracks || !tracks.length) {
    if (/captcha|not a bot|unusual traffic/i.test(page)) throw fail();
    throw new HttpError(404, 'This video has no captions, or YouTube did not show them to the server. Paste the transcript instead.');
  }
  const score = t => (String(t.languageCode || '').toLowerCase().startsWith(lang) ? 2 : 0) + (t.kind === 'asr' ? 0 : 1);
  const t = tracks.slice().sort((a, b) => score(b) - score(a))[0];
  let raw;
  try { raw = await (await fetch(String(t.baseUrl).replace(/&fmt=[^&]*/, '') + '&fmt=json3', {headers: {'User-Agent': UA}, signal: AbortSignal.timeout(20e3)})).text(); }
  catch (e) { throw fail(); }
  const cues = parseCaptions(raw);
  if (!cues.length) throw fail();
  return {title, lang: t.languageCode || '', auto: t.kind === 'asr', cues};
}

/* ---------- routing ---------- */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  if (!p.startsWith('/api/')) {
    const f = STATIC[p];
    if (!f || (req.method !== 'GET' && req.method !== 'HEAD')) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, fs.readFileSync(path.join(ROOT, f[0])), f[1], {'Cache-Control': 'no-cache'});
  }
  if (p === '/api/config' && req.method === 'GET')
    return send(res, 200, {server: true, needPassword: !!PW, locked: LOCKED, ai: !!DS_KEY, azure: !!(AZ_KEY && AZ_REGION)});
  checkAuth(req);
  if (p === '/api/login' && req.method === 'POST') return send(res, 200, {ok: true});
  if (p === '/api/state' && req.method === 'GET') return send(res, 200, loadState());
  if (p === '/api/state' && req.method === 'PUT') {
    const b = await readJson(req, 40e6);
    if (!b.state || typeof b.state !== 'object') throw new HttpError(400, 'state required');
    const out = await saveState(Number(b.baseRev) || 0, b.state);
    return out.conflict ? send(res, 409, out.conflict) : send(res, 200, out);
  }
  if (p === '/api/ai' && req.method === 'POST') { const out = await aiRelay(await readJson(req, 500e3)); return send(res, out.status, out.text); }
  if (p === '/api/tts/voices' && req.method === 'GET') return send(res, 200, await azVoices());
  if (p === '/api/tts' && req.method === 'POST') return send(res, 200, await azSpeak(await readJson(req, 50e3)), 'audio/mpeg');
  if (p === '/api/youtube' && req.method === 'GET') return send(res, 200, await ytTranscript(url.searchParams.get('id') || '', (url.searchParams.get('lang') || '').toLowerCase().slice(0, 5)));
  throw new HttpError(404, 'Not found');
}
http.createServer((req, res) => {
  handle(req, res).catch(e => {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, {error: e instanceof HttpError ? e.message : 'Server error'});
  });
}).listen(PORT, () => {
  console.log(`Storyglot is running on port ${PORT}`);
  console.log(`  progress is stored in ${DATA}`);
  console.log(`  AI: ${DS_KEY ? 'on' : 'off (set DEEPSEEK_API_KEY)'} · Azure voices: ${AZ_KEY && AZ_REGION ? 'on' : 'off (set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION)'}`);
  console.log(LOCKED ? '  LOCKED: set APP_PASSWORD to use the app' : PW ? '  password protection: on' : '  password protection: off (fine on your own network; set APP_PASSWORD before putting this online)');
});
