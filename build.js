import { build } from "esbuild";
import fs from "fs";

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
                   totalSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) + parseInt(timeMatch[3]) / 100;//大部分为到百分位，有一些到千分位
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
                     eljson.push({ Duration: Duration.toFixed(2), start: totalSecondsStart, end: totalSecondsEnd, text: tttd });
                  }
                  tttc = ttt;
                }
               }
               
               //处理增强版lrc格式
               if (text) {
                   text = text.replace(/<[^>]*>/g, '');
                   result.lyrics.push({
                       time: totalSeconds.toFixed(2),
                       text: text,
                       etext: eljson
                   });
               }
          }
       return result;
       }

let allmusicfilename = fs.readdirSync("./src/musicfile");

const nregex = /json|lrc/;
allmusicfilename = allmusicfilename.filter(item => !nregex.test(item));

await build({
  entryPoints: ["src/player2.js"],
  bundle: true,
  minify: true,
  outfile: "dist/player2.js"
});

if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
if (!fs.existsSync("dist/musicfile")) fs.mkdirSync("dist/musicfile", { recursive: true });


const template = fs.readFileSync("src/moban.html", "utf8");
let ol = 1;
for (const musicfilename of allmusicfilename) {
  const lrcpath = "/musicfile/" + musicfilename.replace(/\.[^.]*$/, '.lrc');
  let html = template
    .replace(/{{title}}/g, musicfilename.replace(/\.[^.]*$/, ''))
    .replace(/{{filename}}/g, musicfilename)
  if (!fs.existsSync("src/musicfile/" + musicfilename.replace(/\.[^.]*$/, '.lrc'))) {
	  console.error(`没有找到${musicfilename}的对应lrc文件`);
	  continue;
  }
  fs.writeFileSync(`dist/${ol}.html`, html);
  const lyriclrc = fs.readFileSync("src" + lrcpath, "utf8");
  let lyricjson = lrctojson(lyriclrc);
  fs.writeFileSync(`dist/musicfile/${musicfilename.replace(/\.[^.]*$/, '.json')}`,JSON.stringify(lyricjson, null, 2),"utf8");
  fs.writeFileSync(`dist/${musicfilename.replace(/\.[^.]*$/, '')}.html`, html);
  fs.copyFileSync("src/musicfile/" + musicfilename, "dist/musicfile/" + musicfilename)
  console.log(`生成: dist/${musicfilename.replace(/\.[^.]*$/, '')}.html`);
  ol++;
}
fs.copyFileSync("src/player2.css", "dist/player2.css");
