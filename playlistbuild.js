import fs from "fs";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { pathToFileURL } from 'url';
import { escapeHtml, prepareDist, songHref, writeSongCatalog } from "./build-shared.js";
import { QQJsonGET } from "./src/lyric/qq.js";
//import { console } from "inspector";
//喵喵喵！
//await fs.promises.rm('dist', { recursive: true, force: true });
const metingapi_url='https://api.qijieya.cn/meting/'//好人一生平安！
//const metingapi_url='https://api.injahow.cn/meting/'//好人一生平安！
const qqmusic_api = process.env.QQMUSIC_API || "http://127.0.0.1:3030"
const qqyuan = true;//我们联合起来！r
const yuming ='https://mrachritmo.emnasop.cn/'
const indexpage_max = 500;//每页歌曲数量，过大可能导致部分手机浏览器无法打开
const async_max = 4;//让暴风雨来得更猛烈些吧！
const async_downfile_max = 2;
const musicnum_max = 10000;
const user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36"
const trytoqqlyric = true;
const jymaster = false;
const qqmusic_timeout = Number(process.env.QQMUSIC_TIMEOUT || 8000);
const skipArtwork = process.env.SKIP_ARTWORK === '1';
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
let no_wyy = 0;
let sesc_ppe = 0;
//↑↑↑配置处↑↑↑
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // 原有条件
    if (axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.code === 'ECONNRESET' ||
        error.message.includes('stream has been aborted')) {
      return true;
    }
    // 新增：当响应状态为 404 时也重试
    if (error.response && error.response.status === 404) {
      return true;
    }
    return false;
  }
});
if (isMain) await prepareDist();
const gedang = fs.readFileSync(`neteaseplaylist.txt`, 'utf8')
const playmusics = gedang.split(/\r?\n/);
const index = fs.readFileSync("src/indexmoban.html", "utf8");
const simplicityindexb = fs.readFileSync("src/index.html", "utf8");
const songs = [];
let o = 0;
let mobanc =""
let simplicitylibiao = ""
async function start(){
    console.log("开始！");
    for(const playmusic of playmusics){
        const list = await axios.get(`${metingapi_url}?type=playlist&id=${playmusic.match(/\d+$/)}`,{headers: {'user-agent': user_agent}});
        const listd = list.data
        if(!Array.isArray(listd)){
            console.error(`歌单${playmusic.match(/\d+$/)}错误！,   它不是一个数组`);
            continue;
        }
        await jxgd(listd);
        if(o > musicnum_max) {
            break;
        }
    }
    let indexhtml = index.replace(/{{link}}/g, mobanc).replace(/previous_button_hide/g, '')
    const simplicityindexr = simplicityindexb.replace(/{{link}}/g, simplicitylibiao)
    fs.writeFileSync(`./dist/${indexpageo === 1 ? 'index' : indexpageo}.html`, indexhtml)
    fs.writeFileSync(`./dist/simplicityindex.html`, simplicityindexr)
    writeSongCatalog(songs)
    console.log("successfully")
}
export { start };
let async_nu = 0
let yureliebiao = "";
let indexpageo = 1;
let rwd =[];
async function jxgd(listd){
    let rw =[];
    let indexpage = 0;
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
    async function amusic(musicd, o){
        async_nu++;
        const resolved = await resolveSong(musicd);
        const json = resolved && resolved.json;
        if(!json) {
            async_nu--;
            return;
        }
        const song = songManifest(json);
        songs.push(song);
        const task = downMusicFilePut(json, musicd, song);
        rwd.push(task)
        const href = songHref(song.id);
        mobanc +=`
            <a class="card" href="${href}" target="_blank" rel="noopener">
                <img src="./musicfile/img/${filenamecl(json.metadata.al)}.jpg" alt="${escapeHtml(json.metadata.al)}专辑" class="card-image">
                <div class="card-content">
                    <div>
                        <h3 class="card-ti">${escapeHtml(json.metadata.ti)}</h3>
                        <p class="card-ar">——${escapeHtml(json.metadata.ar)}</p>
                        <p class="card-al">${json.metadata.ti==json.metadata.al?"":escapeHtml(json.metadata.al)}</p>
                    </div>
                </div>
            </a>`
        simplicitylibiao += `<li><a href="${href}" target="_blank">${escapeHtml(json.metadata.ti)} - ${escapeHtml(json.metadata.ar)}${json.metadata.ti==json.metadata.al?"":" · "+escapeHtml(json.metadata.al)}</a></li>`
        fs.writeFileSync(`dist/musicfile/${song.lyrics}`,JSON.stringify(json), "utf8")
        //yureliebiao += encodeURI(`${yuming}${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html`) + `\n`
        //yureliebiao += encodeURI(`${yuming}musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`) +`\n`
        console.log(`${o}:${json.metadata.ti} - ${json.metadata.ar} · ${json.metadata.al}   is ok ,${json.metadata.apimode?json.metadata.apimode:"wyy"},now ppl:${(sesc_ppe/no_wyy*100).toFixed(2)}%`);
        indexpage++;
        if(indexpage>=indexpage_max){
            let indexhtml="";
            indexhtml=index.replace(/{{link}}/g, mobanc).replace(/next_button_hide/g, '')
            //非尾页启用下一页按钮（尾页处理在start函数）
            if(indexpageo!==1){
                indexhtml = indexhtml.replace(/previous_button_hide/g, '')
            }
            //非首页启用上一页按钮
            fs.writeFileSync(`./dist/${indexpageo===1?'index':indexpageo}.html`, indexhtml)
            indexpage=0;
            mobanc=""
            indexpageo++;
        }
        async_nu--;
    }
    await Promise.all(rw);
    await Promise.all(rwd);
}
let async_downfile = 0;
export async function downMusicFilePut(json,musicd,song,{force = false} = {}){
    while(async_downfile >= async_downfile_max){
        await delay(50);
    }
    async_downfile++;
    try {
        const basename = `${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}`;
        const mp3Path = `./dist/musicfile/${basename}.mp3`;
        const flacPath = `./dist/musicfile/${basename}.flac`;
        const replaceFile = async (file, data) => {
            const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
            await fs.promises.writeFile(temporary, data);
            await fs.promises.rm(file, { force: true });
            await fs.promises.rename(temporary, file);
        };
        if(!jymaster && (!fs.existsSync(mp3Path) || force)){
            const music = await axios.get(musicd.url, { responseType: 'arraybuffer' ,headers: {'user-agent': user_agent},timeout: 60000});
            await replaceFile(mp3Path,music.data)
        }
        if(jymaster && (!fs.existsSync(flacPath) || force)){
            const music = await axios.post("http://127.0.0.1:5000/download",{"id": json.metadata.CLXIIIid,"quality": "jymaster"}, {validateStatus: function (status) {return (status==200)||(status==404);}, responseType: 'arraybuffer' ,headers: {'user-agent': user_agent},timeout: 500000});
            if(music.status===404){
                const music = await axios.get(musicd.url, { responseType: 'arraybuffer' ,headers: {'user-agent': user_agent},timeout: 60000});
                await replaceFile(mp3Path,music.data)
                song.audio = `${song.id}.mp3`;
            }else{
                await replaceFile(flacPath,music.data)
            }
        }
        if(jymaster){
        const filePath = `./dist/musicfile/${filenamecl_old(json.metadata.ti)} - ${filenamecl_old(json.metadata.ar)} · ${filenamecl_old(json.metadata.al)}.flac`
        if(filePath!==`./dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.flac`){
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error(`文件不存在: ${filePath}`);
                    return;
                }

                // 异步删除文件
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`删除文件失败: ${err.message}`);
                        return;
                    }
                    console.log(`文件已删除: ${filePath}`);
                });
            });
        }
        }
    } finally {
        async_downfile--;
    }
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function filenamecl_old(name){
    if(!name){
        return '';
    }
    let result = name.replace(/\//g,",").replace(/\*/g,"x").replace(/\"/g,"'").replace(/\#/g,"").replace(/\>/g,"→").replace(/\</g,"←").replace(/\:/g,"%3A").replace(/\?/g,"%3F")//“#”是URL注释符，在此替换
    if(result.length>30) result = result.slice(0,5-result.length)+" ··· "+result.slice(result.length-5)
    return result;
}
function filenamecl(name) {
    if (!name) return '';

    // 1. 将可能引发问题的字符全部替换为下划线
    let result = name
        .replace(/[\\\/:*?"<>|#&+{}\[\]\^`~;=@$!,%]/g, '_') // 非法及特殊字符
        .replace(/ /g, '_')                                 // 空格
        .replace(/[\x00-\x1f\x7f]/g, '');                  // 删除控制字符

    // 2. 长度截断（保留前5和后5字符，中间加省略号）
    if (result.length > 30) {
        result = result.slice(0, 5) + ' ··· ' + result.slice(-5);
    }

    return result;
}
async function YrcToJson(musicid, meta){
    function prpdl(yrc, timesec,fault_tolerance){
        const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
        let pairif = false;
        let romaif = false;
        let pairtext = "";
        let min_pairtime = fault_tolerance?3:0.8;
        let min_romatime = fault_tolerance?3:0.8;
        if(yrc.tlyric.lyric){
            let pairlyrics = yrc.tlyric.lyric.split("\n").filter(item => timeTagRegex.test(item));
            if(yrc.ytlrc&&yrc.ytlrc.lyric){
                pairlyrics = yrc.ytlrc.lyric.split("\n").filter(item => timeTagRegex.test(item));
                min_pairtime = 0.0001;
            }
            for(let i = 0; i < pairlyrics.length; i++){
                let lyricMatch = pairlyrics[i].match(timeTagRegex);
                if(!lyricMatch) continue;
                let text = lyricMatch[4]
                const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
                let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
                if(min_pairtime > Math.abs(timesec - timesecp)){
                    min_pairtime = Math.abs(timesec - timesecp);
                    pairtext = text.replace('//', '');
                }
            }
            pairif = true;
        }
        let romatext = '';
        if(yrc.romalrc.lyric){
            let romalyrics = yrc.romalrc.lyric.split("\n").filter(item => timeTagRegex.test(item));
            if(yrc.yromalrc&&yrc.yromalrc.lyric){
                romalyrics = yrc.yromalrc.lyric.split("\n").filter(item => timeTagRegex.test(item));
                min_romatime = 0.0001;
            }
            for(let i = 0; i < romalyrics.length; i++){
                let lyricMatch = romalyrics[i].match(timeTagRegex);
                if(!lyricMatch) continue;
                let text = lyricMatch[4]
                const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
                let timesecp = parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal
                if(min_romatime > Math.abs(timesec - timesecp)){
                    min_romatime = Math.abs(timesec - timesecp);
                    romatext = text;
                }
            }
            romaif = true;
        }
        return {pairtext,pairif,romatext,romaif};
    }
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /\((\d+),(\d+),(\d+)\)(.*?)(?=\(\d+,\d+,\d+\)|$)/g;
    const datae = await axios.get(`https://music.163.com/api/song/lyric?os=pc&id=${musicid}&yv=-1&tv=-1&rv=-1&lv=-1`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83'},timeout: 60000})
    const yrc = datae.data;
    let json ={metadata: {zq:false,m:2}, lyrics: [],};
    let metadata_ = await metaload(musicid, meta.name)
    if(!yrc.yrc && !yrc.tlyric){
        //没有歌词（大概率纯音乐）
        json.metadata.ti = meta.name
        json.metadata.ar = meta.artist
        json.metadata.al = metadata_.albumName
        json.metadata.CLXIIIid = musicid
        json.metadata.duration = metadata_.duration || 0
        json.metadata.nolyric = true
        return json;
    }
    let pdjg = {pairtext:"",pairif:false,romatext:"",romaif:false};;
    if(yrc.yrc && yrc.yrc.lyric){
        yrc.yrc.lyric = yrc.yrc.lyric.replace(/^\uFEFF/, '');
        const lyrics = yrc.yrc.lyric.split("\n");
        let i=0;
        for(const lyric of lyrics){
            i++;
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
            pdjg = prpdl(yrc, timesec,false)
            if(!pdjg.pairif&&json.lyrics[i-1]?.pairlyric){
                pdjg = prpdl(yrc, timesec,true)
            }
            if(!pdjg.romaif&&json.lyrics[i-1]?.romanizationslyric){
                pdjg = prpdl(yrc, timesec,true)
            }
            json.lyrics.push({time: timesec,text: text,etext: eljson,pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
    }else if(yrc.lrc.lyric){//没有逐字/词歌词
        let lyrics = yrc.lrc.lyric.split("\n").filter(item => timeTagRegex.test(item))
        let i=0;
        for(const lyric of lyrics){
            i++;
            let lyricMatch = lyric.match(timeTagRegex);
            const decimal = lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[3]) / 1000) : 0;
            let timesec = parseInt(lyricMatch[1])*60+parseInt(lyricMatch[2])+decimal
            pdjg = prpdl(yrc, timesec,false)
            if(!pdjg.pairif&&json.lyrics[i-1]?.pairlyric){
                pdjg = prpdl(yrc, timesec,true)
            }
            if(!pdjg.romaif&&json.lyrics[i-1]?.romanizationslyric){
                pdjg = prpdl(yrc, timesec,true)
            }
            json.lyrics.push({time:timesec,text:lyricMatch[4],pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
    }else{
        json.metadata.nolyric = true
    }
    json.metadata.nolyric = json.lyrics.length===0
    json.metadata.ti = meta.name
    json.metadata.ar = meta.artist
    json.metadata.al = metadata_.albumName
    json.metadata.CLXIIIid = musicid
    const lastLine = json.lyrics[json.lyrics.length - 1];
    const lastWord = lastLine?.etext?.[lastLine.etext.length - 1];
    json.metadata.duration = metadata_.duration || (lastLine ? lastLine.time + (lastWord?.Duration || 0) : 0);
    json.metadata.zq = json.lyrics.some(line => line.etext && line.etext.length > 0);
    json.metadata.roma = json.lyrics.some(line => !!line.romanizationslyric);
    json.metadata.pair = json.lyrics.some(line => !!line.pairlyric);
    return json;
}
let sadee ='';



let picerr = '';
async function metaload(musicid, name){
    const pijt = await axios.get(`https://music.163.com/song?id=${musicid}`, {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'}});
    const $ = cheerio.load(pijt.data);
    let albumName = '';let albumLink = '';
    let duration = 0;
    let detailAlbum = '';
    try {
        const detail = await axios.get(`https://music.163.com/api/song/detail?ids=[${musicid}]`, {
            headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36'},
            timeout: 10000
        });
        duration = Number(detail.data?.songs?.[0]?.duration || 0) / 1000;
        detailAlbum = detail.data?.songs?.[0]?.album?.name || '';
    } catch {
        // 时长只是加分项，失败不影响歌词匹配
    }
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
    if (!albumName) albumName = detailAlbum;
    if(!skipArtwork && !fs.existsSync(`dist/musicfile/img/${filenamecl(albumName)}.jpg`)){
        const dataSrcList = [];
        $('img[data-src]').each((index, element) => {
            const dataSrc = $(element).attr('data-src');
            if (dataSrc) {
            dataSrcList.push(dataSrc);
            }
        });
        if (dataSrcList.length!==0) {
            const imageResponse = await axios.get(dataSrcList[0], { responseType: 'arraybuffer' ,timeout: 30000});
            await fs.promises.writeFile(`./dist/musicfile/img/${filenamecl(albumName)}.jpg`, imageResponse.data);
            yureliebiao += encodeURI(`${yuming}musicfile/img/${filenamecl(albumName)}.jpg`) +`\n`;
        }
    }
    return {albumName,albumLink,duration};
}
if (isMain) {
    await start()
    fs.writeFileSync(`./nononono.txt`,sadee)
    fs.writeFileSync(`./picerr.txt`,picerr)
    fs.writeFileSync(`./yureurl.txt`,yureliebiao)
}
/*
function sjzzh(sjzx){
    sjz = parseInt(sjzx);
    const min = Math.floor(sjz / 60000);
    const sec = Math.floor(sjz / 1000);
    const decimal = sjz / 1000 - Math.floor(sjz / 1000);
    const zzxs = decimal.toFixed(3)
    return `${min}:${sec}.${zzxs}`
}

axiosRetry(axios, {
  //不包括api.vkeys.cn api
  retries: 3,
  retryDelay: (retryCount) => {
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error) => {
    return (axiosRetry.isNetworkError(error) || 
           axiosRetry.isRetryableError(error) ||
           (error.response && error.response.status !== 200))&&error.response.status !== 502
  },
  shouldResetTimeout: true
});
*/


export function songManifest(json){
    const basename = `${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}`;
    return {
        id: basename,
        title: `${json.metadata.ti} - ${json.metadata.ar} · ${json.metadata.al}`,
        audio: `${basename}.${jymaster ? 'flac' : 'mp3'}`,
        lyrics: `${basename}.json`,
        image: `img/${filenamecl(json.metadata.al)}.jpg`
    };
}
export async function resolveSong(musicd){
    const musicid = musicd.url && musicd.url.match(/\d+$/);
    if(!musicid) return null;
    const metadata = { name: musicd.name, artist: musicd.artist };
    let json = await YrcToJson(musicid[0], metadata);
    if(qqyuan && (trytoqqlyric || !json.metadata.zq)){
        no_wyy++;
        const jsonq = await QQJsonGET(json.metadata.ti, json.metadata.ar, json.metadata.al, json, {
            api: qqmusic_api,
            timeout: qqmusic_timeout
        });
        const qqmeta = jsonq?.metadata || {};
        const useQQ = Boolean(jsonq && qqmeta.accepted && (qqmeta.zq || !json.metadata.zq));
        if(useQQ){
            const wyy = json;
            json = jsonq;
            json.metadataq = {
                qqmusicid: qqmeta.qqmusicid,
                qqmid: qqmeta.qqmid,
                provider: qqmeta.provider,
                offset: qqmeta.offset,
                score: qqmeta.matchScore
            };
            json.metadata.ti = wyy.metadata.ti;
            json.metadata.ar = wyy.metadata.ar;
            json.metadata.al = wyy.metadata.al;
            json.metadata.CLXIIIid = wyy.metadata.CLXIIIid;
            json.metadata.duration = wyy.metadata.duration;
        }else{
            sesc_ppe++;
            sadee += `${json.metadata.ti} - ${json.metadata.ar} ~ ${json.metadata.al}\n`;
            json.metadata.qq = {
                matched: Boolean(qqmeta.accepted),
                kept: 'netease',
                message: qqmeta.accepted ? 'QQ 无逐字歌词' : (qqmeta.message || '未匹配'),
                best: qqmeta.candidates?.[0]
                    ? {
                        id: qqmeta.candidates[0].id,
                        song: qqmeta.candidates[0].song,
                        score: qqmeta.candidates[0].score
                    }
                    : null
            };
        }
    }
    return { json, musicid: musicid[0] };
}
