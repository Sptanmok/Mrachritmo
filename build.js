import { build } from "esbuild";
import fs from "fs";
import { parseFile } from 'music-metadata';
import axios from 'axios';
import * as cheerio from 'cheerio';
  function lrctojson(lrc) {
  const result = {
      metadata: {},
      lyrics: [],
    };
    let text = "";
    let totalSeconds = 0;
    lrc = lrc.replace(/^\uFEFF/, '');

    // 分割行
    const lines = lrc.split(/\r?\n/);

    const metadataRegex = /^\s*\[([a-zA-Z]+)\s*:\s*(.*?)\]\s*$/;
    const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;
let zq = false;
    for (const line of lines) {
          if (!line.trim()) continue;
          const metadataMatch = line.match(metadataRegex);
          if (metadataMatch) {
              result.metadata[metadataMatch[1].toLowerCase()] = metadataMatch[2].trim();
              continue;
          }
          //获取以及处理meta
          const timeMatch = line.match(timeTagRegex);
          if (timeMatch) {
              text = timeMatch[4];
      let decimal = null;
      if (timeMatch[3].toString().length === 3){
        decimal = parseInt(timeMatch[3]) / 1000;
      }else{
          decimal = parseInt(timeMatch[3]) / 100;
      }
              totalSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) + decimal;//大部分为到百分位，有一些到千分位
          }
          
          //获取和处理普通时间
          const pairlyricif = result.lyrics.findIndex(lybl => lybl.time == totalSeconds);
          if (pairlyricif != -1) {
            result.lyrics[pairlyricif].pairlyric = text;
            continue;
          }
          //处理副歌词
          ;
          let eljson = [];
          if (text.includes('<') && text.includes('>')) {
  zq = true;
          const regex = /<(\d+):(\d+)\.(\d+)>/g;
          const dregex = /([^<]*)/g;
          eljson = [];
          let ttt;
          let tttc;
          while ((ttt = regex.exec(text)) !== null) {
            if (tttc) {
      let tttd = text.substring(tttc.index + tttc[0].length, ttt.index);
      tttd = tttd.replace(/<\d+:\d+\.\d+>/g, '');
      if(tttd == ''){continue;}
      let decimal = null;
      if (tttc[3].toString().length === 3){//大部分为到百分位，有一些到千分位
      decimal = parseInt(tttc[3]) / 1000
      } else{
      decimal = parseInt(tttc[3]) / 100
      }
      let decimalc = null;
      if (ttt[3].toString().length === 3){//大部分为到百分位，有一些到千分位
      decimalc = parseInt(ttt[3]) / 1000
      } else{
      decimalc = parseInt(ttt[3]) / 100
      }
              const totalSecondsStart = parseInt(tttc[1]) * 60 + parseInt(tttc[2]) + decimal;
              const totalSecondsEnd = parseInt(ttt[1]) * 60 + parseInt(ttt[2]) + decimalc;
                const Duration = totalSecondsEnd - totalSecondsStart;
                tttd = tttd.replace(/ /g, '&nbsp;')
                eljson.push({ Duration: Duration, start: totalSecondsStart, end: totalSecondsEnd, text: tttd });
            }
            tttc = ttt;
          }
          }
          
          //处理增强版lrc格式
    if (text) {
              text = text.replace(/<[^>]*>/g, '');
              result.lyrics.push({
                  time: totalSeconds,
                  text: text,
                  etext: eljson
              });
          }
    }
result.metadata.zq = zq;
  return result;
  }

let allmusicfilename = fs.readdirSync("./src/musicfile");
const nregex = /json|lrc/;
allmusicfilename = allmusicfilename.filter(item => !nregex.test(item));
await fs.promises.rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ["src/player2.js"],
  bundle: true,
  minify: true,
  outfile: "dist/player2.js"
});
if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
if (!fs.existsSync("dist/musicfile")) fs.mkdirSync("dist/musicfile", { recursive: true });

