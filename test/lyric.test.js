import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  baseTitle,
  versionTags,
  stringSimilarity,
  lyricsSimilarity,
  candidateScore,
  splitArtists,
  parseDuration
} from '../src/lyric/text.js';
import { analyzeAlignment, acceptanceScore, applyOffset } from '../src/lyric/align.js';
import { QrcToJson } from '../src/lyric/qq.js';

test('normalization keeps Cyrillic and kana', () => {
  assert.equal(normalizeText('Привет, мир!'), 'приветмир');
  assert.equal(normalizeText('きみのことが好きだよ'), 'きみのことが好きだよ');
  assert.equal(normalizeText('Ｌｅｍｏｎ（Live）'), 'lemonlive');
});

test('text similarity does not treat two empty strings as equal', () => {
  assert.equal(stringSimilarity('', ''), 0);
  assert.equal(stringSimilarity('abc', 'abc'), 1);
});

test('lyrics similarity works across scripts', () => {
  assert.ok(lyricsSimilarity('Привет мир как дела', 'Привет мир как дела') > 0.9);
  assert.ok(lyricsSimilarity('Привет мир как дела', 'Совсем другой текст песни') < 0.3);
  assert.ok(lyricsSimilarity('这是完全不同的歌词', '今天天气真不错啊') < 0.2);
});

test('titles strip full-width descriptions and mark versions', () => {
  assert.equal(baseTitle('Lemon（日剧《非自然死亡》主题曲）'), 'Lemon');
  assert.ok(versionTags('Lemon (Live)').has('live'));
  assert.ok(versionTags('Lemon（现场版）').has('现场'));
});

test('missing values are not scored as perfect matches', () => {
  const source = {
    title: 'Lemon',
    artists: splitArtists('米津玄師'),
    album: 'Lemon',
    duration: 256
  };
  const studio = { song: 'Lemon', singer: '米津玄師', album: 'レモン', duration: 256 };
  const live = { song: 'Lemon (Live)', singer: '米津玄師', album: '', duration: 248 };
  const cover = { song: 'Lemon', singer: 'Vk', album: 'Lemon', duration: 256 };

  const studioScore = candidateScore(source, studio).score;
  const liveScore = candidateScore(source, live).score;
  const coverScore = candidateScore(source, cover).score;
  assert.ok(studioScore > liveScore, `${studioScore} should beat ${liveScore}`);
  assert.ok(studioScore > coverScore, `${studioScore} should beat ${coverScore}`);
});

test('duration parser accepts local and vkeys shapes', () => {
  assert.equal(parseDuration(256), 256);
  assert.equal(parseDuration('5分24秒'), 324);
  assert.equal(parseDuration('05:24'), 324);
});

test('QRC conversion keeps word timing and drops kana metadata', () => {
  const yrc = [
    '[ti:Lemon]',
    '[ar:米津玄師]',
    '[al:Lemon]',
    '[by:]',
    '[offset:0]',
    '[kana:1よ1ね1づ]',
    '[1000,1000]夢(1000,200)な(1200,300)ら(1500,500)',
    '[2000,1000]ば(2000,1000)'
  ].join('\n');
  const json = QrcToJson({ yrc }, 123);
  assert.equal(json.lyrics.length, 2);
  assert.equal(json.metadata.zq, true);
  assert.equal(json.metadata.kana, undefined);
  assert.equal(json.metadata.offset, undefined);
  assert.equal(json.lyrics[0].etext.length, 3);
  assert.equal(json.lyrics[0].etext[0].start, 1);
  assert.equal(json.lyrics[0].text, '夢なら');
});

test('CRLF QRC payloads parse all lines', () => {
  const yrc = '[ti:x]\r\n[ar:y]\r\n[0,1000]a(0,100)b\r\n[1000,1000]c(1000,100)d\r\n';
  const json = QrcToJson({ yrc }, 1);
  assert.equal(json.lyrics.length, 2);
  assert.equal(json.metadata.zq, true);
  assert.deepEqual(json.lyrics.map((line) => line.text), ['ab', 'cd']);
});

test('three-digit translation times pair to the right line', () => {
  const json = QrcToJson({
    yrc: '[950,100]word(950,100)',
    trans: '[00:00.100]A\n[00:00.900]B'
  }, 1);
  assert.equal(json.lyrics[0].pairlyric, 'B');
});

test('LRC is used when QRC has no timed lines', () => {
  const json = QrcToJson({
    yrc: '[ti:Only metadata]',
    lrc: '[00:01.00]hello\n[00:02.50]world'
  }, 1);
  assert.equal(json.lyrics.length, 2);
  assert.equal(json.metadata.qqsource, 'lrc');
  assert.equal(json.metadata.zq, false);
  assert.equal(json.lyrics[1].time, 2.5);
});

test('alignment estimates both offset signs and rejects wrong text', () => {
  const ref = [];
  for (let i = 0; i < 30; i++) {
    ref.push({ time: 10 + i * 4, text: `unique lyric line number ${i} with words` });
  }
  const shifted = (seconds, textOf = (line) => line.text) =>
    ref.map((line) => ({ time: line.time + seconds, text: textOf(line) }));

  const late = analyzeAlignment(ref, shifted(1.2));
  assert.equal(late.offset, -1.2);
  assert.equal(late.ratio, 1);
  assert.equal(late.meanSim, 1);

  const early = analyzeAlignment(ref, shifted(-2.5));
  assert.equal(early.offset, 2.5);
  assert.equal(early.ratio, 1);

  const wrong = analyzeAlignment(ref, shifted(0, () => 'completely different words about something else'));
  assert.equal(wrong.ratio, 0);
  assert.equal(acceptanceScore({ coverage: wrong.coverage, candCoverage: wrong.candCoverage, meanSim: wrong.meanSim, sync: wrong.sync, candidateScore: 1 }).accepted, false);
});

test('applyOffset shifts both signs and clamps at zero', () => {
  const json = {
    metadata: { offset: 0 },
    lyrics: [
      { time: 0, text: 'a', etext: [{ start: 0, end: 0.5, text: 'a' }] },
      { time: 5, text: 'b', etext: [{ start: 5, end: 5.5, text: 'b' }] }
    ]
  };
  applyOffset(json, -1);
  assert.deepEqual(json.lyrics.map((line) => line.time), [0, 4]);
  assert.equal(json.lyrics[1].etext[0].start, 4);
  assert.equal(json.metadata.offset, -1);
});

test('acceptance requires coverage, text and sync', () => {
  assert.equal(acceptanceScore({
    coverage: 0.95, candCoverage: 0.8, meanSim: 0.95, sync: 0.9, candidateScore: 1, wordTimed: true
  }).accepted, true);
  assert.equal(acceptanceScore({
    coverage: 0.2, candCoverage: 1, meanSim: 1, sync: 1, candidateScore: 1
  }).accepted, false);
  assert.equal(acceptanceScore({
    coverage: 1, candCoverage: 1, meanSim: 0.4, sync: 1, candidateScore: 1
  }).accepted, false);
  // 参考歌词覆盖了 90%，但候选多出很多注释行：candCoverage 低仍可接受。
  assert.equal(acceptanceScore({
    coverage: 0.9, candCoverage: 0.44, meanSim: 0.98, sync: 0.74, candidateScore: 0.99, wordTimed: true
  }).accepted, true);
  // 只有一半参考行、且同步残差大：拒绝。
  assert.equal(acceptanceScore({
    coverage: 0.5, candCoverage: 0.56, meanSim: 0.98, sync: 0, candidateScore: 0.9, wordTimed: true
  }).accepted, false);
});
