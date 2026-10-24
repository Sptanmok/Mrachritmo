// 文本归一化与相似度：所有字符集（拉丁/西里尔/汉字/假名）都必须保留。
// 旧实现用 /[^\w\u4e00-\u9fff]/，会把西里尔字母和假名整段删掉。

const VERSION_LATIN = /\b(live|remix|rmx|cover|cos|cosplay|instrumental|off\s*vocal|acoustic|demo|remaster(?:ed)?|sped\s*up|slowed|nightcore|dj|karaoke)\b/gi;
const VERSION_CJK = /(现场|演唱会|翻唱|翻自|伴奏|纯音乐|片段|混音|重制|加速|降速)/g;
const BRACKETS = /\([^)]*\)|\[[^\]]*\]|【[^】]*】|「[^」]*」|『[^』]*』/g;

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')            // 全角括号/字母、半角假名统一
    .toLowerCase()
    .replace(/ё/g, 'е')          // 俄语 ё/е 常混用
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

// QQ 的俄语歌词经常用拉丁字母代替外形相同的西里尔字母：
// “Mы paзлeteлиcь b щeпkи” 实际是 “Мы разлетелись в щепки”。
// 这里把被替换的那批西里尔字母折成同一套拉丁骨架，双方即可正常比较。
// 只折 QQ 实际会替换的字母，保留 з/л/и/п/ч/ш/щ/ы/ь/ю/я 等，避免把俄语和英语歌词误配。
const CYRILLIC_FOLD = new Map([
  ['\u0430', 'a'], ['\u0431', 'b'], ['\u0432', 'b'], ['\u0435', 'e'],
  ['\u0436', ''],  ['\u043A', 'k'], ['\u043C', 'm'], ['\u043D', 'h'],
  ['\u043E', 'o'], ['\u0440', 'p'], ['\u0441', 'c'], ['\u0442', 't'],
  ['\u0443', 'y'], ['\u0445', 'x']
]);
const CYRILLIC_FOLD_RE = /[\u0430\u0431\u0432\u0435\u0436\u043A\u043C\u043D\u043E\u0440\u0441\u0442\u0443\u0445]/g;

export function lyricSkeleton(value) {
  return normalizeText(value).replace(CYRILLIC_FOLD_RE, (char) => CYRILLIC_FOLD.get(char) ?? char);
}

// 去掉版本/描述括号，以及 “Song - Artist” 后缀；版本标记单独提取用于惩罚。
export function baseTitle(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(BRACKETS, ' ')
    .replace(/\s+[-–—]\s*.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function versionTags(value) {
  const text = String(value ?? '');
  const tags = new Set();
  for (const match of text.matchAll(VERSION_LATIN)) tags.add(match[0].toLowerCase().replace(/\s+/g, ' '));
  for (const match of text.matchAll(VERSION_CJK)) tags.add(match[0]);
  return tags;
}

export function symmetricDifference(a, b) {
  const out = new Set();
  for (const item of a) if (!b.has(item)) out.add(item);
  for (const item of b) if (!a.has(item)) out.add(item);
  return out;
}

export function splitArtists(value) {
  if (Array.isArray(value)) return value.flatMap(splitArtists).filter(Boolean);
  return String(value ?? '')
    .normalize('NFKC')
    .replace(BRACKETS, ' ')
    .split(/\s*(?:\/|、|,|，|&|;|；|\bfeat\.?|\bft\.?)\s*/i)
    .map(normalizeText)
    .filter(Boolean);
}

export function trackArtists(track) {
  if (Array.isArray(track?.singerList) && track.singerList.length) {
    return track.singerList.flatMap(splitArtists).filter(Boolean);
  }
  return splitArtists(track?.singer || track?.artist || '');
}

export function gramMap(normalized, n = 2) {
  const map = new Map();
  if (!normalized) return map;
  if (normalized.length <= n) {
    map.set(normalized, 1);
    return map;
  }
  for (let i = 0; i <= normalized.length - n; i++) {
    const gram = normalized.slice(i, i + n);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

export function diceMaps(mapA, mapB) {
  if (!mapA.size || !mapB.size) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const count of mapA.values()) normA += count * count;
  for (const count of mapB.values()) normB += count * count;
  const [small, large] = mapA.size <= mapB.size ? [mapA, mapB] : [mapB, mapA];
  for (const [gram, count] of small) dot += count * (large.get(gram) || 0);
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function dice(a, b, n = 2) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return diceMaps(gramMap(na, n), gramMap(nb, n));
}

// Jaro-Winkler：保留旧实现，但把空串判断放在相等判断之前。
export function stringSimilarity(str1, str2, options = {}) {
  const s1 = str1 == null ? '' : String(str1);
  const s2 = str2 == null ? '' : String(str2);

  // 空串不是“相等”：两个缺失字段不能互相打 1 分。
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1 === s2) return 1;

  const a = Array.from(s1);
  const b = Array.from(s2);
  const len1 = a.length;
  const len2 = b.length;
  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);
  let matches = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (!matches2[j] && a[i] === b[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  const matchedChars1 = [];
  const matchedChars2 = [];
  for (let i = 0; i < len1; i++) if (matches1[i]) matchedChars1.push(a[i]);
  for (let j = 0; j < len2; j++) if (matches2[j]) matchedChars2.push(b[j]);

  let transpositions = 0;
  for (let k = 0; k < matchedChars1.length; k++) {
    if (matchedChars1[k] !== matchedChars2[k]) transpositions++;
  }
  transpositions /= 2;

  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions) / matches
  ) / 3;

  const scalingFactor = options.scalingFactor !== undefined ? options.scalingFactor : 0.1;
  const maxPrefixLength = options.prefixLength !== undefined ? options.prefixLength : 4;
  const prefixLimit = Math.min(maxPrefixLength, len1, len2);
  let commonPrefix = 0;
  for (let i = 0; i < prefixLimit; i++) {
    if (a[i] === b[i]) commonPrefix++;
    else break;
  }

  return Math.min(1, jaro + commonPrefix * scalingFactor * (1 - jaro));
}

export function artistSimilarity(a, b) {
  const listA = Array.isArray(a) ? a : splitArtists(a);
  const listB = Array.isArray(b) ? b : splitArtists(b);
  if (!listA.length || !listB.length) return 0;
  let best = 0;
  for (const x of listA) {
    for (const y of listB) {
      const score = Math.max(
        stringSimilarity(x, y),
        diceMaps(gramMap(x, 2), gramMap(y, 2))
      );
      if (score > best) best = score;
    }
  }
  return best;
}

export function parseDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim();
  if (!text) return 0;

  let match = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (match) {
    return match[3] != null
      ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
      : Number(match[1]) * 60 + Number(match[2]);
  }
  match = text.match(/(\d+)\s*分\s*(\d+)\s*秒/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  match = text.match(/^(\d+(?:\.\d+)?)\s*(?:s|秒)?$/i);
  if (match) return Number(match[1]);
  return 0;
}

export function durationSimilarity(a, b) {
  if (!(a > 0) || !(b > 0)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.abs(a - b) / 20));
}

