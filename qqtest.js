// 手动冒烟测试：node qqtest.js "Lemon" "米津玄師" "Lemon" [--id=536622304]
// 只请求歌词/搜索接口，不下载音频。

import axios from 'axios';
import { QQJsonGET } from './src/lyric/qq.js';

const args = process.argv.slice(2);
const idArg = args.find((arg) => arg.startsWith('--id='));
const positional = args.filter((arg) => !arg.startsWith('--'));
const [name, artist, albumArg] = positional;

if (!name || !artist) {
  console.error('用法: node qqtest.js "<歌名>" "<艺人>" ["<专辑>"] [--id=<网易云歌曲id>]');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36';
const headers = { 'user-agent': UA, referer: 'https://music.163.com/' };

async function neteaseReference() {
  let id = idArg ? idArg.slice(5) : '';
  if (!id) {
    const search = await axios.get('https://music.163.com/api/search/get', {
      params: { s: `${name} ${artist}`, type: 1, limit: 5 },
      headers
    });
    id = search.data?.result?.songs?.[0]?.id;
    if (!id) throw new Error('网易云搜索不到参考歌曲，请用 --id 指定');
  }

  const [detail, lyric] = await Promise.all([
    axios.get('https://music.163.com/api/song/detail', { params: { ids: `[${id}]` }, headers }),
    axios.get('https://music.163.com/api/song/lyric', {
      params: { os: 'pc', id, yv: -1, tv: -1, rv: -1, lv: -1 },
      headers
    })
  ]);

  const song = detail.data?.songs?.[0];
  const duration = song ? Number(song.duration) / 1000 : 0;
  const refAlbum = song?.album?.name || '';
  const yrc = lyric.data?.yrc?.lyric;
  const lrc = lyric.data?.lrc?.lyric;
  const lyrics = [];

  if (yrc) {
    for (const line of yrc.replace(/\r\n?/g, '\n').split('\n')) {
      const match = line.match(/^\[(\d+),(\d+)\](.*)$/);
      if (!match) continue;
      lyrics.push({ time: Number(match[1]) / 1000, text: match[3].replace(/\(\d+,\d+,\d+\)/g, '') });
    }
  } else if (lrc) {
    for (const line of lrc.replace(/\r\n?/g, '\n').split('\n')) {
      const match = line.match(/^\[(\d+):(\d+)(?:[.:](\d+))?\](.*)$/);
      if (!match) continue;
      const fraction = match[3] || '';
      const decimal = fraction.length === 2 ? Number(fraction) / 100 : Number(fraction) / 1000;
      lyrics.push({ time: Number(match[1]) * 60 + Number(match[2]) + decimal, text: match[4] });
    }
  }

  return {
    id,
    album: albumArg || refAlbum,
    duration,
    lyrics
  };
}

const reference = await neteaseReference();
const started = Date.now();
const result = await QQJsonGET(name, artist, reference.album, {
  metadata: { duration: reference.duration },
  lyrics: reference.lyrics
});

console.log(JSON.stringify({
  reference: {
    id: reference.id,
    album: reference.album,
    duration: reference.duration,
    lines: reference.lyrics.length
  },
  accepted: result.metadata.accepted,
  matched: result.metadata.qqmusicid,
  provider: result.metadata.provider,
  offset: result.metadata.offset,
  score: result.metadata.matchScore,
  align: result.metadata.align,
  zq: result.metadata.zq,
  message: result.metadata.message,
  candidates: result.metadata.candidates,
  lines: result.lyrics?.length,
  firstLines: result.lyrics?.slice(0, 3).map((line) => ({ time: line.time, text: line.text })),
  elapsed: `${((Date.now() - started) / 1000).toFixed(1)}s`
}, null, 2));
