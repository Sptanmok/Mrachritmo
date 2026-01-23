const audio = document.getElementById('audio');
let lyricpath;
let currentLyricIndex = -1;
let wordElements = [];
const lyricElement = document.getElementById('lyric');
const pairLyricElement = document.getElementById('pairlyric');
const romaLyricElement = document.getElementById('romalyric');
const title = document.title
let jsonlyrics;
const canvas = document.getElementById('spectrum');
const ctx = canvas.getContext('2d');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
let LiteralRenderingModeSelection = Math.floor(Math.random() * (3)) + 1;
const LiteralRenderingModeSelectionall = 3;
let bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
const dd = audioContext.createMediaElementSource(audio);
dd.connect(analyser);
analyser.connect(audioContext.destination);
main = document.querySelector(".main");
if(audio.getAttribute('lyricpath')){
	lyricpath = audio.getAttribute('lyricpath');
}else{
	lyricpath = audio.getAttribute('src').replace(/\.[^.]*$/, ".json");
}
fetch(lyricpath)
  .then(response => {
    if (!response.ok) {
      throw new Error('json response was not ok');
    }
    return response.json();
  })
  .then(data => {
    jsonlyrics = data;
    console.log(jsonlyrics);
    initLyrics()
  })
function initLyrics() {
	if(!jsonlyrics.lyrics[0] || jsonlyrics.lyrics[0].time > 0){
		let defaultLyric = !jsonlyrics.metadata.nolyric ? {"time": 0.00,"text": "Enjoy to the fullest!","etext": [{"Duration": 0.10,"start": 0.0,"end": 0.1,"text": "Enjoy to the fullest :)"}]} : {"time": 0.00,"text": "Write your own lyrics to pure instrumental music!","etext": [{"Duration": 0.10,"start": 0.0,"end": 0.1,"text": "Write your own lyrics to pure instrumental music!"}]}
		jsonlyrics.lyrics.unshift(defaultLyric);
	}
    if(jsonlyrics.metadata.zq){
        setInterval(updateLyrics, 15);
    }
    if(!jsonlyrics.metadata.zq){
        lyricElement.classList.add('lowfadeinzb');
        setInterval(lowupdateLyrics, 50);
    }
    setInterval(changeTitle, 50);
    let alimg = document.querySelector(".img");
    if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: jsonlyrics.metadata.ti,
            artist: jsonlyrics.metadata.ar,
            album: jsonlyrics.metadata.al,
            artwork: [
            {
                src: alimg.src,
                sizes: "1400x1400",
                type: "image/jpeg"
            }
            ]
        });
    }
}
let zt = 1;
function updateLyrics() {
    const currentTime = audio.currentTime;
    let newIndex = -1;
    for (let i = 0; i < jsonlyrics.lyrics.length; i++) {
        if (currentTime >= jsonlyrics.lyrics[i].time) {
            newIndex = i;
        } else {
            break;
       }
    }
	if (audio.readyState !== 4 && audio.readyState !== 3){
		lyricElement.innerHTML = "Loading music...";
		zt = 2;
		return;
	}
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
        currentLyricIndex = newIndex;
        displayCurrentLyric();
    }
	if(zt === 2){
		displayCurrentLyric();
		zt = 1;
	}
    if (currentLyricIndex !== -1) {
		if(LiteralRenderingModeSelection === 2 || LiteralRenderingModeSelection === 3){
			requestAnimationFrame(() => fadeWords(currentTime));
		}else{
            requestAnimationFrame(() => highlightWords(currentTime));
		}
    }
	const targetClass =  LiteralRenderingModeSelection === 2 || LiteralRenderingModeSelection === 3 ? "textt" : "text";
    if(!lyricElement.classList.contains(targetClass)) {
        lyricElement.className = targetClass;
    }
}
function displayCurrentLyric() {
	let htmllyric = '';
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
    for (let i = 0; i < currentLyric.etext.length; i++) {
        htmllyric += `<span style="">${currentLyric.etext[i].text}</span>`;
    }
	lyricElement.innerHTML = htmllyric;
	wordElements = lyricElement.getElementsByTagName('span');
    pairLyricElement.textContent = currentLyric.pairlyric;
    romaLyricElement.textContent = currentLyric.romanizationslyric;
    if(LiteralRenderingModeSelection === 2 || LiteralRenderingModeSelection === 3) arowfadeWords();
    if(LiteralRenderingModeSelection === 3){
        arowfadeWordsmode3()
    }
}
function arowfadeWordsmode3(){
    for(let i = 0;i < wordElements.length;i++){
        let bianD = Math.ceil(4 - (Math.random())*4)
        let xcs = 20-(Math.random())*40
        let inX;let inY;let outX;let outY;
        if(bianD===1){inY=20;inX=xcs;outY=-20;outX=-xcs;}
        if(bianD===2){inX=-20;inY=xcs;outX=20;outY=-xcs;}
        if(bianD===3){inY=-20;inX=xcs;outY=20;outX=-xcs;}
        if(bianD===4){inX=20;inY=xcs;outX=-20;outY=-xcs;}
        wordElements[i].style.setProperty('--inX', `${inX}px`);
        wordElements[i].style.setProperty('--inY', `${inY}px`);
        wordElements[i].style.setProperty('--outX', `${outX}px`);
        wordElements[i].style.setProperty('--outY', `${outY}px`);
    }
}
function arowfadeWords(){
    let smjgtime = 0.9;
    /*
    for(let b=0;b < jsonlyrics.lyrics[currentLyricIndex].etext.length;b++){
        if(jsonlyrics.lyrics[currentLyricIndex].etext[b] && jsonlyrics.lyrics[currentLyricIndex].etext[b].Duration < smjgtime){
            smjgtime = jsonlyrics.lyrics[currentLyricIndex].etext[b].Duration
        }
    }
    */
    smjgtime = jsonlyrics.lyrics[currentLyricIndex+1]?jsonlyrics.lyrics[currentLyricIndex+1].time-jsonlyrics.lyrics[currentLyricIndex].etext[jsonlyrics.lyrics[currentLyricIndex].etext.length-1].start-0.2:0.9//0.2为淡出动画时间
    if(smjgtime > 0.8){
        smjgtime = 0.8
    }
    if(smjgtime < 0.6){
        smjgtime = 0.6
    }
    lyricElement.style.setProperty('--inTime', `${smjgtime}s`);
    //  根据歌词间隔时长设置淡入时间，但是不允许大于0.8s或小于0.4s
}
function fadeWords(currentTime){
	const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
	let outtimes = [];
	if(jsonlyrics.lyrics[currentLyricIndex + 1] && jsonlyrics.lyrics[currentLyricIndex + 1].time - currentLyric.etext[currentLyric.etext.length - 1].start >= wordElements.length * 0.03 + 0.2){
		//逐字/词退出
        let n = 1;
		for(let word of wordElements){
			let Time = jsonlyrics.lyrics[currentLyricIndex + 1].time - (( wordElements.length - n ) * 0.03 + 0.2);
			outtimes.push(Time);
			n++;
		}
		let a = 0;
		for(const outtime of outtimes){
			if(outtime > currentTime){
				wordElements[a].classList.remove('fade-out');
				continue;
			}
			wordElements[a].classList.add('fade-out');
			wordElements[a].classList.remove('fade-in');
			a++;
		}
		lyricElement.style.setProperty('--outTime', `0.2s`);
	}else if(jsonlyrics.lyrics[currentLyricIndex + 1]){
        //整行退出
            let outTime = jsonlyrics.lyrics[currentLyricIndex+1].time-currentLyric.etext[currentLyric.etext.length-1].start-0.6
            outTime = outTime<0.1?0.1:(outTime<0.2?outTime:0.2)
            const time = jsonlyrics.lyrics[currentLyricIndex + 1].time - outTime;
            if(currentTime < time){
                for(let i = 0;i < wordElements.length;i++){
                    wordElements[i].classList.remove('fade-out');
                }
            }
            if(currentTime >= time){
                for(let i = 0;i < wordElements.length;i++){
                    wordElements[i].classList.add('fade-out');
                    wordElements[i].classList.remove('fade-in');
                }
            }
            lyricElement.style.setProperty('--outTime', `${outTime}s`);
    }
    for (let i = 0; i < currentLyric.etext.length; i++) {
        const word = currentLyric.etext[i];//简化m
        if (currentTime >= word.start && !wordElements[i].classList.contains('fade-out')) { //判断时间
            wordElements[i].classList.add('fade-in');
        } else if (currentTime < word.start && wordElements[i]) {
            wordElements[i].classList.remove('fade-in');
        }
    }
}
function highlightWords(currentTime) {
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
	for (let i = 0; i < currentLyric.etext.length; i++) {
        const word = currentLyric.etext[i];
        if (currentTime >= word.start && currentTime <= word.end) {
            const progress = ((currentTime - word.start) / word.Duration) * 100;
            if (wordElements[i]) {
                wordElements[i].style.setProperty('--progress', `${progress}%`);
            }
        } else if (currentTime > word.end && wordElements[i]) {
            wordElements[i].style.setProperty('--progress', '100%');
        } else if (wordElements[i]) {
            wordElements[i].style.setProperty('--progress', '0%');
        }
    }
}
function changeTitle() {
	if (document.hidden == true && audio.paused == false) {
		if(document.title !== jsonlyrics.lyrics[currentLyricIndex].text){
			document.title = jsonlyrics.lyrics[currentLyricIndex].text;
		}
	}else if (document.title !== title){
		document.title = title;
	}
}
//频谱条
const barWidth = (canvas.width / bufferLength) * 2.5;
function drawSpectrum() {
  requestAnimationFrame(drawSpectrum);
  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let barHeight;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];
    ctx.fillStyle = "white";
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}
canvas.width = main.clientWidth - 40;
bufferLength = Math.floor( (canvas.width + 1 ) / (barWidth + 1) );
audio.onplay = () => {
  audioContext.resume().then(() => {
    drawSpectrum();
  });
};
//键盘监测区
document.addEventListener('keydown', function(event) {
   if (event.key === 't' && LiteralRenderingModeSelection < LiteralRenderingModeSelectionall) {
       LiteralRenderingModeSelection++;
   }else if(event.key === 't' && LiteralRenderingModeSelection >= LiteralRenderingModeSelectionall) {
	   LiteralRenderingModeSelection = 1;
   }
});
window.addEventListener('resize', () => {
	canvas.width = main.clientWidth - 40;
	bufferLength = Math.floor( (canvas.width + 1 ) / (barWidth + 1) );
});
function lowupdateLyrics(){
    const currentTime = audio.currentTime;
    let newIndex = -1;
    for (let i = 0; i < jsonlyrics.lyrics.length; i++) {
        if (currentTime >= jsonlyrics.lyrics[i].time) {
            newIndex = i;
        } else {
            break;
        }
    }
	if (audio.readyState !== 4 && audio.readyState !== 3){
		lyricElement.innerHTML = "Loading music...";
		zt = 2;
		return;
	}
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
        currentLyricIndex = newIndex;
        lyricElement.innerHTML = jsonlyrics.lyrics[newIndex].text;
        pairLyricElement.textContent = jsonlyrics.lyrics[newIndex].pairlyric;
        romaLyricElement.textContent = jsonlyrics.lyrics[newIndex].romanizationslyric;
    }
    if(jsonlyrics.lyrics[newIndex+1] && jsonlyrics.lyrics[newIndex+1].time - jsonlyrics.lyrics[newIndex].time > 0.2 && currentTime >= jsonlyrics.lyrics[newIndex+1].time-0.2){
        lyricElement.classList.add('fade-out');
        lyricElement.classList.remove('fade-in');
    }else{
        lyricElement.classList.remove('fade-out');
        lyricElement.classList.add('fade-in');
    }
	if(zt === 2){
        lyricElement.innerHTML = jsonlyrics.lyrics[newIndex].text;
        pairLyricElement.textContent = jsonlyrics.lyrics[newIndex].pairlyric;
        romaLyricElement.textContent = jsonlyrics.lyrics[newIndex].romanizationslyric;
		zt = 1;
	}
}