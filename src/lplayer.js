const audio = document.getElementById('audio');
var lyricpath = audio.getAttribute('lyricpath');
let currentLyricIndex = -1;
let wordElements = [];
const lyricElement = document.getElementById('lyric');
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
    let mgds = '';
	let pair;
	for (let i = 0; i < jsonlyrics.lyrics.length; i++) {
		if (jsonlyrics.lyrics[i].pairlyric == undefined){
			pair = ""
		}else{
			pair = jsonlyrics.lyrics[i].pairlyric
		}
		mgds += `<div><h2>${jsonlyrics.lyrics[i].text}</h2><p>${pair}</p></div>`;
	}
	lyricElement.innerHTML = mgds
	divElement = lyricElement.getElementsByTagName('div');
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
		if (currentLyricIndex !== -1 && divElement[currentLyricIndex]) {
			let pair;
			if (jsonlyrics.lyrics[currentLyricIndex].pairlyric == undefined){
				pair = ""
		    }else{
				pair = jsonlyrics.lyrics[currentLyricIndex].pairlyric
		    }
		    divElement[currentLyricIndex].classList.remove('currently');
			
			divElement[currentLyricIndex].innerHTML = `<h2>${jsonlyrics.lyrics[currentLyricIndex].text}</h2><p>${pair}</p>`;
		}
        currentLyricIndex = newIndex;
		aphraseElement = divElement[currentLyricIndex]
        displayCurrentLyric();
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
	phraseElement = aphraseElement.getElementsByTagName('h2')[0];
	pairPhraseElement = aphraseElement.getElementsByTagName('p')[0];
    phraseElement.innerHTML = html; 
	console.log(phraseElement);
    wordElements = phraseElement.getElementsByTagName('span');
    pairPhraseElement.textContent = currentLyric.pairlyric;
	divElement[currentLyricIndex].classList.add('currently');
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