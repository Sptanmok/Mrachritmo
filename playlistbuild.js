import { build } from "esbuild";
import fs from "fs";
import axios from 'axios';
import * as cheerio from 'cheerio';

//await fs.promises.rm('dist', { recursive: true, force: true });
if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
if (!fs.existsSync("dist/musicfile")) fs.mkdirSync("dist/musicfile", { recursive: true });
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
async function start(){
    let dd = 0;
    let indexhtml;
    let o = 1;
    for(const playmusic of playmusics){
        const list = await axios.get(`https://meting.qjqq.cn/?type=playlist&id=${playmusic.match(/\d+$/)}`);
        await jxgd(list.data, o);
    }
    indexhtml = index.replace(/{{link}}/g, liebiao)
    fs.writeFileSync("./dist/index.html", indexhtml)
    console.log("successfully")
}
async function jxgd(listd,o){
    for(const musicd of listd){
        if(o >= 50) {
            console.warn("音乐过多，停止生成");
            break;
        }
        console.log(o);
        const musicid = musicd.url.match(/\d+$/);
        let json = await YrcToJson(musicid);
        if(!json) continue;
        imgload(musicid, json.metadata.ti)
        liebiao += `<li><a href="./${json.metadata.ti.replace("/",",")}.html">${json.metadata.ar} - ${json.metadata.ti}</a></li>`
        if(!fs.existsSync(`dist/musicfile/${json.metadata.ti.replace("/",",")}.mp3`)){
            const music = await axios.get(musicd.url, { responseType: 'arraybuffer' });
            fs.writeFileSync(`dist/musicfile/${json.metadata.ti.replace("/",",")}.mp3`,music.data)
        }
        fs.writeFileSync(`dist/musicfile/${json.metadata.ti.replace("/",",")}.json`,JSON.stringify(json), "utf8")
        let ddyyweb = template
            .replace(/{{title}}/g, `${json.metadata.ar} - ${json.metadata.ti}`.replace("/",","))
            .replace(/{{filename}}/g, json.metadata.ti.replace("/",",") + ".mp3")
            .replace('https://picsum.photos/400/400', `./musicfile/${json.metadata.ti}.jpg`)
        fs.writeFileSync(`./dist/${json.metadata.ti.replace("/",",")}.html`, ddyyweb)
        o++;
    }
}
async function YrcToJson(musicid){
    const datae = await axios.get(`https://music.163.com/api/song/lyric?os=pc&id=${musicid}&yv=-1&tv=-1&rv=-1`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}})
    const yrc = datae.data;
    if(!yrc.tlyric && !yrc.yrc){
        //没有歌词（大概率纯音乐）
        return false;
    }
    if(yrc.tlyric && !yrc.yrc){
        //没有中文翻译或不是逐字/词歌词
        return false;
    }
    yrc.yrc.lyric = yrc.yrc.lyric.replace(/^\uFEFF/, '');
    const lyrics = yrc.yrc.lyric.split("\n");
    let json ={metadata: {}, lyrics: [],};
    const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /\((\d+),(\d+),(\d+)\)([^()\n]+)/g;
    //let zq = false;
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
                const totalSecondsEnd =  start + Duration
                const texte = ttt[4].replace(/ /g, '&nbsp;')
                eljson.push({ Duration: Duration, start: start, end: totalSecondsEnd, text: texte });
            }
        json.metadata.zq = eljson.length > 0;
        }
        text = text.replace(/\([^)]*\)/g, '')
        json.lyrics.push({time: timesec,text: text,etext: eljson})
    }
    const pairlyrics = yrc.tlyric.lyric.split("\n");
    if(pairlyrics){
        for(const pairlyric of pairlyrics){
            let lyricMatch = pairlyric.match(timeTagRegex);
            if(!lyricMatch) continue;
            let text = lyricMatch[4]
            const decimal = lyricMatch[3].toString().length === 2 ? lyricMatch[3] / 100 : lyricMatch[3] / 1000;
            let timesec = lyricMatch[1] * 60 + lyricMatch[2] + decimal
            const pairlyricif = json.lyrics.findIndex(lybl => lybl.time  <= timesec);
            if (pairlyricif != -1) {
                json.lyrics[pairlyricif].pairlyric = text;
            }
        }
    }
    const romanizations = yrc.romalrc.lyric.split("\n");
    for(const romanization of romanizations){
        let lyricMatch = romanization.match(timeTagRegex);
        if(!lyricMatch) continue;
        let text = lyricMatch[4]
        const decimal = lyricMatch[3].toString().length === 2 ? lyricMatch[3] / 100 : lyricMatch[3] / 1000;
        let timesec = lyricMatch[1] * 60 + lyricMatch[2] + decimal
        const romanizationslyricif = json.lyrics.findIndex(lybl => lybl.time <= timesec);
        if (romanizationslyricif != -1) {
            json.lyrics[romanizationslyricif].romanizationslyric = text;
        }
    }
    const meta = await axios.get(`https://meting.qjqq.cn/?type=song&id=${musicid}`)
    json.metadata.ti = meta.data[0].name
    json.metadata.ar = meta.data[0].artist
    return json;
}
async function imgload(musicid, name){
    const pijt = await axios.get(`https://music.163.com/song?id=${musicid}`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}});
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
        return;
    }
    const imageResponse = await axios.get(dataSrcList[0], { responseType: 'arraybuffer' });
    fs.writeFileSync(`./dist/musicfile/${name.replace("/",",")}.jpg`, imageResponse.data)
    return;
}
fs.copyFileSync("src/player2.css", "dist/player2.css");
fs.copyFileSync("src/index.css", "dist/index.css");
fs.copyFileSync("src/DSC00485.webp", "dist/DSC00485.webp");
fs.copyFileSync("src/Saira-Light.woff2", "dist/Saira-Light.woff2");
fs.copyFileSync("src/LXGWWenKai-Light.woff2", "dist/LXGWWenKai-Light.woff2");
start()
/*
function sjzzh(sjzx){
    sjz = parseInt(sjzx);
    const min = Math.floor(sjz / 60000);
    const sec = Math.floor(sjz / 1000);
    const decimal = sjz / 1000 - Math.floor(sjz / 1000);
    const zzxs = decimal.toFixed(3)
    return `${min}:${sec}.${zzxs}`
}
*/
