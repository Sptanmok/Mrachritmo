let lyricpath;
let currentLyricIndex = -1;
let wordElements = [];
const audio = document.getElementById('audio');
const lyricElement = document.getElementById('lyric');
const pairLyricElement = document.getElementById('pairlyric');
const romaLyricElement = document.getElementById('romalyric');
const title = document.title
let jsonlyrics;
let sendLyricsBridgeState = () => {};
let alimg = document.querySelector(".img");
const canvas = document.getElementById('spectrum');
const canvasb = document.getElementById('spectrumb');
const canvasd = document.getElementById('spectrumd');
const ctx = canvas.getContext('2d');
const ctxb = canvasb.getContext('2d');
const ctxd = canvasd.getContext('2d');
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const LiteralRenderingModeSelectionall = 3;
let LiteralRenderingModeSelection = Math.floor(Math.random() * (LiteralRenderingModeSelectionall)) + 1;
const AudioVisualizationModeSelectionall = 2;
let AudioVisualizationModeSelection = 1;
let bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);
const dd = audioContext.createMediaElementSource(audio);
dd.connect(analyser);
analyser.connect(audioContext.destination);
const main = document.querySelector(".main");
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
let suijsz =[]
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
    for(let i=1;i<=200;i++){
        suijsz.push(i)
    }
    suijsz.sort(() => Math.random() - 0.5)
    if ("mediaSession" in navigator) {
        const artwork = alimg && alimg.getAttribute('src') ? [{
            src: alimg.src,
            sizes: "1400x1400",
            type: "image/jpeg"
        }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({
            title: jsonlyrics.metadata.ti,
            artist: jsonlyrics.metadata.ar,
            album: jsonlyrics.metadata.al,
            artwork
        });
    }
    // Low-latency bridge to the desktop lyrics overlay.
    let lyricsBridge;
    let lyricsBridgeRetry;
    const bridgeUrl = 'ws://127.0.0.1:17321';
    const bridgeTitle = () => (jsonlyrics && jsonlyrics.metadata && jsonlyrics.metadata.ti) || document.title || audio.getAttribute('src') || '';
    const sendLyricsState = (includeLyrics = false) => {
        if (!lyricsBridge || lyricsBridge.readyState !== WebSocket.OPEN) return;
        const state = {
            title: bridgeTitle(),
            artist: jsonlyrics && jsonlyrics.metadata ? jsonlyrics.metadata.ar || '' : '',
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
            status: audio.paused ? 'Paused' : 'Playing',
            mode: LiteralRenderingModeSelection
        };
        if (includeLyrics) state.lyric = jsonlyrics || null;
        try {
            lyricsBridge.send(JSON.stringify(state));
        } catch {
            // The page can be backgrounded while the bridge reconnects.
        }
    };
    sendLyricsBridgeState = sendLyricsState;
    const connectLyricsBridge = () => {
        try {
            lyricsBridge = new WebSocket(bridgeUrl);
            lyricsBridge.addEventListener('open', () => sendLyricsState(true));
            lyricsBridge.addEventListener('close', () => { clearTimeout(lyricsBridgeRetry); lyricsBridgeRetry = setTimeout(connectLyricsBridge, 1000); });
            lyricsBridge.addEventListener('error', () => lyricsBridge.close());
        } catch { lyricsBridgeRetry = setTimeout(connectLyricsBridge, 1000); }
    };
    connectLyricsBridge();
    setInterval(sendLyricsState, 40);
    ['play', 'pause', 'seeked', 'loadedmetadata', 'durationchange', 'timeupdate', 'ended'].forEach(eventName => {
        audio.addEventListener(eventName, () => sendLyricsState());
    });
    document.addEventListener('visibilitychange', () => sendLyricsState());
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
    let previous_direction;
    for(let i = 0;i < wordElements.length;i++){
        let bianD = Math.ceil(4 - (Math.random())*4)
        if(previous_direction && bianD === previous_direction){
            bianD = bianD === 4 ? 1 : bianD + 1;
        }
        previous_direction = bianD;
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
	if (document.hidden == true && audio.paused == false && jsonlyrics && !jsonlyrics.metadata.nolyric && currentLyricIndex !== -1) {
		if(document.title !== jsonlyrics.lyrics[currentLyricIndex].text){
			document.title = jsonlyrics.lyrics[currentLyricIndex].text;
		}
	}else if (document.title !== title){
		document.title = title;
	}
}
//频谱条
const barWidth = (canvas.width / bufferLength) * 2.5;
const mode2BarWidth = 60;
const mode2MinimumAdvance = 73;
let oldAudioVisualizationModeSelection;
let barmove = 0;
let debug_ojb_a = document.getElementById('a');
let debug_ojb_b = document.getElementById('b');
let debug_ojb_c = document.getElementById('c');
setInterval(updateBarmove,20);
function updateBarmove() {
    barmove++;
    if(barmove >= canvasb.width){
        barmove = 0;
    }
    if(debug_ojb_a && debug_ojb_b){//debug
        debug_ojb_a.textContent = "barmove: "+barmove;
        debug_ojb_b.textContent = "barmoveb: "+(canvasb.width-barmove);
    }
}
setInterval(updatasjArray);
let oldsjdataArray;
let sjdataArray;
let jump_change;
function updatasjArray(){
    let audataArray = dataArray.slice(20,20+bufferLengthb);
    if(!oldsjdataArray || oldsjdataArray.length !== audataArray.length){
        oldsjdataArray=audataArray.slice()
    }
    if(!sjdataArray || sjdataArray.length !== audataArray.length){
        sjdataArray=audataArray.slice()
    }
    for(let i=0;i<audataArray.length;i++){
        if(audataArray[i]===0){
            sjdataArray[i]=0;
            continue;
        }
        const cha = audataArray[i] - oldsjdataArray[i];
        sjdataArray[i]=Math.min(Math.max(cha+sjdataArray[i],0),300)
    }
    oldsjdataArray=audataArray
    jump_change=true;
}
let oldwindowwidth = 0;
let previousHeights = [];
let previousHeightsB = [];
function drawSpectrum() {
    if(oldwindowwidth !== window.innerWidth){
        oldwindowwidth = window.innerWidth
        canvas.width = main.clientWidth - 40;
        bufferLength = Math.floor( (canvas.width + 1 ) / (barWidth + 1) );
        canvasb.width = window.innerWidth;
        canvasd.width = window.innerWidth;
        bufferLengthb = Math.max(1, Math.floor(canvasb.width / mode2MinimumAdvance));
        suijsz=[];
        for(let i=1;i<=bufferLengthb;i++){
            suijsz.push(i)
        }
        suijsz.sort(() => Math.random() - 0.5)
    }
    analyser.getByteFrequencyData(dataArray);
    if(AudioVisualizationModeSelection !== oldAudioVisualizationModeSelection){
    oldAudioVisualizationModeSelection = AudioVisualizationModeSelection;
    if(AudioVisualizationModeSelection===2){
        canvas.setAttribute('style', 'display: none;');
        canvasb.setAttribute('style', 'display: block;');
        canvasd.setAttribute('style', 'display: block;');
        alimg.setAttribute('style', 'margin-top: 100px;');
    }
    if(AudioVisualizationModeSelection===1){
        canvasb.setAttribute('style', 'display: none;');
        canvasd.setAttribute('style', 'display: none;');
        canvas.setAttribute('style', 'margin-top: 0px;');
    }
  }
  if (AudioVisualizationModeSelection===1){
    draw_a();
  }
  if (AudioVisualizationModeSelection===2){
    draw_b();
  }
  function draw_a(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        ctx.fillStyle = "white";
        ctx.fillRect(x, canvas.height - dataArray[i], barWidth, dataArray[i]);
        x += barWidth + 1;
    }
  }
  function draw_b(){
    /*
    for(let i=0;i<rawdataArray.length;i++){
        sjdataArray.push(rawdataArray[suijsz[i]])
    }
    */
    const width = canvasb.width;
    bufferLengthb = Math.max(1, Math.floor(width / mode2MinimumAdvance));
    const barAdvance = width / bufferLengthb;
    const phase = barmove % barAdvance;
    const completedSlots = Math.floor(barmove / barAdvance);
    let max = -Infinity;
    let min = Infinity;
    for(let i = 0;i < sjdataArray.length;i++){
        if(sjdataArray[i] > max){
            max = sjdataArray[i];
        }
        if(sjdataArray[i] < min){
            min = sjdataArray[i];
        }
    }

    const frameHasNewData = jump_change;
    jump_change = false;

    ctxb.clearRect(0, 0, canvasb.width, canvasb.height);
    ctxd.clearRect(0, 0, canvasd.width, canvasd.height);
    ctxb.fillStyle = "white";
    const topHeights = [];
    const bottomHeights = [];
    for (let i = 0; i < bufferLengthb; i++) {
        let barHeight;
        if(frameHasNewData){
            barHeight = sjdataArray[i] || 0;
        }else if(previousHeights[i] !== undefined){
            if(previousHeights[i] > 50){
                barHeight = previousHeights[i] - 2
            }else{
                barHeight = previousHeights[i] + 2
            }
        }else{
            barHeight = 0;
        }
        previousHeights[i] = barHeight;
        topHeights[i] = barHeight;

        if(frameHasNewData){
            barHeight = sjdataArray[i] || 0;
        }else if(previousHeightsB[i] !== undefined){
            barHeight = previousHeightsB[i] > 50
                ? previousHeightsB[i] - 2
                : previousHeightsB[i] + 2;
        }else{
            barHeight = 0;
        }
        previousHeightsB[i] = barHeight;
        bottomHeights[i] = barHeight;
    }

    function drawTopBar(barX, barHeight, label){
        ctxb.fillStyle = "white";
        ctxb.fillRect(barX, 0, mode2BarWidth, barHeight);
        ctxb.beginPath();
        ctxb.arc(barX + mode2BarWidth / 2, barHeight, mode2BarWidth / 2, 0, 2 * Math.PI, false);
        ctxb.fill();
        ctxb.fillStyle = "black";
        ctxb.font = "48px serif";
        ctxb.fillText(label, barX, 50);
    }

    function drawBottomBar(barX, barHeight, label){
        ctxd.fillStyle = "white";
        ctxd.fillRect(barX, canvasd.height - barHeight, mode2BarWidth, barHeight);
        ctxd.beginPath();
        ctxd.arc(barX + mode2BarWidth / 2, canvasd.height - barHeight, mode2BarWidth / 2, 0, 2 * Math.PI, true);
        ctxd.fill();
        ctxd.fillStyle = "black";
        ctxd.font = "48px serif";
        ctxd.fillText(label, barX, canvasd.height - 10);
    }

    // Use an exact circular track: barAdvance * bufferLengthb === width.
    // completedSlots shifts the data identity as each spacing is crossed;
    // without it the positions loop correctly but every numbered bar appears
    // to jump back to its original slot instead of travelling across the row.
    for (let slot = -1; slot < bufferLengthb; slot++) {
        const dataIndex = (slot - completedSlots + bufferLengthb * 2) % bufferLengthb;
        drawTopBar(slot * barAdvance + phase, topHeights[dataIndex], dataIndex);
    }
    for (let slot = 0; slot <= bufferLengthb; slot++) {
        const logicalSlot = (slot + completedSlots) % bufferLengthb;
        const dataIndex = bufferLengthb - 1 - logicalSlot;
        drawBottomBar(slot * barAdvance - phase, bottomHeights[dataIndex], dataIndex);
    }

  }
  requestAnimationFrame(drawSpectrum);
}
canvas.width = main.clientWidth - 40;
canvasb.width = window.innerWidth;
canvasd.width = window.innerWidth;
let bufferLengthb = Math.max(1, Math.floor(canvasb.width / mode2MinimumAdvance));
bufferLength = Math.floor( (canvas.width + 1 ) / (barWidth + 1) );
initCustomAudioControls();
audio.onplay = () => {
  audioContext.resume().then(() => {
    drawSpectrum();
  });
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const mStr = mins < 10 ? "0" + mins : "" + mins;
  const sStr = secs < 10 ? "0" + secs : "" + secs;
  return mStr + ":" + sStr;
}

