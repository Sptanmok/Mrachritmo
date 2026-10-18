const audio = document.getElementById("audio");
const cover = document.querySelector(".img");
const lyric = document.getElementById("lyric");

function assetUrl(path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return new URL(`./musicfile/${encodedPath}`, window.location.href).href;
}

async function start() {
  const response = await fetch(new URL("./songs.json", window.location.href));
  if (!response.ok) throw new Error(`Song catalog request failed: ${response.status}`);

  const songs = await response.json();
  if (!songs.length) throw new Error("The song catalog is empty");

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("s");
  const song = requestedId ? songs.find(({ id }) => id === requestedId) : songs[0];
  if (!song) throw new Error(`Song not found: ${requestedId}`);

  if (!requestedId) {
    params.set("s", song.id);
    history.replaceState(null, "", `${window.location.pathname}?${params}${window.location.hash}`);
  }

  document.title = song.title;
  audio.src = assetUrl(song.audio);
  audio.setAttribute("lyricpath", assetUrl(song.lyrics));
  if (song.image) {
    cover.src = assetUrl(song.image);
    cover.alt = song.title;
    cover.hidden = false;
    cover.addEventListener("error", () => { cover.hidden = true; }, { once: true });
  }

  await import("./player2.js");
}

start().catch((error) => {
  console.error(error);
  document.title = "Song unavailable";
  lyric.textContent = error.message;
  audio.hidden = true;
  cover.hidden = true;
  const customPlayer = document.getElementById("custom-audio-player");
  if (customPlayer) customPlayer.style.display = "none";
});
