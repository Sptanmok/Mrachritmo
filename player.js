const audio = document.getElementById('audio');
var lyricpath = audio.getAttribute('lyricpath');
let currentLyricIndex = -1;
let wordElements = [];
var _etext = document.getElementById("lyric");
const lyricElement = document.getElementById('lyric');
const pairLyricElement = document.getElementById('pairlyric');
const title = document.title
let old;
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
  })
function initLyrics() {
    setInterval(updateLyrics, 20);//刷新
}
function updateLyrics() {
	if (audio.paused == true){
		lyricElement.style.animationPlayState = 'paused';
	} else{
		lyricElement.style.animationPlayState = 'running';
	}
    const currentTime = audio.currentTime;
                
    let newIndex = -1;
    for (let i = 0; i < jsonlyrics.lyrics.length; i++) {
        if (currentTime >= jsonlyrics.lyrics[i].time) {
            newIndex = i;
        } else {
            break;
       }
    }
                
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
        currentLyricIndex = newIndex;
        displayCurrentLyric();
    }
	if (document.hidden == true && audio.paused == false) {
		if(old !== document.title){
			document.title = jsonlyrics.lyrics[currentLyricIndex].text;
			old = jsonlyrics.lyrics[currentLyricIndex].text;
		}
	}else if (document.title !== title){
		document.title = title;
	}
                
    if (currentLyricIndex !== -1) {
        highlightWords(currentTime);
    }
}
function displayCurrentLyric() {
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
    let html = '';
    
    for (let i = 0; i < currentLyric.etext.length; i++) {
        html += `<span style="--progress:0%">${currentLyric.etext[i].text}</span>`;
    }
        lyricElement.innerHTML = html;
    wordElements = lyricElement.getElementsByTagName('span');
    pairLyricElement.textContent = currentLyric.pairlyric;
}
function highlightWords(currentTime) {
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
                
    for (let i = 0; i < currentLyric.etext.length; i++) {
        const word = currentLyric.etext[i];//简化m
        
        if (currentTime >= word.start && currentTime <= word.end) { //判断时间
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
//频谱条
const canvas = document.getElementById('spectrum');
const ctx = canvas.getContext('2d');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
const dd = audioContext.createMediaElementSource(audio);
dd.connect(analyser);
analyser.connect(audioContext.destination);
function drawSpectrum() {
  requestAnimationFrame(drawSpectrum);
  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let barHeight;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];
    ctx.fillStyle = "white";
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);


    x += barWidth + 1.2;
  }
}

audio.onplay = () => {
  audioContext.resume().then(() => {
    drawSpectrum();
  });
};