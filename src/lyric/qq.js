// QQ 音乐歌词匹配：搜索 -> 候选打分 -> 取词 -> 对齐/偏移 -> 接受判定。
// 纯逻辑在 text.js / align.js，本文件只负责 I/O 与 QRC/LRC 解析。

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import {
  baseTitle,
  candidateScore,
  parseDuration,
  splitArtists
} from './text.js';
import { analyzeAlignment, acceptanceScore, applyOffset } from './align.js';

const DEFAULTS = {
  api: process.env.QQMUSIC_API || 'http://127.0.0.1:3030',
  vkeys: process.env.VKEYS_API || 'https://api.vkeys.cn/v2/music/tencent',
  timeout: Number(process.env.QQMUSIC_TIMEOUT || 8000),
  cacheDir: process.env.QQ_LYRIC_CACHE === '0'
    ? null
    : (process.env.QQ_LYRIC_CACHE_DIR || '.lyric-cache'),
  maxFetch: 8,
  debug: process.env.QQ_LYRIC_DEBUG === '1'
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36';
const LRC_LINE = /^\[(\d+):(\d+)(?:[.:](\d+))?\](.*)$/;
const QRC_LINE = /^\[(\d+),(\d+)?\](.*)$/;
const META_LINE = /^\s*\[([a-zA-Z]+)\s*:\s*(.*?)\]\s*$/;

// 本地 API 返回 CRLF，旧的非锚定正则能吃下，锚定后必须先去 \r。
function linesOf(text) {
  return String(text || '').replace(/\r\n?/g, '\n').split('\n');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

async function cached(key, ttlMs, producer, cacheDir) {
  if (!cacheDir) return producer();
  const file = path.join(cacheDir, `${key}.json`);
  try {
    const stat = await fs.promises.stat(file);
    if (Date.now() - stat.mtimeMs < ttlMs) {
      return JSON.parse(await fs.promises.readFile(file, 'utf8'));
    }
  } catch {
    // cache miss
  }
  const value = await producer();
  if (value != null && !(Array.isArray(value) && value.length === 0)) {
    try {
      await fs.promises.mkdir(cacheDir, { recursive: true });
      await fs.promises.writeFile(file, JSON.stringify(value), 'utf8');
    } catch {
      // cache write is best-effort
    }
  }
  return value;
}

async function getJSON(url, config, options = {}) {
  const retries = options.retries ?? 1;
  const timeout = options.timeout ?? DEFAULTS.timeout;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        ...config,
        timeout,
        headers: { 'user-agent': UA, ...(config.headers || {}) },
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404 || status === 410,
        'axios-retry': { retries: 0 }
      });
      if (response.status === 200) return response.data;
      return null; // 404 / 410: 没有歌词，重试没有意义
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      // 本地 API 没启动时 ECONNREFUSED 立刻失败，重试只是浪费时间。
      const retryable = error?.code !== 'ECONNREFUSED' && (!status || status === 429 || status >= 500);
      if (!retryable || attempt === retries) break;
      await delay(300 * (attempt + 1));
    }
  }
  if (DEFAULTS.debug) console.warn(`[qq] request failed: ${url} ${lastError?.message || ''}`);
  return null;
}

function normalizeTrack(row, source) {
  return {
    id: row.id == null ? '' : String(row.id),
    mid: row.mid || row.songmid || '',
    song: row.song || row.title || '',
    singer: row.singer || row.artist || '',
    singerList: Array.isArray(row.singer_list)
      ? row.singer_list.map((item) => item?.name).filter(Boolean)
      : [],
    album: row.album || '',
    duration: parseDuration(row.interval ?? row.duration),
    source
  };
}

function dedupeTracks(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row || row.id == null) continue;
    const key = String(row.id);
    if (!map.has(key)) {
      map.set(key, { ...row });
      continue;
    }
    const kept = map.get(key);
    for (const [field, value] of Object.entries(row)) {
      if (kept[field] == null || kept[field] === '') kept[field] = value;
    }
    if (!String(kept.source).includes(row.source)) kept.source = `${kept.source}+${row.source}`;
  }
  return [...map.values()];
}

