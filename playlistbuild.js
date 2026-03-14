import { build } from "esbuild";
import fs from "fs";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { console } from "inspector";
import querystring from 'querystring';
//喵喵喵！
//await fs.promises.rm('dist', { recursive: true, force: true });
const metingapi_url='https://api.qijieya.cn/meting/'//好人一生平安！
//const metingapi_url='https://api.injahow.cn/meting/'//好人一生平安！
const qqmusiclyric_api ='http://38.76.201.17:5000/'
const qqyuan = true;//我们联合起来！
const yuming ='https://etmusic.emnasop.cn/'
const indexpage_max = 50;
const async_max = 30;//让暴风雨来得更猛烈些吧！
const async_downfile_max = 10;
const musicnum_max = 10000;
const user_agent = "hi"
const user_agent_b = "hi"
let no_wyy = 0;
let sesc_ppe = 0;
axios.defaults.timeout = 10000;
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
const simplicityindexb = fs.readFileSync("src/index.html", "utf8");
const template = fs.readFileSync("src/moban.html", "utf8");
let liebiao = "";
let liebiaoj = [];
let o = 0;
let mobanc =""
let simplicitylibiao = ""
async function start(){
    let dd = 0;
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
    fs.writeFileSync(`./dist/${indexpageo}.html`, indexhtml)
    fs.writeFileSync(`./dist/simplicityindex.html`, simplicityindexr)
    console.log("successfully")
}
let async_nu = 0
let yureliebiao = "";
let indexpageo = 1;
let downfile_task;
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
        const musicid = musicd.url.match(/\d+$/);
        const metadata = {name:musicd.name, artist:musicd.artist}
        liebiaoj.push(metadata)
        let json = await YrcToJson(musicid[0],metadata);
        if(qqyuan){
        //替补
            let jsonq;
            if(!json.metadata.zq){
                no_wyy++;
                jsonq= await QQJsonGET(json.metadata.ti,json.metadata.ar,json.metadata.al,json);
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
                    sesc_ppe++;
                }else{
                    sesc_ppe++;
                }
            }
        }
        
        if(!json) {
            async_nu--;
            return;
        }
        const task = downMusicFilePut(json, musicd);
        rwd.push(task)
        mobanc +=`
            <div class="card" url="./${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html">
                <img src="./musicfile/img/${filenamecl(json.metadata.al)}.jpg" alt="${filenamecl(json.metadata.al)}专辑" class="card-image">
                <div class="card-content">
                    <div>
                        <h3 class="card-ti">${json.metadata.ti}</h3>
                        <p class="card-ar">——${filenamecl(json.metadata.ar)}</p>
                        <p class="card-al">${json.metadata.ti==json.metadata.al?"":filenamecl(json.metadata.al)}</p>
                    </div>
                </div>
            </div>`
        //liebiaoj.push({name:json.metadata.ti, artist:json.metadata.ar, album:json.metadata.al})
        simplicitylibiao += `<li><a href="./${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html">${json.metadata.ti} - ${json.metadata.ar} · ${json.metadata.ti==json.metadata.al?"":json.metadata.al}</a></li>`
        fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.json`,JSON.stringify(json), "utf8")
        let ddyyweb = template
            .replace(/{{title}}/g, `${json.metadata.ti} - ${json.metadata.ar} · ${json.metadata.al}`)
            .replace(/{{filename}}/g, `${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`)
            .replace('https://picsum.photos/400/400', `./musicfile/img/${filenamecl(json.metadata.al)}.jpg`)
        fs.writeFileSync(`./dist/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.html`, ddyyweb)
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
async function downMusicFilePut(json,musicd){
    while(async_downfile >= async_downfile_max){
        await delay(50);
    }
    async_downfile++;
    if(!fs.existsSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`)){
        const music = await axios.get(musicd.url, { responseType: 'arraybuffer' ,headers: {'user-agent': user_agent}});
        fs.writeFileSync(`dist/musicfile/${filenamecl(json.metadata.ti)} - ${filenamecl(json.metadata.ar)} · ${filenamecl(json.metadata.al)}.mp3`,music.data)
    }
    async_downfile--;
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function filenamecl(name){
    if(!name){
        return '';
    }
    let result = name.replace(/\//g,",").replace(/\*/g,"x").replace(/\"/g,"'").replace(/\#/g,"").replace(/\>/g,"→").replace(/\</g,"←").replace(/\:/g,"%3A").replace(/\?/g,"%3F")//“#”是URL注释符，在此替换
    if(result.length>30) result = result.slice(0,5-result.length)+" ··· "+result.slice(result.length-5)
    return result;
}
async function YrcToJson(musicid, meta){
    function prpdl(yrc, timesec){
        const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
        let pairif = false;
        let romaif = false;
        let pairtext = "";
        let min_pairtime = 3;
        let min_romatime = 3;
        if(yrc.tlyric.lyric){
            const pairlyrics = yrc.tlyric.lyric.split("\n").filter(item => timeTagRegex.test(item));
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
            const romalyrics = yrc.romalrc.lyric.split("\n").filter(item => timeTagRegex.test(item));
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
    json.metadata.nolyric = json.lyrics.length===0
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
async function QQJsonGET(name,artist,album,yrcjson){
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
    //const datae = await axios.get(`${qqmusiclyric_api}?name=${encodeURIComponent(name.replace(/ - .*/, ''))}&artists=${encodeURIComponent(artist.replace(/\/.*/, ''))}&album=${encodeURIComponent(album)}&cid=${i}`)
    let Request_timed_out_b = false;
    let nme = await axios.get(`https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(name)}`,{validateStatus: function (status) {return (status==200)||(status==502)||(status==500);},headers: {'user-agent': user_agent_b}})
    .catch(err => {
    if (err.code === 'ECONNABORTED') {
        console.error('api.vkeys.cn请求超时！');
        Request_timed_out_b = true;
    }
    });
    while(nme.status!==200||Request_timed_out_b){
        console.error("api.vkeys.cn Request failed_       sss")
        await delay(1000);
        nme = await axios.get(`https://api.vkeys.cn/v2/music/tencent/search/song?word=${encodeURIComponent(name)}`,{validateStatus: function (status) {return (status==200)||(status==502)||(status==500);},headers: {'user-agent': user_agent_b}})
        Request_timed_out_b = true;
    }
    /*
    准确度不高已被暂时遗弃
    let name_pipei_max = 0;
    let mi;
    for(let i = 0;true;i++){
        if(!nme.data.data[i])break;
        let aru = similar(nme.data.data[i].singer,artist)
        let tiu = similar(nme.data.data[i].name,name)
        if(aru+tiu>name_pipei_max){//&& tiu>50 && alu>50
            name_pipei_max = aru
            mi = i
        }
    }*/
    
    if(!nme.data.data||!Array.isArray(nme.data.data)) {sadee = `${sadee}${name} - ${artist} ~ ${album}\n`;return};
    let pipei_max = 0;
    let qrcjson;
    let id;
    //不是自己的API，不寒碜，干脆全部试一遍awa
    for(let i=0;i<nme.data.data.length&&i<2;i++){//添加小于2以屏蔽后面准确度的不高的结果
        let Request_timed_out = false;
        let datae = await axios.get(`https://api.vkeys.cn/v2/music/tencent/lyric?id=${nme.data.data[i].id}`,{validateStatus: function (status) {return (status==200)||(status==502)||(status==500);},headers: {'user-agent': user_agent_b}})//api有时会出现502错误
        .catch(err => {
        if (err.code === 'ECONNABORTED') {
            console.error('api.vkeys.cn请求超时！');
            Request_timed_out = true;
        }
        });

        while(datae.status!==200||Request_timed_out){
            console.error("api.vkeys.cn Request failed")
            await delay(1000);
            datae = await axios.get(`https://api.vkeys.cn/v2/music/tencent/lyric?id=${nme.data.data[i].id}`,{validateStatus: function (status) {return (status==200)||(status==502)||(status==500);},headers: {'user-agent': user_agent_b}})
            .catch(err => {
            if (err.code === 'ECONNABORTED') {
                console.error('api.vkeys.cn请求超时！');
                Request_timed_out = true;
            }
            });
        }
        if(!datae.data.data) return;
        let qrc={};
        qrc.orig = datae.data.data.yrc
        qrc.ts = datae.data.data.trans
        qrc.roma = datae.data.data.roma
        let qrcjsonn = QrcToJson(qrc,nme.data.data[i].id,0)
        if(yrcjson.metadata.nolyric){
            qrcjson=qrcjsonn
            qrcjson.metadata.apimode = 1;
            break;
        }
        let pipeinum = QrcMatchingYrcTimeline(qrcjsonn.lyrics, yrcjson.lyrics)
        if(pipeinum>pipei_max){//最开始的特权+2
            pipei_max=pipeinum
            qrcjson=qrcjsonn
            qrcjson.metadata.apimode = 1;
            id=nme.data.data[i].id;
        }
    }
    if(qrcjson){
        return qrcjson
    }
    //备用API，与前者相比能获取的歌词较少，大道至简（雾
    let datas = await axios.get(`${qqmusiclyric_api}?name=${encodeURIComponent(name.replace(/ - .*/, ''))}&artists=${encodeURIComponent(artist.replace(/\/.*/, ''))}&album=${encodeURIComponent(album)}`)
    qrcjson = QrcToJson(datas.data,datas.data.id,1)
    qrcjson.metadata.apimode = 2;
    //qrcjson.metadata.nmess = nme.data;//调试用
    return qrcjson
}
function QrcToJson(qrcd,id, apinu){
    let qrc = qrcd;
    const metadataRegex = /^\s*\[([a-zA-Z]+)\s*:\s*(.*?)\]\s*$/;
    const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
    const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
    const regex = /(.*?)\((\d+),(\d+)\)/g;
    function prpdlq(qrc, timesec,apinu){
        const timeTagRegex = /\[(\d+):(\d+)(?:[.:](\d+))?\](.*)/;
        const zqTagRegex = /\[(\d+),(\d+)?\](.*)/
        let pairif = false;
        let romaif = false;
        let pairtext = "";
        let min_pairtime = 3;
        let min_romatime = 3;
        if(qrc.ts){
            let pairlyrics;
            let lyricMatch;
            if(apinu===0){
                pairlyrics = qrc.ts.split("\n").filter(item => timeTagRegex.test(item));
            }
            if(apinu===1){
                pairlyrics = qrc.ts.split("\n").filter(item => zqTagRegex.test(item));
            }
            for(let i = 0; i < pairlyrics.length; i++){
                lyricMatch = apinu===0?pairlyrics[i].match(timeTagRegex):pairlyrics[i].match(zqTagRegex);
                if(!lyricMatch) continue;
                let text = apinu===0?lyricMatch[4]:lyricMatch[3]
                const decimal = apinu===0?(lyricMatch[3] ? (lyricMatch[3].toString().length === 2 ? parseInt(lyricMatch[3]) / 100 : parseInt(lyricMatch[1])/1000):0):0
                let timesecp = apinu===0?parseInt(lyricMatch[1]) * 60 + parseInt(lyricMatch[2]) + decimal:lyricMatch[1]/1000
                if(min_pairtime > Math.abs(timesec - timesecp)){
                        min_pairtime = Math.abs(timesec - timesecp);
                        pairtext = text.replace('//', '');//TX特有的局部无翻译文本的替换字符
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
                if(min_romatime > Math.abs(timesec - timesecp)){
                    min_romatime = Math.abs(timesec - timesecp);
                    romatext = text;
                }
            }
            romaif = true;
        }
        return {pairtext,pairif,romatext,romaif};
    }
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
            pdjg = prpdlq(qrc, timesec, apinu)
            json.lyrics.push({time: timesec,text: text,etext: eljson,pairlyric: pdjg.pairtext,romanizationslyric: pdjg.romatext})
        }
        json.metadata.nolyric = json.lyrics.length === 0;
        json.metadata.roma = pdjg?pdjg.romaif:false
        json.metadata.pair = pdjg?pdjg.pairif:false
    }else{
        json.metadata.nolyric =true;
        json.metadata.zq = false;
        json.metadata.roma = false;
        json.metadata.pair = false;
    }
    json.metadata.qqmusicid = id;
    return json;
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
        fs.writeFile(`./dist/musicfile/img/${filenamecl(albumName)}.jpg`, imageResponse.data, (err) => {//以专辑名作为名称，减少空间浪费
            picerr+=err?`${err}\n`:''
            yureliebiao += encodeURI(`${yuming}musicfile/img/${filenamecl(albumName)}.jpg`) +`\n`
        });
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
fs.writeFileSync(`./yureurl.txt`,yureliebiao)
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
