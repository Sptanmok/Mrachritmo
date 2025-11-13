import { build } from "esbuild";
import fs from "fs";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { console } from "inspector";
import querystring from 'querystring';

//await fs.promises.rm('dist', { recursive: true, force: true });
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
let o = 1;
async function start(){
    liebiao = "";
    let dd = 0;
    let indexhtml;
    for(const playmusic of playmusics){
        const list = await axios.get(`https://meting.qjqq.cn/?type=playlist&id=${playmusic.match(/\d+$/)}`);
        await jxgd(list.data);
        if(o > 700) {
            break;
        }
    }
    indexhtml = index.replace(/{{link}}/g, liebiao)
    fs.writeFileSync("./dist/index.html", indexhtml)
    console.log("successfully")
}
async function jxgd(listd){
    for(const musicd of listd){
        if(o > 700) {
            console.warn("音乐过多，停止生成");
            break;
        }
        console.log(o);
        const musicid = musicd.url.match(/\d+$/);
        const metadata = {name:musicd.name,artist:musicd.artist}
        let json = await YrcToJson(musicid[0],metadata);
        /*
        if(json.metadata.nolyric || !json.metadata.zq){
            //替补
            const jg = await searchqqmusic(metadata.name, metadata.artist);
            if(jg){
                QrcToJson(jg,json.metadata);
            }
        }
        */
        if(!json) continue;
        liebiao += `<li><a href="./${filenamecl(json.metadata.ti)}.html">${json.metadata.ar} - ${json.metadata.ti}</a></li>`
        if(!fs.existsSync(`dist/musicfile/${filenamecl(json.metadata.ti)}.mp3`)){
            const music = await axios.get(musicd.url, { responseType: 'arraybuffer' });
            fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)}.mp3`,music.data)
        }
        fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)}.json`,JSON.stringify(json), "utf8")
        let ddyyweb = template
            .replace(/{{title}}/g, `${json.metadata.ar} - ${json.metadata.ti}`.replace("/",","))
            .replace(/{{filename}}/g, filenamecl(json.metadata.ti) + ".mp3")
            .replace('https://picsum.photos/400/400', `./musicfile/img/${filenamecl(json.metadata.al)}.jpg`)
        fs.writeFileSync(`./dist/${filenamecl(json.metadata.ti)}.html`, ddyyweb)
        o++;
    }
}
function filenamecl(name){
    const result = name.replace(/\//g,",").replace(/\*/g,"x").replace(/\"/g,"'")
    return result;
}
async function YrcToJson(musicid, meta){
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /\((\d+),(\d+),(\d+)\)([^()\n]+)/g;
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
    if(yrc.yrc){
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
                    const totalSecondsEnd =  start + Duration
                    const texte = ttt[4].replace(/ /g, '&nbsp;')
                    eljson.push({ Duration: Duration, start: start, end: totalSecondsEnd, text: texte });
                }
                json.metadata.zq = eljson.length > 0;
            }
            text = text.replace(/\([^)]*\)/g, '')
            pdjg = prpdl(yrc, timesec)
            json.lyrics.push({time: timesec,text: text,etext: eljson,pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
    }else if(yrc.lrc.lyric){//没有逐字/词歌词
        let lyrics = yrc.lrc.lyric.split("\n").filter(item => timeTagRegex.test(item))
        for(const lyric of lyrics){
            let lyricMatch = lyric.match(timeTagRegex);
            const decimal = lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000;
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
async function searchqqmusic(title,artist) {
    let url = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_search_pc_lrc.fcg?'
    let data = {
        SONGNAME: title,
        SINGERNAME: artist,
        TYPE: 2,
        RANGE_MIN: 1,
        RANGE_MAX: 20
    }
    url += querystring.stringify(data)
    const headers = {'Referer':'https://y.qq.com'}
    let body = await axios.get(url,headers);
    let xmlDoc = mxml.loadString(body)
    let songList = xmlDoc.findElement('songinfo') || []
    if(songList == []){
        return false;
    }
    let stageSongList = []
    for (const song of songList) {
        let id = song.getAttr('id')
        if (id == null) continue
        stageSongList.push(id)
    }
    console.log(stageSongList)
    debugger
    return stageSongList[0];
}
async function QrcToJson(musicid,meta){
    let headers = {}
    headers = {'Referer':'https://y.qq.com','Host':'u.y.qq.com'}
    // notes: some params may not be required, I'm not tested. //来自原作者的提醒
    let postData = {
        comm: {
            _channelid: '0',
            _os_version: '6.2.9200-2',
            authst: '',
            ct: '19',
            cv: '1873',
            //guid: '30D1D7C616938DDB575AF16E56D44BD4',
            patch: '118',
            psrf_access_token_expiresAt: 0,
            psrf_qqaccess_token: '',
            psrf_qqopenid: '',
            psrf_qqunionid: '',
            tmeAppID: 'qqmusic',
            tmeLoginType: 2,
            uin: '0',
            wid: '0'
        },
        'music.musichallSong.PlayLyricInfo.GetPlayLyricInfo': {
            method: 'GetPlayLyricInfo',
            module: 'music.musichallSong.PlayLyricInfo'
        }
    }
    let songID = musicid | 0
    postData['music.musichallSong.PlayLyricInfo.GetPlayLyricInfo']['param'] = {
        crypt : 1,
        ct : 19,
        cv : 1873,
        lrc_t : 0,
        qrc : 1,
        qrc_t : 0,
        roma : 1,
        roma_t : 0,
        songID : songID,
        trans : 1,
        trans_t : 0,
        type : -1
    }
    let url = 'https://u.y.qq.com/cgi-bin/musicu.fcg?'
    let params = {
        pcachetime: new Date().getTime() | 0
    }
    url += querystring.stringify(params)
    console.log(url)
    let postDataString = JSON.stringify(postData)
    const qqmsj = await axios({method: 'post',url: url,headers: headers,data: postDataString})
    console.log(qqmsj)
    debugger
    let obj = JSON.parse(qqmsj.data)
    if (obj['code'] != 0) {
        return
    }

    let lyricObjRoot = obj['music.musichallSong.PlayLyricInfo.GetPlayLyricInfo']
    if (lyricObjRoot['code'] != 0) {
        return
    }

    let lyricObj = lyricObjRoot['data']
    if (lyricObj['songID'] != songID) {
        return
    }
    lyricText = JSON.stringify(lyricObj)
    console.log(lyricText);
    debugger
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
            const decimal = lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000;
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
            const decimal = lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000;
            let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
            if(Math.abs(timesec - timesecp) < 1){
                romatext = text;
            }
        }
        romaif = true;
    }
    return {pairtext,pairif,romatext,romaif};
}
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
        fs.writeFile(`./dist/musicfile/img/${filenamecl(albumName)}.jpg`, imageResponse.data, (err) => {});
    }
    return {albumName,albumLink};
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