function searchKeywords(name, artist) {
  const title = baseTitle(name) || String(name || '').trim();
  const primary = String(artist || '')
    .split('/')[0]
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, ' ')
    .trim();
  const keywords = [primary ? `${title} ${primary}`.trim() : title, title];
  const seen = new Set();
  return keywords.filter((keyword) => {
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validEnvelope(payload, allowEmptyArray = false) {
  if (!payload || typeof payload !== 'object') return false;
  const code = payload.code;
  if (code != null && code !== 0 && code !== 200) return false;
  if (!Array.isArray(payload.data)) return false;
  return allowEmptyArray || payload.data.length > 0;
}

async function searchProvider(provider, keyword, cfg) {
  const local = provider === 'local';
  const url = local ? `${cfg.api}/search` : `${cfg.vkeys}/search/song`;
  const params = local ? { keyword, limit: 20 } : { word: keyword };
  const key = `search-${provider}-${sha1(keyword.toLowerCase())}`;
  const rows = await cached(key, 24 * 3600 * 1000, async () => {
    const payload = await getJSON(url, { params }, { timeout: cfg.timeout });
    return validEnvelope(payload) ? payload.data : null;
  }, cfg.cacheDir);
  return (rows || []).map((row) => ({ ...row, __source: provider }));
}

async function searchTracks(source, cfg) {
  const keywords = searchKeywords(source.title, source.artist);
  if (!keywords.length) return [];

  const localRows = (await Promise.all(
    keywords.map((keyword) => searchProvider('local', keyword, cfg))
  )).flat().map((row) => normalizeTrack(row, 'local'));

  let tracks = dedupeTracks(localRows);
  const bestLocal = tracks.reduce((best, track) => {
    const score = candidateScore(source, track).score;
    return Math.max(best, score);
  }, 0);

  // 本地只有少量结果或没有高置信候选时，才并入 vkeys；否则省一次外部请求。
  if (tracks.length < 5 || bestLocal < 0.85) {
    const remoteRows = (await Promise.all(
      keywords.map((keyword) => searchProvider('vkeys', keyword, cfg))
    )).flat().map((row) => normalizeTrack(row, 'vkeys'));
    tracks = dedupeTracks([...tracks, ...remoteRows]);
  }
  return tracks;
}

function parseLrcLines(text) {
  const lines = [];
  for (const raw of linesOf(text)) {
    const match = raw.match(LRC_LINE);
    if (!match) continue;
    const fraction = match[3] || '';
    const decimal = fraction.length === 1
      ? Number(fraction) / 10
      : fraction.length === 2
        ? Number(fraction) / 100
        : fraction.length === 3
          ? Number(fraction) / 1000
          : 0;
    lines.push({
      time: Number(match[1]) * 60 + Number(match[2]) + decimal,
      text: match[4]
    });
  }
  return lines;
}

function parseQrcLines(text) {
  const lines = [];
  for (const raw of linesOf(text)) {
    const match = raw.match(QRC_LINE);
    if (!match) continue;
    lines.push({
      time: Number(match[1]) / 1000,
      text: match[3].replace(/\(\d+,\d+\)/g, '')
    });
  }
  return lines;
}

function parseAuxText(text) {
  if (!text) return [];
  return /\[\d+,\d+\]/.test(text) ? parseQrcLines(text) : parseLrcLines(text);
}

function cleanAux(text) {
  return String(text || '').replace(/\/\//g, '').trim();
}

// 翻译/罗马音与正文的配对：保序，允许同一辅助行覆盖多行原文（合唱常见）。
function pairAux(aux, targets, tolerance = 3) {
  const out = new Array(targets.length).fill('');
  let j = 0;
  for (let i = 0; i < targets.length; i++) {
    const time = targets[i].time;
    while (j < aux.length && aux[j].time < time - tolerance) j++;
    let best = -1;
    let bestDistance = tolerance;
    for (let k = j; k < aux.length && aux[k].time <= time + tolerance; k++) {
      const distance = Math.abs(aux[k].time - time);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k;
      }
    }
    if (best >= 0) {
      out[i] = cleanAux(aux[best].text);
      j = best;
    }
  }
  return out;
}

function parseLyrics(orig, kind) {
  const lyrics = [];
  for (const raw of linesOf(orig)) {
    const meta = raw.match(META_LINE);
    if (meta) continue; // 元数据单独解析，[kana:] 不进入业务字段

    if (kind === 'lrc') {
      const match = raw.match(LRC_LINE);
      if (!match) continue;
      const fraction = match[3] || '';
      const decimal = fraction.length === 1
        ? Number(fraction) / 10
        : fraction.length === 2
          ? Number(fraction) / 100
          : fraction.length === 3
            ? Number(fraction) / 1000
            : 0;
      lyrics.push({
        time: Number(match[1]) * 60 + Number(match[2]) + decimal,
        text: match[4],
        etext: []
      });
      continue;
    }

    const match = raw.match(QRC_LINE);
    if (!match) continue;
    const time = Number(match[1]) / 1000;
    const body = match[3];
    const etext = [];
    const wordRegex = /(.*?)\((\d+),(\d+)\)/g;
    let word;
    while ((word = wordRegex.exec(body)) !== null) {
      const text = word[1].replace(/ /g, '&nbsp;');
      if (!text) continue;
      const start = Number(word[2]) / 1000;
      const duration = Number(word[3]) / 1000;
      etext.push({
        Duration: duration,
        start,
        end: (Math.round(start * 1000) + Math.round(duration * 1000)) / 1000,
        text
      });
    }
    lyrics.push({
      time,
      text: body.replace(/\(\d+,\d+\)/g, ''),
      etext
    });
  }
  return lyrics;
}

function parseMetadata(orig) {
  const metadata = {};
  for (const raw of linesOf(orig)) {
    const match = raw.match(META_LINE);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (['ti', 'ar', 'al', 'by'].includes(key)) metadata[key] = match[2].trim();
  }
  return metadata;
}

export function QrcToJson(payload, id) {
  const qrcText = payload?.yrc || '';
  const lrcText = payload?.lrc || '';

  let source = qrcText;
  let kind = 'qrc';
  let lyrics = parseLyrics(qrcText, 'qrc');
  if (!lyrics.length && lrcText) {
    source = lrcText;
    kind = 'lrc';
    lyrics = parseLyrics(lrcText, 'lrc');
  }

  const trans = pairAux(parseAuxText(payload?.trans), lyrics);
  const roma = pairAux(parseAuxText(payload?.roma), lyrics);
  for (let i = 0; i < lyrics.length; i++) {
    lyrics[i].pairlyric = trans[i];
    lyrics[i].romanizationslyric = roma[i];
  }

  const zq = lyrics.some((line) => line.etext.length > 0);
  return {
    metadata: {
      ...parseMetadata(source),
      m: 2,
      zq,
      wordTiming: zq,
      nolyric: lyrics.length === 0,
      pair: trans.some(Boolean),
      roma: roma.some(Boolean),
      qqmusicid: id,
      qqsource: kind
    },
    lyrics
  };
}

function validLyricPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const code = payload.code;
  if (code != null && code !== 0 && code !== 200) return false;
  const data = payload.data;
  return Boolean(data && typeof data === 'object' && (data.yrc || data.lrc));
}

async function fetchLyricPayload(track, cfg) {
  const localParams = { qrc: 1, trans: 1, roma: 1 };
  if (track.mid) localParams.mid = track.mid;
  if (track.id) localParams.id = track.id;

  const local = await cached(
    `lyric-local-${sha1(track.mid || track.id)}`,
    30 * 24 * 3600 * 1000,
    async () => {
      const payload = await getJSON(`${cfg.api}/lyric`, { params: localParams }, { timeout: cfg.timeout });
      return validLyricPayload(payload) ? payload : null;
    },
    cfg.cacheDir
  );
  if (local?.data && (local.data.yrc || local.data.lrc)) {
    return { provider: 'local', data: local.data };
  }

  const remote = await cached(
    `lyric-vkeys-${sha1(track.id)}`,
    30 * 24 * 3600 * 1000,
    async () => {
      const payload = await getJSON(`${cfg.vkeys}/lyric`, { params: { id: track.id } }, { timeout: cfg.timeout });
      return validLyricPayload(payload) ? payload : null;
    },
    cfg.cacheDir
  );
  if (remote?.data && (remote.data.yrc || remote.data.lrc)) {
    return { provider: 'vkeys', data: remote.data };
  }
  return null;
}

function sourceOf(name, artist, album, yrcjson) {
  return {
    title: name || '',
    artist: artist || '',
    artists: splitArtists(artist),
    album: album || '',
    duration: Number(yrcjson?.metadata?.duration) || 0
  };
}

function referenceLines(yrcjson) {
  return (yrcjson?.lyrics || []).filter((line) =>
    line && typeof line.text === 'string' && line.text.trim().length > 0
  );
}

function compactCandidates(scored, debug) {
  const list = debug ? scored : scored.slice(0, 4);
  return list.map((item) => ({
    id: item.track.id,
    song: item.track.song,
    singer: item.track.singer,
    album: item.track.album,
    source: item.track.source,
    score: Number(item.score.toFixed(3)),
    title: Number(item.title.toFixed(3)),
    artists: Number(item.artists.toFixed(3)),
    durationSim: Number(item.durationScore?.toFixed?.(3) ?? 0),
    accepted: !!item.accepted,
    reason: item.failure || '',
    ratio: item.analysis ? Number(item.analysis.ratio.toFixed(3)) : null,
    coverage: item.analysis ? Number(item.analysis.coverage.toFixed(3)) : null,
    candCoverage: item.analysis ? Number(item.analysis.candCoverage.toFixed(3)) : null,
    sync: item.analysis ? Number(item.analysis.sync.toFixed(3)) : null,
    meanSim: item.analysis ? Number(item.analysis.meanSim.toFixed(3)) : null,
    offset: item.analysis ? item.analysis.offset : null
  }));
}

async function mapLimit(items, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      await worker(item, index);
    }
  });
  await Promise.all(runners);
}