export function candidateScore(source, track) {
  const title = dice(baseTitle(source.title), baseTitle(track.song));
  const qArtists = trackArtists(track);
  const artists = artistSimilarity(source.artists, qArtists);
  const album = source.album && track.album ? dice(source.album, track.album) : null;
  const duration = source.duration > 0 && track.duration > 0
    ? durationSimilarity(source.duration, track.duration)
    : null;

  const parts = [[0.55, title]];
  // 只有“双方都有艺人信息”时才计入；缺失跳过，但存在且完全不同必须扣分。
  if (source.artists.length && qArtists.length) parts.push([0.30, artists]);
  if (album != null) parts.push([0.05, album]);
  if (duration != null) parts.push([0.10, duration]);

  const weight = parts.reduce((sum, [w]) => sum + w, 0);
  const base = parts.reduce((sum, [w, value]) => sum + w * value, 0) / (weight || 1);
  const penalty = Math.min(
    0.24,
    0.08 * symmetricDifference(
      versionTags(`${source.title} ${source.album}`),
      versionTags(`${track.song} ${track.album}`)
    ).size
  );

  return {
    score: Math.max(0, Math.min(1, base - penalty)),
    title,
    artists,
    album,
    duration,
    versionPenalty: penalty
  };
}

// 保留旧接口；清洗改为保留所有文字系统的字母。
export function lyricsSimilarity(lyricsA, lyricsB, options = {}) {
  const n = options.n || 3;
  const useLogTF = !!options.useLogTF;

  const a = normalizeText(lyricsA);
  const b = normalizeText(lyricsB);
  if (!a.length || !b.length) return 0;   // 两边都空 = 没有证据，不是满分

  const getNgrams = (str) => {
    const map = new Map();
    if (str.length < n) {
      for (const ch of str) map.set(ch, (map.get(ch) || 0) + 1);
    } else {
      for (let i = 0; i <= str.length - n; i++) {
        const gram = str.slice(i, i + n);
        map.set(gram, (map.get(gram) || 0) + 1);
      }
    }
    if (useLogTF) for (const [gram, count] of map) map.set(gram, 1 + Math.log(count));
    return map;
  };

  const mapA = getNgrams(a);
  const mapB = getNgrams(b);
  if (!mapA.size || !mapB.size) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const count of mapA.values()) normA += count * count;
  for (const count of mapB.values()) normB += count * count;
  const [small, large] = mapA.size <= mapB.size ? [mapA, mapB] : [mapB, mapA];
  for (const [gram, count] of small) dot += count * (large.get(gram) || 0);

  return Math.min(1, Math.max(0, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}
