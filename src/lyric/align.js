// 参考时间轴（网易云）与候选歌词（QQ）的对齐：
// 1) 用词级/行级锚点估计时间映射（仿射，抗不同剪辑与副歌重复）
// 2) 按映射做保序配对，词级锚点允许一行 QQ 歌词覆盖多行参考歌词
// 3) 用配对率/平均相似度/残差决定是否接受，并把映射应用到输出时间轴

import { lyricSkeleton, gramMap, diceMaps } from './text.js';

const PAIR_TOL = 2.5;     // 配对时允许的时间误差（秒）
const MIN_LINE_SIM = 0.5; // 行配对的最低文本相似度
const MAX_SCALE = 0.05;   // 允许的时间轴伸缩上限（±5%）

function prepare(lines) {
  const prepared = [];
  for (const line of lines || []) {
    if (!line || typeof line.text !== 'string') continue;
    const norm = lyricSkeleton(line.text);
    if (!norm) continue;

    const words = [];
    if (Array.isArray(line.etext)) {
      for (const word of line.etext) {
        if (!word || typeof word.text !== 'string') continue;
        const wnorm = lyricSkeleton(word.text.replace(/&nbsp;/g, ' '));
        if (!wnorm) continue;
        const start = Number(word.start) || 0;
        const end = Number.isFinite(Number(word.end))
          ? Number(word.end)
          : start + (Number(word.Duration) || 0);
        words.push({ start, end, norm: wnorm });
      }
    }

    // 词级锚点要求词文本能还原整行，否则退回行级锚点。
    let wordMap = null;
    if (words.length) {
      const joined = words.map((word) => word.norm).join('');
      if (joined === norm) {
        wordMap = [];
        let at = 0;
        for (const word of words) {
          wordMap.push({ at, word });
          at += word.norm.length;
        }
      }
    }

    prepared.push({
      index: prepared.length,
      time: Number(line.time) || 0,
      text: line.text,
      norm,
      grams: gramMap(norm, 2),
      words,
      wordMap,
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

function diceStrings(a, b) {
  return diceMaps(gramMap(a, 2), gramMap(b, 2));
}

// 一句参考歌词在候选行中的位置：优先整句命中，其次用连续词窗口模糊匹配。
function findWordAnchor(refLine, candLine) {
  if (candLine.wordMap && candLine.wordMap.length) {
    const hit = candLine.norm.indexOf(refLine.norm);
    if (hit >= 0) {
      let entry = candLine.wordMap[0];
      for (const item of candLine.wordMap) {
        if (item.at <= hit) entry = item;
        else break;
      }
      return { time: entry.word.start, sim: 1, exact: true };
    }

    let best = null;
    for (let i = 0; i < candLine.words.length; i++) {
      let text = '';
      for (let j = i; j < candLine.words.length && text.length < refLine.norm.length + 8; j++) {
        text += candLine.words[j].norm;
        const sim = diceStrings(text, refLine.norm);
        if (!best || sim > best.sim) best = { time: candLine.words[i].start, sim };
      }
    }
    if (best && best.sim >= 0.8) return { ...best, exact: false };
  }

  const lineSim = diceMaps(refLine.grams, candLine.grams);
  if (lineSim >= 0.6) return { time: candLine.time, sim: lineSim, exact: false, line: true };
  return null;
}

function collectAnchors(ref, cand) {
  const anchors = [];
  for (const r of ref) {
    if (!r.anchor) continue;
    let best = null;
    for (const c of cand) {
      const match = findWordAnchor(r, c);
      if (!match) continue;
      const distance = Math.abs(c.time - r.time);
      if (!best ||
          match.sim > best.sim + 1e-9 ||
          (Math.abs(match.sim - best.sim) < 1e-9 && distance < best.distance)) {
        best = { ...match, candIndex: c.index, distance };
      }
    }
    if (best) {
      anchors.push({
        q: best.time,
        r: r.time,
        sim: best.sim,
        exact: best.exact,
        candIndex: best.candIndex,
        refIndex: r.index
      });
    }
  }
  return anchors;
}

// 拟合 ref = a * qq + b：Theil-Sen 抗离群，随后用内点最小二乘精修。
function estimateMapping(anchors) {
  if (!anchors.length) return { a: 1, b: 0, anchors: 0, reliable: false, first: null };
  if (anchors.length < 3) {
    return {
      a: 1,
      b: Number(median(anchors.map((x) => x.r - x.q)).toFixed(3)),
      anchors: anchors.length,
      reliable: false,
      first: Math.min(...anchors.map((x) => x.q))
    };
  }

  const exact = anchors.filter((x) => x.exact && x.sim >= 0.99);
  const base = exact.length >= 4 ? exact : anchors;

  const slopes = [];
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      const dq = base[j].q - base[i].q;
      if (Math.abs(dq) >= 8) slopes.push((base[j].r - base[i].r) / dq);
    }
  }

  let a = slopes.length ? median(slopes) : 1;
  a = Math.max(1 - MAX_SCALE, Math.min(1 + MAX_SCALE, a));
  let b = median(base.map((x) => x.r - a * x.q));

  const inliers = base.filter((x) => Math.abs(x.r - (a * x.q + b)) <= 1);
  if (inliers.length >= 4) {
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (const p of inliers) {
      sx += p.q;
      sy += p.r;
      sxx += p.q * p.q;
      sxy += p.q * p.r;
    }
    const n = inliers.length;
    const den = n * sxx - sx * sx;
    if (Math.abs(den) > 1e-9) {
      const na = (n * sxy - sx * sy) / den;
      const nb = (sy - na * sx) / n;
      if (na >= 1 - MAX_SCALE && na <= 1 + MAX_SCALE) {
        a = na;
        b = nb;
      }
    }
  }

  return {
    a: Number(a.toFixed(6)),
    b: Number(b.toFixed(3)),
    anchors: anchors.length,
    reliable: true,
    first: Math.min(...anchors.map((x) => x.q)),
    last: Math.max(...anchors.map((x) => x.q))
  };
}

function pairLines(ref, cand, mapping) {
  const a = mapping?.a ?? 1;
  const b = mapping?.b ?? 0;
  const pairs = [];
  let j = 0;
  for (const r of ref) {
    while (j < cand.length && a * cand[j].time + b < r.time - PAIR_TOL) j++;
    let best = -1;
    let bestSim = 0;
    for (let k = j; k < cand.length && a * cand[k].time + b <= r.time + PAIR_TOL; k++) {
      const sim = diceMaps(r.grams, cand[k].grams);
      if (sim > bestSim) {
        bestSim = sim;
        best = k;
      }
    }
    if (best >= 0 && bestSim >= MIN_LINE_SIM) {
      pairs.push({ ref: r, cand: cand[best], sim: bestSim });
      j = best + 1; // 单调、不复用同一行
    }
  }
  return pairs;
}

export function analyzeAlignment(refLines, candLines) {
  const ref = prepare(refLines);
  const cand = prepare(candLines);

  if (ref.length < 3 || cand.length < 3) {
    return {
      offset: 0,
      mapping: { a: 1, b: 0, anchors: 0, reliable: false },
      pairs: 0, ratio: 0, coverage: 0, candCoverage: 0,
      meanSim: 0, anchors: 0, reliable: false,
      residualMedian: 0, residualP90: 0, sync: 0
    };
  }

  const anchors = collectAnchors(ref, cand);
  const mapping = estimateMapping(anchors);
  const mapped = (time) => mapping.a * time + mapping.b;

  // 每行参考歌词保留一个最佳匹配：词级锚点优先，再用保序行配对补漏。
  const covered = new Map();
  for (const anchor of anchors) {
    const residual = Math.abs(mapped(anchor.q) - anchor.r);
    if (residual > PAIR_TOL) continue;
    const prev = covered.get(anchor.refIndex);
    if (!prev || anchor.sim > prev.sim + 1e-9 ||
        (Math.abs(anchor.sim - prev.sim) < 1e-9 && residual < prev.residual)) {
      covered.set(anchor.refIndex, {
        sim: anchor.sim,
        candIndex: anchor.candIndex,
        residual,
        exact: anchor.exact
      });
    }
  }
  for (const pair of pairLines(ref, cand, mapping)) {
    if (covered.has(pair.ref.index)) continue;
    const residual = Math.abs(mapped(pair.cand.time) - pair.ref.time);
    if (residual > PAIR_TOL) continue;
    covered.set(pair.ref.index, {
      sim: pair.sim,
      candIndex: pair.cand.index,
      residual,
      exact: false
    });
  }

  const matched = [...covered.values()];
  const coverage = matched.length / Math.max(1, ref.length);
  const candCoverage = new Set(matched.map((item) => item.candIndex)).size / Math.max(1, cand.length);
  const meanSim = matched.length
    ? matched.reduce((sum, item) => sum + item.sim, 0) / matched.length
    : 0;

  // 同步率只看词级锚点：行级补漏的残差是配对容差内的估计值，不代表真实精度。
  const exactResiduals = anchors
    .filter((anchor) => anchor.exact)
    .map((anchor) => Math.abs(mapped(anchor.q) - anchor.r))
    .filter((residual) => residual <= PAIR_TOL)
    .sort((a, b) => a - b);
  const residuals = (exactResiduals.length >= 3 ? exactResiduals : matched.map((item) => item.residual))
    .sort((a, b) => a - b);
  const residualMedian = residuals.length ? median(residuals) : 0;
  const p90 = residuals.length
    ? residuals[Math.min(residuals.length - 1, Math.floor(residuals.length * 0.9))]
    : 0;
  const sync = Math.max(0, Math.min(1, 1 - residualMedian / 0.5));

  return {
    offset: mapping.b,
    mapping,
    pairs: matched.length,
    ratio: Math.min(coverage, candCoverage),
    coverage,
    candCoverage,
    sync,
    meanSim,
    anchors: anchors.length,
    reliable: mapping.reliable,
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

// 将 QQ 时间轴映射到参考音频时间轴：line.time / etext 一起变换。
export function applyMapping(json, mapping) {
  const a = mapping?.a ?? 1;
  const b = mapping?.b ?? 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return json;
  if (Math.abs(a - 1) < 1e-6 && Math.abs(b) < 0.05) return json;

  const first = Number.isFinite(mapping?.first) ? mapping.first : null;
  const map = (time) => {
    const raw = Number(time) || 0;
    // 第一句参考歌词之前的片头/制作信息没有对齐锚点，保持原始时间更可靠。
    const mapped = first != null && raw < first ? raw : a * raw + b;
    return Math.max(0, Math.round(mapped * 1000) / 1000);
  };
  for (const line of json.lyrics) {
    line.time = map(line.time);
    for (const word of line.etext || []) {
      const start = map(word.start);
      const end = map(word.end);
      word.start = start;
      word.end = end;
      word.Duration = Math.max(0, Math.round((end - start) * 1000) / 1000);
    }
  }
  json.metadata.offset = Number(b.toFixed(3));
  if (Math.abs(a - 1) >= 1e-6) json.metadata.scale = Number(a.toFixed(6));
  return json;
}
