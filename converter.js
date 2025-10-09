       lyric = document.getElementById('lyric');
       const lrcFileInput = document.getElementById('lrcFile');
       const parseBtn = document.getElementById('parseBtn');
       let lrcContent;
       parseBtn.addEventListener('click', function() {
           const file = lrcFileInput.files[0];
           if (!file) {
               alert('请先选择LRC文件');
               return;
           }
           console.log("1");
           const reader = new FileReader();
           reader.onload = function(e) {
           	     console.log("start");
                    const lrcContent = e.target.result;
                    jsonlyrics = lrctojson(lrcContent);

           };
           reader.readAsText(file);
       });
       audio.ontimeupdate=function(e) {//遗留播放器字幕控制
       for(i1=0;i1<jsonlyrics.lyrics.length;i1++) {
       	if (audio.currentTime > jsonlyrics.lyrics[i1].time) {
       		lyric.innerHTML=jsonlyrics.lyrics[i1].text;
       		pairlyric.innerHTML=jsonlyrics.lyrics[i1].pairlyric;
       	}
          }
       }

       function lrctojson(lrc) {
       	const result = {
            metadata: {},
            lyrics: [],
          };
          let text = "";
          let totalSeconds = 0;
          const lines = lrc.split('\n');
          const timeTagRegex = /^\[(\d{2}):(\d{2})\.(\d{2})\](.*)/;
          const metadataRegex = /^\[(.*?):(.*)\]$/;
          console.log("2");
          //定义正则表达式
          for (line of lines) {
               if (!line.trim()) continue;
               const metadataMatch = line.match(metadataRegex);
               if (metadataMatch) {
                   result.metadata[metadataMatch[1].toLowerCase()] = metadataMatch[2];
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
       console.log(result);
       return result;
       }