export async function QQJsonGET(name, artist, album, yrcjson, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const source = sourceOf(name, artist, album, yrcjson);
  const refLines = referenceLines(yrcjson);
  if (refLines.length < 3) {
    return {
      metadata: {
        zq: false,
        accepted: false,
        message: '参考歌词不足，跳过匹配',
        candidates: []
      }
    };
  }
  const tracks = await searchTracks(source, cfg);

  if (!tracks.length) {
    return {
      metadata: {
        zq: false, accepted: false, message: 'NSA  .', candidates: []
      }
    };
  }

  const scored = tracks
    .map((track) => {
      const result = candidateScore(source, track);
      return {
        track,
        ...result,
        durationScore: result.duration,
        accepted: false,
        failure: ''
      };
    })
    .sort((a, b) => b.score - a.score);

  const passing = scored.filter((item) => item.title >= 0.55 && item.score >= 0.55);
  const toTry = (passing.length ? passing : scored.slice(0, 3)).slice(0, cfg.maxFetch);

  let best = null;

  await mapLimit(toTry, 3, async (candidate) => {
    if (best && best.analysis.coverage >= 0.9 && best.analysis.sync >= 0.8 && best.accept.score >= 0.9) {
      return;
    }

    const payload = await fetchLyricPayload(candidate.track, cfg);
    if (!payload) {
      candidate.failure = 'no-lyric';
      return;
    }

    const json = QrcToJson(payload.data, candidate.track.id);
    if (!json.lyrics.length) {
      candidate.failure = 'empty-lyric';
      return;
    }

    const analysis = analyzeAlignment(refLines, json.lyrics);
    const accept = acceptanceScore({
      coverage: analysis.coverage,
      candCoverage: analysis.candCoverage,
      meanSim: analysis.meanSim,
      sync: analysis.sync,
      candidateScore: candidate.score,
      wordTimed: json.metadata.zq
    });

    candidate.provider = payload.provider;
    candidate.analysis = analysis;
    candidate.accept = accept;
    candidate.lyric = json;
    candidate.accepted = accept.accepted;

    if (!accept.accepted) {
      candidate.failure = `align cov=${analysis.coverage.toFixed(2)} sync=${analysis.sync.toFixed(2)}`;
      return;
    }

    if (!best || accept.score > best.accept.score ||
        (accept.score === best.accept.score && json.metadata.zq && !best.lyric.metadata.zq)) {
      best = candidate;
    }
  });

  if (!best) {
    const top = scored[0];
    return {
      metadata: {
        zq: false,
        accepted: false,
        message: `未找到可用歌词（最佳候选 ${top ? top.score.toFixed(2) : '0.00'}）`,
        candidates: compactCandidates(scored, cfg.debug)
      }
    };
  }

  const result = applyOffset(best.lyric, best.analysis.offset);
  result.metadata = {
    ...result.metadata,
    accepted: true,
    qqmusicid: best.track.id,
    qqmid: best.track.mid,
    provider: best.provider,
    offset: best.analysis.offset,
    align: {
      pairs: best.analysis.pairs,
      ratio: Number(best.analysis.ratio.toFixed(3)),
      coverage: Number(best.analysis.coverage.toFixed(3)),
      candCoverage: Number(best.analysis.candCoverage.toFixed(3)),
      sync: Number(best.analysis.sync.toFixed(3)),
      meanSim: Number(best.analysis.meanSim.toFixed(3)),
      residualMedian: best.analysis.residualMedian,
      residualP90: best.analysis.residualP90,
      anchors: best.analysis.anchors
    },
    matchScore: best.accept.score,
    candidates: compactCandidates(scored, cfg.debug)
  };

  if (cfg.debug || best.accept.score < 0.75) {
    console.log(`[qq] ${name} -> ${best.track.id} ${best.track.song} | score=${best.accept.score.toFixed(2)} offset=${best.analysis.offset}s cov=${best.analysis.coverage.toFixed(2)} sync=${best.analysis.sync.toFixed(2)} provider=${best.provider}`);
  }

  return result;
}
