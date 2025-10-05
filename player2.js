const audio = document.getElementById('audio');
var lyricpath = audio.getAttribute('lyricpath');
let currentLyricIndex = -1;
let wordElements = [];
var _etext = document.getElementById("lyric");
const lyricElement = document.getElementById('lyric');
const pairLyricElement = document.getElementById('pairlyric');
const title = document.title
let jsonlyrics = null;
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
    setInterval(updateLyrics, 10);//刷新
}
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
                
    if (newIndex !== currentLyricIndex && newIndex !== -1) {
        currentLyricIndex = newIndex;
        displayCurrentLyric();
    }
	if (document.hidden == true && audio.paused == false) {
		document.title = jsonlyrics.lyrics[currentLyricIndex].text;
	}else{
		document.title = title
	}
    if (currentLyricIndex !== -1) {
        highlightWords(currentTime);
    }
}
function displayCurrentLyric() {
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
    let html = '';
    
    for (let i = 0; i < currentLyric.etext.length; i++) {
        html += `<span style="">${currentLyric.etext[i].text}</span>`;
    }
    lyricElement.innerHTML = html;
    wordElements = lyricElement.getElementsByTagName('span');
    pairLyricElement.textContent = currentLyric.pairlyric;
}
function highlightWords(currentTime) {
    const currentLyric = jsonlyrics.lyrics[currentLyricIndex];
                
    for (let i = 0; i < currentLyric.etext.length; i++) {
        const word = currentLyric.etext[i];//简化m
        if (currentTime >= word.start && wordElements[i]) { //判断时间
            wordElements[i].style.setProperty('animation', 'fadeInUp 0.9s forwards;');
        } else if (currentTime < word.start && wordElements[i]) {
            wordElements[i].style.removeProperty('animation');
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