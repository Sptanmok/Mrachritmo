const audio = document.getElementById('audio');
let lyricpath;
let currentLyricIndex = -1;
let wordElements = [];
const lyricElement = document.getElementById('lyric');
const pairLyricElement = document.getElementById('pairlyric');
const title = document.title
let jsonlyrics = {"time": 0.00,"text": "Loading lyrics...","etext": [{"Duration": 0.10,"start": 0.0,"end": 0.1,"text": "Loading lyrics..."}]};
let old;
const canvas = document.getElementById('spectrum');
const ctx = canvas.getContext('2d');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
let LiteralRenderingModeSelection = Math.floor(Math.random() * (2)) + 1;
const LiteralRenderingModeSelectionall = 2;
let bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
const dd = audioContext.createMediaElementSource(audio);
let sxl = 15;
let interval;
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
	initLyrics();
    imgload();
  })
function initLyrics() {
	if(jsonlyrics.lyrics[0].time > 0){
		let dsfsad = {"time": 0.00,"text": "Enjoy to the fullest!","etext": [{"Duration": 0.10,"start": 0.0,"end": 0.1,"text": "Enjoy to the fullest :)"}]};
		jsonlyrics.lyrics.unshift(dsfsad);
	}
    setInterval(updateLyrics, sxl);//刷新
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
    changeTitle();
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
        currentLyricIndex = newIndex;
        displayCurrentLyric();
    }
	if(zt === 2){
		displayCurrentLyric();
		zt = 1;
	}
    if (currentLyricIndex !== -1) {
		if(LiteralRenderingModeSelection === 2){
			fadeWords(currentTime);
		}else{
            highlightWords(currentTime);
		}
    }
	const targetClass = LiteralRenderingModeSelection === 2 ? "textt" : "text";
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
}
function fadeWords(currentTime){
	const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
	let outtimes = [];
	if(jsonlyrics.lyrics[currentLyricIndex + 1] && jsonlyrics.lyrics[currentLyricIndex + 1].time - currentLyric.etext[currentLyric.etext.length - 1].start >= wordElements.length * 0.03 + 0.2){
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
const xhr = new XMLHttpRequest();
function imgload(){
    if(jsonlyrics.metadata.ti){
        xhr.open('GET', encodeURI('https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${jsonlyrics.metadata.ti}&type=1&offset=0&total=true&limit=10'));
        xhr.onreadystatechange = () => {
            if(xhr.status !== 200){
                console.error("seimg !== 200");
                return;
            }
            if(xhr.responseText.result.songs[0].id){
                console.error("seimg null!");
                return;
            }
            xhe.open('GET', 'https://meting.qjqq.cn/?type=song&id=${xhr.responseText.result.songs[0].id}');
            xhe.onreadystatechange = () => {
                if(xhe.status !== 200){
                    console.error("img !== 200");
                    return;
                }
                if(xhe.responseText[0].pic){
                    console.error("img null!");
                    return;
                }
                const img = document.createElement("img");
                img.src = xhe.responseText[0].pic;
                img.width = 90;
                img.height = 90;
                main.appendChild(img);
            }
        }   
    }
}
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