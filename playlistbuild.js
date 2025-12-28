import { build } from "esbuild";
import fs from "fs";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { console } from "inspector";
import querystring from 'querystring';

//await fs.promises.rm('dist', { recursive: true, force: true });
const metingapi_url='https://meting.qjqq.cn/'
const qqmusiclyric_api ='http://8.140.228.251:5000/'
const qqyuan = true
//↑↑↑配置处↑↑↑

if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
if (!fs.existsSync("dist/musicfile")) fs.mkdirSync("dist/musicfile", { recursive: true });
if (!fs.existsSync("dist/musicfile/img")) fs.mkdirSync("dist/musicfile/img", { recursive: true });
await build({
  entryPoints: ["src/player2.js"],
  bundle: true,
  minify: true,
  outfile: "dist/player2.js"
});
const gedang = fs.readFileSync(`neteaseplaylist.txt`, 'utf8')
const playmusics = gedang.split(/\r?\n/);
const index = fs.readFileSync("src/indexmoban.html", "utf8");
const template = fs.readFileSync("src/moban.html", "utf8");
let liebiao = "";
let o = 0;
const musicnum_max = 10000;
async function start(){
    liebiao = "";
    let dd = 0;
    let indexhtml;
    console.log("开始！");
    for(const playmusic of playmusics){
        const list = await axios.get(`${metingapi_url}?type=playlist&id=${playmusic.match(/\d+$/)}`);
        await jxgd(list.data);
        if(o > musicnum_max) {
            break;
        }
    }
    indexhtml = index.replace(/{{link}}/g, liebiao)
    fs.writeFileSync("./dist/index.html", indexhtml)
    console.log("successfully")
}
let async_max = 10
let async_nu = 0
async function jxgd(listd){
    let rw =[];
    for(const musicd of listd){
        o++;
        if(o > musicnum_max) {
            console.warn("音乐过多，停止生成");
            break;
        }
        while(async_nu >= async_max){
            await delay(50);
        }
        const task = amusic(musicd,  o)
        rw.push(task)
    }
    await Promise.all(rw);
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function amusic(musicd, o){
    async_nu++;
    const musicid = musicd.url.match(/\d+$/);
    const metadata = {name:musicd.name, artist:musicd.artist}
    let json = await YrcToJson(musicid[0],metadata);
    if(qqyuan){
    //替补
        let jsonq;
        if(!json.metadata.zq){
            jsonq= await QrcToJson(json.metadata.ti,json.metadata.ar,json.metadata.al);
            if(jsonq && jsonq.metadata.zq){
                const r = json
                json = jsonq
                json.metadataq = json.metadata
                json.metadata.ti = r.metadata.ti
                json.metadata.ar = r.metadata.ar
                json.metadata.al = r.metadata.al
                json.lyrict = r
            }else if(jsonq){
                json.lyricq = jsonq
            }
        }
    }
    
    if(!json) {
    return;
    }
    liebiao += `<li><a href="./${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html">${json.metadata.ti} - ${json.metadata.ar}${json.metadata.ti==json.metadata.al?'':` · ${json.metadata.al}`}</a></li>`
    if(!fs.existsSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`)){
        const music = await axios.get(musicd.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`,music.data)
    }
    fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.json`,JSON.stringify(json), "utf8")
    let ddyyweb = template
        .replace(/{{title}}/g, `${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}`.replace("/",","))
        .replace(/{{filename}}/g, `${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`)
        .replace('https://picsum.photos/400/400', `./musicfile/img/${filenamecl(json.metadata.al)}.jpg`)
    fs.writeFileSync(`./dist/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html`, ddyyweb)
    console.log(o);
    async_nu--;
}
function filenamecl(name){
    if(!name){
        return '';
    }
    let result = name.replace(/\//g,",").replace(/\*/g,"x").replace(/\"/g,"'")
    if(result.length>20) result = result.slice(0,5-result.length)+" ··· "+result.slice(result.length-5)
    return result;
}
async function YrcToJson(musicid, meta){
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /\((\d+),(\d+),(\d+)\)(.*?)(?=\(\d+,\d+,\d+\)|$)/g;
    const datae = await axios.get(`https://music.163.com/api/song/lyric?os=pc&id=${musicid}&yv=-1&tv=-1&rv=-1&lv=-1`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}})
    const yrc = datae.data;
    let json ={metadata: {zq:false,m:2}, lyrics: [],};
    let metadata_ = await metaload(musicid, meta.name)
    if(!yrc.yrc && !yrc.tlyric){
        //没有歌词（大概率纯音乐）
        json.metadata.ti = meta.name
        json.metadata.ar = meta.artist
        json.metadata.al = metadata_.albumName
        json.metadata.CLXIIIid = musicid
        json.metadata.nolyric = true
        return json;
    }
    json.metadata.nolyric = false
    let pdjg = {pairtext:"",pairif:false,romatext:"",romaif:false};;
    if(yrc.yrc && yrc.yrc.lyric){
        yrc.yrc.lyric = yrc.yrc.lyric.replace(/^\uFEFF/, '');
        const lyrics = yrc.yrc.lyric.split("\n");
        for(const lyric of lyrics){
            let lyricMatch = lyric.match(zqTagRegex);
            let text;
            let timesec;
            if(!lyricMatch) continue;
            text = lyricMatch[3]
            timesec = lyricMatch[1] / 1000
            let eljson = [];
            if (text.includes('(') && text.includes(')')) {
                let ttt;
                while ((ttt = regex.exec(lyric)) !== null) {
                    const Duration = ttt[2] / 1000
                    const start = ttt[1] / 1000
                    const totalSecondsEnd = (parseInt(ttt[1])+parseInt(ttt[2]))/1000
                    const texte = ttt[4].replace(/ /g, '&nbsp;')
                    eljson.push({ Duration: Duration, start: start, end: totalSecondsEnd, text: texte });
                }
                if(eljson[eljson.length-1]=='&nbsp;') eljson.pop();
                json.metadata.zq = eljson.length > 0;
            }
            text = text.replace(/\(\d+,\d+,\d+\)/g, '')
            pdjg = prpdl(yrc, timesec)
            json.lyrics.push({time: timesec,text: text,etext: eljson,pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
    }else if(yrc.lrc.lyric){//没有逐字/词歌词
        let lyrics = yrc.lrc.lyric.split("\n").filter(item => timeTagRegex.test(item))
        for(const lyric of lyrics){
            let lyricMatch = lyric.match(timeTagRegex);
            const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
            let timesec = parseInt(lyricMatch[1])*60+parseInt(lyricMatch[2])+decimal
            pdjg = prpdl(yrc, timesec)
            json.lyrics.push({time:timesec,text:lyricMatch[4],pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
    }else{
        json.metadata.nolyric = true
    }
    json.metadata.ti = meta.name
    json.metadata.ar = meta.artist
    json.metadata.al = metadata_.albumName
    json.metadata.CLXIIIid = musicid
    json.metadata.roma = pdjg.romaif
    json.metadata.pair = pdjg.pairif
    return json;
}
let sade ='';
let sadee ='';
async function QrcToJson(name,artist,album){
    const metadataRegex = /^\s*\[([a-zA-Z]+)\s*:\s*(.*?)\]\s*$/;
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /(.*?)\((\d+),(\d+)\)/g;
    //const datae = await axios.get(`${qqmusiclyric_api}?name=${encodeURIComponent(name.replace(/ - .*/, ''))}&artists=${encodeURIComponent(artist.replace(/\/.*/, ''))}&album=${encodeURIComponent(album)}&cid=${i}`)
    let nme = await axios.get(`https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(name)}%20-%20${encodeURIComponent(artist)}`,{validateStatus: function (status) {return (status==200)||(status==502);}})
    while(nme.status==502){
        await delay(1000);
        nme = await axios.get(`https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(name)}%20-%20${encodeURIComponent(artist)}`,{validateStatus: function (status) {return (status==200)||(status==502);}})
    }
    let mi;
    for(let i = 0;true;i++){
        if(!nme.data.data[i])break;
        let aru = similar(nme.data.data[i].singer,artist)
        let tiu = similar(nme.data.data[i].song,name)
        let alu = similar(nme.data.data[i].album,album)
        if(aru>50){//&& tiu>50 && alu>50
            mi = i
            break;
        }
    }
    if(!mi) {sade = `${sade}${name} - ${artist} ~ ${album}\n`;mi=0;};
    if(!nme.data.data[0]) {sadee = `${sadee}${name} - ${artist} ~ ${album}\n`;return};
    let datae = await axios.get(`https://api.vkeys.cn/v2/music/tencent/lyric?id=${nme.data.data[mi].id}`,{validateStatus: function (status) {return (status==200)||(status==502);}})//api有时会出现502错误
    while(datae.status!==200){
        await delay(1000);
        datae = await axios.get(`https://api.vkeys.cn/v2/music/tencent/lyric?id=${nme.data.data[mi].id}`,{validateStatus: function (status) {return (status==200)||(status==502);}})
    }
    if(datae.data.code !== 200) return;
    let qrc = datae.data;
    qrc.orig = qrc.data.yrc
    qrc.ts = qrc.data.trans
    qrc.roma = qrc.data.roma
    let json ={metadata: {zq:false,m:2}, lyrics: [],};
    if(qrc.orig){
        let pdjg;
        qrc.orig = qrc.orig.replace(/^\uFEFF/, '');
        const lyrics = qrc.orig.split("\n");
        for(const lyric of lyrics){
            const metadataMatch = lyric.match(metadataRegex);
            if (metadataMatch) {
                 json.metadata[metadataMatch[1].toLowerCase()] = metadataMatch[2].trim();
                 continue;
            }
            let lyricMatch = lyric.match(zqTagRegex);
            let text;
            let timesec;
            if(!lyricMatch) continue;
            text = lyricMatch[3]
            timesec = lyricMatch[1] / 1000
            let eljson = [];
            if (text.includes('(') && text.includes(')')) {
                let ttt;
                let i = 0;
                while ((ttt = regex.exec(lyric.replace(/\[.*?\]/g, '')))) {
                    const Duration = parseInt(ttt[3]) / 1000
                    const start = parseInt(ttt[2]) / 1000
                    const totalSecondsEnd = (parseInt(ttt[2])+parseInt(ttt[3]))/1000
                    const texte = ttt[1].replace(/ /g, '&nbsp;')
                    eljson.push({ Duration: Duration, start: start, end: totalSecondsEnd, text: texte });
                }
                if(eljson[eljson.length-1]=='&nbsp;') eljson.pop();
                json.metadata.zq = eljson.length > 0;
            }
            text = text.replace(/\(\d+,\d+\)/g, '')
            pdjg = prpdlq(qrc, timesec)
            json.lyrics.push({time: timesec,text: text,etext: eljson,pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
        json.metadata.nolyric = json.lyrics.length === 0;
        json.metadata.roma = pdjg.romaif
        json.metadata.pair = pdjg.pairif
    }else{
        json.metadata.nolyric =true;
        json.metadata.zq = false;
        json.metadata.roma = false;
        json.metadata.pair = false;
    }
    json.metadata.qqmusicid = nme.data.data[mi].id;
    return json;
}
function prpdlq(qrc, timesec){
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    let pairif = false;
    let romaif = false;
    let pairtext = "";
    if(qrc.ts){
        const pairlyrics = qrc.ts.split("\n").filter(item => timeTagRegex.test(item));
        for(let i = 0; i < pairlyrics.length; i++){
            let lyricMatch = pairlyrics[i].match(timeTagRegex);
            if(!lyricMatch) continue;
            let text = lyricMatch[4]
            const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
            let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
            if(Math.abs(timesec - timesecp) < 0.3){
                pairtext = text.replace('//', '');
            }
        }
        pairif = true;
    }
    let romatext = '';
    if(qrc.roma){
        const romalyrics = qrc.roma.split("\n").filter(item => zqTagRegex.test(item));
        for(let i = 0; i < romalyrics.length; i++){
            let lyricMatch = romalyrics[i].match(zqTagRegex);
            if(!lyricMatch) continue;
            let text = lyricMatch[3].replace(/\([^)]*\)/g, '')
            let timesecp = parseInt(lyricMatch[1])/1000
            if(Math.abs(timesec - timesecp) < 0.3){
                romatext = text;
            }
        }
        romaif = true;
    }
    return {pairtext,pairif,romatext,romaif};
}
function prpdl(yrc, timesec){
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    let pairif = false;
    let romaif = false;
    let pairtext = "";
    if(yrc.tlyric.lyric){
        const pairlyrics = yrc.tlyric.lyric.split("\n").filter(item => timeTagRegex.test(item));
        for(let i = 0; i < pairlyrics.length; i++){
            let lyricMatch = pairlyrics[i].match(timeTagRegex);
            if(!lyricMatch) continue;
            let text = lyricMatch[4]
            const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
            let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
            if(Math.abs(timesec - timesecp) < 1){
                pairtext = text;
            }
        }
        pairif = true;
    }
    let romatext = '';
    if(yrc.romalrc.lyric){
        const romalyrics = yrc.romalrc.lyric.split("\n").filter(item => timeTagRegex.test(item));
        for(let i = 0; i < romalyrics.length; i++){
            let lyricMatch = romalyrics[i].match(timeTagRegex);
            if(!lyricMatch) continue;
            let text = lyricMatch[4]
            const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
            let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
            if(Math.abs(timesec - timesecp) < 1){
                romatext = text;
            }
        }
        romaif = true;
    }
    return {pairtext,pairif,romatext,romaif};
}
let picerr = '';
async function metaload(musicid, name){
    const pijt = await axios.get(`https://music.163.com/song?id=${musicid}`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}});
    const $ = cheerio.load(pijt.data);
    let albumName = '';let albumLink = '';
    $('a[href*="/album?id="]').each((index, element) => {
        const $link = $(element);
        const parentText = $link.parent().text();
        if (parentText.includes('所属专辑：')) {
            albumLink = $link.attr('href');
            if (albumLink && !albumLink.startsWith('http')) {
                albumName = $link.text().trim();
                albumLink = `https://music.163.com${albumLink}`;
            }
            return false;
        }
    });
    if(!fs.existsSync(`dist/musicfile/img/${filenamecl(albumName)}`)){
        const dataSrcList = [];
        $('img[data-src]').each((index, element) => {
            const dataSrc = $(element).attr('data-src');
            if (dataSrc) {
            dataSrcList.push(dataSrc);
            }
        });
        const imageResponse = await axios.get(dataSrcList[0], { responseType: 'arraybuffer' });
        fs.writeFile(`./dist/musicfile/img/${filenamecl(albumName)}.jpg`, imageResponse.data, (err) => {picerr+=`${err}\n`});
    }
    return {albumName,albumLink};
}
function similar(s, t) {
  if (!s || !t) {
    return 0
  }
  if(s === t){
    return 100;
  }
  var l = s.length > t.length ? s.length : t.length
  var n = s.length
  var m = t.length
  var d = []
  let f = 2
  var min = function (a, b, c) {
    return a < b ? (a < c ? a : c) : (b < c ? b : c)
  }
  var i, j, si, tj, cost
  if (n === 0) return m
  if (m === 0) return n
  for (i = 0; i <= n; i++) {
    d[i] = []
    d[i][0] = i
  }
  for (j = 0; j <= m; j++) {
    d[0][j] = j
  }
  for (i = 1; i <= n; i++) {
    si = s.charAt(i - 1)
    for (j = 1; j <= m; j++) {
      tj = t.charAt(j - 1)
      if (si === tj) {
        cost = 0
      } else {
        cost = 1
      }
      d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }
  let res = (1 - d[n][m] / l) *100
  return res.toFixed(f)
}
fs.copyFileSync("src/player2.css", "dist/player2.css");
fs.copyFileSync("src/index.css", "dist/index.css");
fs.copyFileSync("src/DSC00485.webp", "dist/DSC00485.webp");
fs.copyFileSync("src/Saira-Light.woff2", "dist/Saira-Light.woff2");
fs.copyFileSync("src/LXGWWenKai-Light.woff2", "dist/LXGWWenKai-Light.woff2");
await start()
fs.writeFileSync(`./nonono.txt`,sade)
fs.writeFileSync(`./nononono.txt`,sadee)
fs.writeFileSync(`./picerr.txt`,picerr)
/*
function QrcMatchingYrcTimeline(qrcjson, yrcjson){
    let Num_matches = 0;
    for(const liney of yrcjson){
        for(const lineq of qrcjson){
            if(Math.abs(liney.time - lineq.time) < 0.5){
                Num_matches++;
                break;
            }
            if(lineq.time > liney.time){
                break;
            }
        }
    }
    return Num_matches;
}
function sjzzh(sjzx){
    sjz = parseInt(sjzx);
    const min = Math.floor(sjz / 60000);
    const sec = Math.floor(sjz / 1000);
    const decimal = sjz / 1000 - Math.floor(sjz / 1000);
    const zzxs = decimal.toFixed(3)
    return `${min}:${sec}.${zzxs}`
}
*/
