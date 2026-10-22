// 参考时间轴（网易云）与候选歌词（QQ）的对齐：
// 1) 用高文本相似度锚点估计整体偏移（直方图主簇，抗副歌重复）
// 2) 按偏移做保序配对，避免重复行被复用
// 3) 用配对率/平均相似度/残差决定是否接受

import { normalizeText, gramMap, diceMaps } from './text.js';

const BIN = 0.2;          // 偏移直方图粒度（秒）
const CLUSTER_TOL = 1.5;  // 主簇宽度（秒）
const PAIR_TOL = 2.5;     // 配对时允许的时间误差（秒）
const MIN_LINE_SIM = 0.5; // 行配对的最低文本相似度

function prepare(lines) {
  const prepared = [];
  for (const line of lines || []) {
    if (!line || typeof line.text !== 'string') continue;
    const norm = normalizeText(line.text);
    if (!norm) continue;
    prepared.push({
      time: Number(line.time) || 0,
      text: line.text,
      norm,
      grams: gramMap(norm, 2),
      anchor: norm.length >= 2
    });
  }
  return prepared;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function offsetHypotheses(ref, cand) {
  const deltas = [];
  for (const r of ref) {
    if (!r.anchor) continue;
    let bestSim = 0;
    const sims = new Array(cand.length);
    for (let j = 0; j < cand.length; j++) {
      const sim = diceMaps(r.grams, cand[j].grams);
      sims[j] = sim;
      if (sim > bestSim) bestSim = sim;
    }
    if (bestSim < 0.6) continue;
    // 重复副歌会让同一句在多个位置同分；全部投票，避免“只取最早一次”造成整段偏移。
    for (let j = 0; j < cand.length; j++) {
      if (sims[j] >= bestSim - 1e-6) deltas.push(r.time - cand[j].time);
    }
  }

  if (deltas.length < 3) return { offsets: [0], anchors: deltas.length, reliable: false };

  const bins = new Map();
  for (const delta of deltas) {
    const key = Math.round(delta / BIN);
    const bin = bins.get(key) || { count: 0, sum: 0 };
    bin.count++;
    bin.sum += delta;
    bins.set(key, bin);
  }

  const ranked = [...bins.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  const offsets = [];
  for (const [key] of ranked) {
    let count = 0;
    let sum = 0;
    for (const [binKey, bin] of bins) {
      if (Math.abs((binKey - key) * BIN) <= CLUSTER_TOL) {
        count += bin.count;
        sum += bin.sum;
      }
    }
    const offset = sum / count;
    if (!offsets.some((value) => Math.abs(value - offset) < 0.5)) offsets.push(offset);
  }

  // 0 作为兜底：没有可靠偏移时仍有机会按原时间轴配对。
  if (!offsets.some((value) => Math.abs(value) < 0.5)) offsets.push(0);
  return { offsets, anchors: deltas.length, reliable: true };
}

function pairLines(ref, cand, offset) {
  const pairs = [];
  let j = 0;
  for (const r of ref) {
    while (j < cand.length && cand[j].time + offset < r.time - PAIR_TOL) j++;
    let best = -1;
    let bestSim = 0;
    for (let k = j; k < cand.length && cand[k].time + offset <= r.time + PAIR_TOL; k++) {
      const sim = diceMaps(r.grams, cand[k].grams);
      if (sim > bestSim) {
        bestSim = sim;
        best = k;
      }
    }
    if (best >= 0 && bestSim >= MIN_LINE_SIM) {
      pairs.push({ ref: r, cand: cand[best], sim: bestSim });
      j = best + 1;   // 单调、不复用同一行
    }
  }
  return pairs;
}

export function analyzeAlignment(refLines, candLines) {
  const ref = prepare(refLines);
  const cand = prepare(candLines);

  if (ref.length < 3 || cand.length < 3) {
    return {
      offset: 0, pairs: 0, ratio: 0, meanSim: 0,
      anchors: 0, reliable: false, residualMedian: 0, residualP90: 0
    };
  }

  const hypotheses = offsetHypotheses(ref, cand);
  let best = null;
  for (const coarse of hypotheses.offsets) {
    let offset = coarse;
    let pairs = pairLines(ref, cand, offset);

    // 用配对残差的中位数精修一次，但只在离粗估不超过 3s 时采纳，防止跳到别的副歌。
    if (pairs.length >= 3) {
      const refined = median(pairs.map((pair) => pair.ref.time - pair.cand.time));
      if (Math.abs(refined - offset) <= 3) {
        offset = refined;
        pairs = pairLines(ref, cand, offset);
      }
    }

    const mean = pairs.length
      ? pairs.reduce((sum, pair) => sum + pair.sim, 0) / pairs.length
      : 0;
    const quality = pairs.length * mean;
    if (!best || quality > best.quality) best = { offset, pairs, mean, quality };
  }

  const offset = best.offset;
  const pairs = best.pairs;
  const meanSim = best.mean;

  // 参考歌词是“实际音频”的锚点：覆盖率以参考行数为分母；
  // 同时记录候选自身覆盖率，防止用大量注释行稀释比例。
  const coverage = pairs.length / Math.max(1, ref.length);
  const candCoverage = pairs.length / Math.max(1, cand.length);
  const residuals = pairs
    .map((pair) => Math.abs(pair.cand.time + offset - pair.ref.time))
    .sort((a, b) => a - b);
  const residualMedian = residuals.length ? median(residuals) : 0;
  const p90 = residuals.length
    ? residuals[Math.min(residuals.length - 1, Math.floor(residuals.length * 0.9))]
    : 0;
  const sync = Math.max(0, Math.min(1, 1 - residualMedian / 0.5));

  return {
    offset: Number(offset.toFixed(3)),
    pairs: pairs.length,
    ratio: Math.min(coverage, candCoverage),
    coverage,
    candCoverage,
    sync,
    meanSim,
    anchors: hypotheses.anchors,
    reliable: hypotheses.reliable,
    residualMedian: Number(residualMedian.toFixed(3)),
    residualP90: Number(p90.toFixed(3))
  };
}

export function acceptanceScore({
  coverage = 0,
  candCoverage = 0,
  meanSim = 0,
  sync = 0,
  candidateScore = 0,
  wordTimed = false
}) {
  const score = 0.40 * coverage * meanSim + 0.35 * candidateScore + 0.25 * sync + (wordTimed ? 0.03 : 0);
  return {
    score: Number(Math.min(1, score).toFixed(4)),
    accepted: coverage >= 0.55 && candCoverage >= 0.35 && meanSim >= 0.55 && sync >= 0.3 && score >= 0.6
  };
}

export function applyOffset(json, offset) {
  if (!Number.isFinite(offset) || Math.abs(offset) < 0.05) return json;
  const ms = Math.round(offset * 1000);
  for (const line of json.lyrics) {
    line.time = Math.max(0, (Math.round(line.time * 1000) + ms) / 1000);
    for (const word of line.etext || []) {
      word.start = Math.max(0, (Math.round(word.start * 1000) + ms) / 1000);
      word.end = Math.max(0, (Math.round(word.end * 1000) + ms) / 1000);
    }
  }
  json.metadata.offset = ms / 1000;
  return json;
}