const index = fs.readFileSync("src/indexmoban.html", "utf8");
const template = fs.readFileSync("src/moban.html", "utf8");
let ol = 1;
let liebiao = "";
for (const musicfilename of allmusicfilename) {
  const musicname = musicfilename.replace(/\.[^.]*$/, '');
  const lrcpath = "/musicfile/" + musicfilename.replace(/\.[^.]*$/, '.lrc');
  let html = template
    .replace(/{{title}}/g, musicname)
    .replace(/{{filename}}/g, musicfilename)
    .replace('https://picsum.photos/400/400', `./musicfile/${musicname}.jpg`)
  if (!fs.existsSync("src/musicfile/" + musicfilename.replace(/\.[^.]*$/, '.lrc'))) {
	  console.warn(`没有找到${musicfilename}的对应lrc文件`);
	  continue;
  }
  const lyriclrc = fs.readFileSync("src" + lrcpath, "utf8");
  let lyricjson = lrctojson(lyriclrc);
  fs.writeFileSync(`dist/musicfile/${musicname}.json`,JSON.stringify(lyricjson, null, 2),"utf8");
  fs.writeFileSync(`dist/${musicname}.html`, html);
  fs.copyFileSync("src/musicfile/" + musicfilename, "dist/musicfile/" + musicfilename)
  liebiao += `<li><a href="./${musicname}.html">${musicname}</a></li>`
  console.log(`生成: dist/${musicname}.html`);
  await imgload(musicfilename, lyricjson);
  ol++;
}
async function imgload(musicfilename, jsonlyrics){
    const metadata = await parseFile(`./src/musicfile/${musicfilename}`);
    if(metadata.common.picture && metadata.common.picture.length > 0){
      const picture = metadata.common.picture[0];
      fs.writeFileSync(`./dist/musicfile/${musicfilename.replace(/\.[^.]*$/, '.jpg')}`, picture.data);
      return;
    }
    if(jsonlyrics.metadata.ti){
      const ssjg = await axios.get(`https://oiapi.net/api/Music_163?name=${encodeURIComponent(jsonlyrics.metadata.ti)}`);
      const lb = ssjg.data
      const imageResponse = await axios.get(lb.data[0].picurl, { responseType: 'arraybuffer' });
      fs.writeFileSync(`./dist/musicfile/${musicfilename.replace(/\.[^.]*$/, '.jpg')}`, imageResponse.data)
      console.log("img ok")
      return;
    }
    /*
    if(jsonlyrics.metadata.ti){
        const ssjg = await axios.get(`https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(jsonlyrics.metadata.ti)}&type=1&offset=0&total=true&limit=10`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}});
        console.log(ssjg.data);
        if(!ssjg.data.result.songs){
            console.error("seim error!");
            clearimg(musicfilename)
            return;
        }
        if(!ssjg.data.result.songs[0].id){
            console.error("seimg null!");
            clearimg(musicfilename)
            return;
        }
        const pijt = await axios.get(`https://music.163.com/song?id=${ssjg.data.result.songs[0].id}`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}});
        const $ = cheerio.load(pijt.data);
        const dataSrcList = [];
        $('img[data-src]').each((index, element) => {
          const dataSrc = $(element).attr('data-src');
          if (dataSrc) {
            dataSrcList.push(dataSrc);
          }
        });
        if(dataSrcList <= 0){
          console.error("no img");
          clearimg(musicfilename)
          return;
        }
        const imageResponse = await axios.get(dataSrcList[0], { responseType: 'arraybuffer' });
        fs.writeFileSync(`./dist/musicfile/${musicfilename.replace(/\.[^.]*$/, '.jpg')}`, imageResponse.data)
        console.log("img ok")
        return;
        
    }
    */
    console.warn('no img');
    clearimg(musicfilename)
}
function clearimg(musicfilename){
    const yl = fs.readFileSync(`./dist/${musicfilename.replace(/\.[^.]*$/, '.html')}`, 'utf8');
    const xg = yl.replace(/<img[^>]*>/gi, '')
    fs.writeFileSync(`./dist/${musicfilename.replace(/\.[^.]*$/, '.html')}`, xg);
}
function dolwo(){
  
}
let indexhtml = index
    .replace(/{{link}}/g, liebiao)
fs.writeFileSync(`dist/index.html`, indexhtml);
fs.copyFileSync("src/player2.css", "dist/player2.css");
fs.copyFileSync("src/index.css", "dist/index.css");
fs.copyFileSync("src/DSC00485.webp", "dist/DSC00485.webp");
fs.copyFileSync("src/Saira-Light.woff2", "dist/Saira-Light.woff2");
fs.copyFileSync("src/LXGWWenKai-Light.woff2", "dist/LXGWWenKai-Light.woff2");