function initCustomAudioControls() {
  const playBtn = document.getElementById('cap-play-btn');
  if (!playBtn) return;

  const playIcon = document.getElementById('cap-icon-play');
  const pauseIcon = document.getElementById('cap-icon-pause');
  const prevBtn = document.getElementById('cap-prev-btn');
  const nextBtn = document.getElementById('cap-next-btn');
  const replayBtn = document.getElementById('cap-replay-btn');
  const currentTimeEl = document.getElementById('cap-current-time');
  const durationTimeEl = document.getElementById('cap-duration-time');
  const seekBar = document.getElementById('cap-seek-bar');
  const volumeBtn = document.getElementById('cap-volume-btn');
  const volHighIcon = document.getElementById('cap-icon-vol-high');
  const volMedIcon = document.getElementById('cap-icon-vol-med');
  const volMuteIcon = document.getElementById('cap-icon-vol-mute');
  const volumeSlider = document.getElementById('cap-volume-slider');
  const lyricModeBtn = document.getElementById('cap-lyric-mode-btn');
  const lyricModeText = document.getElementById('cap-lyric-mode-text');
  const visModeBtn = document.getElementById('cap-vis-mode-btn');
  const visModeText = document.getElementById('cap-vis-mode-text');

  let isSeeking = false;
  let savedVolume = 1;

  function resumeAudioContextSafely() {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function updateSliderGradient(slider, percent) {
    if (!slider) return;
    const pct = Math.max(0, Math.min(100, percent));
    slider.style.background = 'linear-gradient(to right, #38bdf8 ' + pct + '%, rgba(255, 255, 255, 0.22) ' + pct + '%)';
    slider.style.setProperty('--progress-percent', pct + '%');
  }

  function updatePlayIcon() {
    if (audio.paused) {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      playBtn.setAttribute('title', '播放 (空格键)');
    } else {
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      playBtn.setAttribute('title', '暂停 (空格键)');
    }
  }

  function updateVolumeUI() {
    const isMuted = audio.muted || audio.volume === 0;
    if (volHighIcon) volHighIcon.style.display = (!isMuted && audio.volume >= 0.5) ? 'block' : 'none';
    if (volMedIcon) volMedIcon.style.display = (!isMuted && audio.volume > 0 && audio.volume < 0.5) ? 'block' : 'none';
    if (volMuteIcon) volMuteIcon.style.display = isMuted ? 'block' : 'none';

    if (volumeSlider) {
      const val = isMuted ? 0 : audio.volume;
      volumeSlider.value = val;
      updateSliderGradient(volumeSlider, val * 100);
    }
  }

  function updateModeIndicators() {
    if (lyricModeText) {
      const modeLabels = ['K1', 'F2', 'R3'];
      const label = modeLabels[LiteralRenderingModeSelection - 1] || ('M' + LiteralRenderingModeSelection);
      lyricModeText.textContent = label;
      const modeNames = ['卡拉OK', '淡入淡出', '随机淡入淡出'];
      lyricModeBtn.setAttribute('title', '歌词模式: ' + (modeNames[LiteralRenderingModeSelection - 1] || '') + ' (按T键切换)');
    }
    if (visModeText) {
      visModeText.textContent = 'S' + AudioVisualizationModeSelection;
      const visNames = ['经典柱状频谱', '双向胶囊移动频谱'];
      visModeBtn.setAttribute('title', '频谱模式: ' + (visNames[AudioVisualizationModeSelection - 1] || '') + ' (按Y键切换)');
    }
  }

  playBtn.addEventListener('click', function() {
    resumeAudioContextSafely();
    if (audio.paused) {
      audio.play().catch(function(err) { console.warn('Playback error:', err); });
    } else {
      audio.pause();
    }
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      resumeAudioContextSafely();
      audio.currentTime = Math.max(0, audio.currentTime - 5);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      resumeAudioContextSafely();
      const maxDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      audio.currentTime = Math.min(maxDuration, audio.currentTime + 5);
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', function() {
      resumeAudioContextSafely();
      audio.currentTime = 0;
      audio.play().catch(function(err) { console.warn('Playback error:', err); });
    });
  }

  if (seekBar) {
    updateSliderGradient(seekBar, 0);

    seekBar.addEventListener('input', function() {
      isSeeking = true;
      const pct = parseFloat(seekBar.value);
      updateSliderGradient(seekBar, pct);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const previewTime = (pct / 100) * audio.duration;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(previewTime);
      }
    });

    seekBar.addEventListener('change', function() {
      const pct = parseFloat(seekBar.value);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (pct / 100) * audio.duration;
      }
      isSeeking = false;
    });

    ['pointerup', 'touchend', 'mouseup'].forEach(function(evt) {
      seekBar.addEventListener(evt, function() {
        if (isSeeking) {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = (parseFloat(seekBar.value) / 100) * audio.duration;
          }
          isSeeking = false;
        }
      });
    });
  }

  if (volumeBtn) {
    volumeBtn.addEventListener('click', function() {
      resumeAudioContextSafely();
      if (audio.muted || audio.volume === 0) {
        audio.muted = false;
        audio.volume = savedVolume > 0 ? savedVolume : 1;
      } else {
        savedVolume = audio.volume > 0 ? audio.volume : 1;
        audio.muted = true;
      }
      updateVolumeUI();
    });
  }

  if (volumeSlider) {
    updateSliderGradient(volumeSlider, (audio.volume || 1) * 100);
    volumeSlider.addEventListener('input', function() {
      resumeAudioContextSafely();
      const val = parseFloat(volumeSlider.value);
      audio.muted = (val === 0);
      audio.volume = val;
      if (val > 0) savedVolume = val;
      updateVolumeUI();
    });
  }

  if (lyricModeBtn) {
    lyricModeBtn.addEventListener('click', function() {
      if (LiteralRenderingModeSelection < LiteralRenderingModeSelectionall) {
        LiteralRenderingModeSelection++;
      } else {
        LiteralRenderingModeSelection = 1;
      }
      sendLyricsBridgeState();
      updateModeIndicators();
    });
  }

  if (visModeBtn) {
    visModeBtn.addEventListener('click', function() {
      if (AudioVisualizationModeSelection < AudioVisualizationModeSelectionall) {
        AudioVisualizationModeSelection++;
      } else {
        AudioVisualizationModeSelection = 1;
      }
      updateModeIndicators();
    });
  }

  audio.addEventListener('play', updatePlayIcon);
  audio.addEventListener('pause', updatePlayIcon);

  audio.addEventListener('timeupdate', function() {
    if (!isSeeking) {
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (seekBar && Number.isFinite(audio.duration) && audio.duration > 0) {
        const pct = (audio.currentTime / audio.duration) * 100;
        seekBar.value = pct;
        updateSliderGradient(seekBar, pct);
      }
    }
  });

  const onDurationUpdate = function() {
    if (durationTimeEl && Number.isFinite(audio.duration) && audio.duration > 0) {
      durationTimeEl.textContent = formatTime(audio.duration);
    }
  };
  audio.addEventListener('durationchange', onDurationUpdate);
  audio.addEventListener('loadedmetadata', onDurationUpdate);

  audio.addEventListener('volumechange', updateVolumeUI);

  audio.addEventListener('ended', function() {
    if (seekBar) {
      seekBar.value = 0;
      updateSliderGradient(seekBar, 0);
    }
    if (currentTimeEl) currentTimeEl.textContent = formatTime(0);
    updatePlayIcon();
  });

  updatePlayIcon();
  updateVolumeUI();
  updateModeIndicators();
  onDurationUpdate();

  window._updateCapModeIndicators = updateModeIndicators;
}

//键盘监测区
document.addEventListener('keydown', function(event) {
  if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
    return;
  }
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    if (audio.paused) {
      audio.play().catch(function(err) { console.warn('Playback error:', err); });
    } else {
      audio.pause();
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    const maxDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(maxDuration, audio.currentTime + 5);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    audio.volume = Math.min(1, Math.round((audio.volume + 0.05) * 100) / 100);
    audio.muted = false;
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    audio.volume = Math.max(0, Math.round((audio.volume - 0.05) * 100) / 100);
  } else if (event.key === 't') {
    if (LiteralRenderingModeSelection < LiteralRenderingModeSelectionall) {
      LiteralRenderingModeSelection++;
    } else {
      LiteralRenderingModeSelection = 1;
    }
    sendLyricsBridgeState();
    if (typeof window._updateCapModeIndicators === 'function') window._updateCapModeIndicators();
  } else if (event.key === 'y') {
    if (AudioVisualizationModeSelection < AudioVisualizationModeSelectionall) {
      AudioVisualizationModeSelection++;
    } else {
      AudioVisualizationModeSelection = 1;
    }
    if (typeof window._updateCapModeIndicators === 'function') window._updateCapModeIndicators();
  }
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
