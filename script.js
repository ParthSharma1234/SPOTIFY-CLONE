// --- Spotify Clone - JS ---
console.log("JS loaded");

let currentSong = new Audio();
let songs = [];
let currFolder = "Songs";
let currentIndex = -1; // index in songs[]

/* ---------- helpers ---------- */
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- DOM refs (your HTML ids/classes) ---------- */
const playBtn    = document.getElementById("play");
const prevBtn    = document.getElementById("previous");
const nextBtn    = document.getElementById("next");

const songInfoEl = document.querySelector(".songinfo");
const songTimeEl = document.querySelector(".songtime");

const seekbar    = document.querySelector(".seekbar");
const circle     = document.querySelector(".circle");

const volumeIcon   = document.querySelector(".volume > img");
const volumeSlider = document.querySelector(".range input");

const hamburger = document.querySelector(".hamburger");
const leftPane  = document.querySelector(".left");
const closeBtn  = document.querySelector(".close");

/* Ensure volume slider has sane defaults (your HTML left them empty) */
if (volumeSlider) {
  if (!volumeSlider.min)   volumeSlider.min = "0";
  if (!volumeSlider.max)   volumeSlider.max = "100";
  if (!volumeSlider.step)  volumeSlider.step = "1";
  if (!volumeSlider.value) volumeSlider.value = "60";
  currentSong.volume = Number(volumeSlider.value) / 100;
}

/* ---------- core ---------- */
async function getSongs(folder) {
  currFolder = folder;
  // Expecting a directory listing (e.g., via a dev server). We parse links to .mp3 files.
  const res = await fetch(`/${folder}/`);
  const html = await res.text();
  const div = document.createElement("div");
  div.innerHTML = html;

  const anchors = Array.from(div.getElementsByTagName("a"));
  songs = [];
  anchors.forEach(a => {
    const href = a.getAttribute("href") || a.href || "";
    // Normalize absolute/relative
    const full = a.href || href;
    if (full && full.toLowerCase().endsWith(".mp3")) {
      // Get filename relative to folder
      const file = full.split(`/${folder}/`).pop();
      if (file) songs.push(file);
    }
  });

  // Render playlist in sidebar
  const songUL = document.querySelector(".songList ul");
  if (songUL) {
    songUL.innerHTML = "";
    for (const file of songs) {
      const display = decodeURIComponent(file);
      songUL.innerHTML += `
        <li data-file="${file}">
          <img class="invert" width="34" src="music.svg" alt="">
          <div class="info">
              <div>${display}</div>
              <div>Harry</div>
          </div>
          <div class="playnow">
              <span>Play Now</span>
              <img class="invert" src="play.svg" alt="">
          </div>
        </li>`;
    }

    // Click on a song row to play it
    Array.from(songUL.querySelectorAll("li")).forEach((li, idx) => {
      li.addEventListener("click", () => playMusicIndex(idx));
    });
  }

  return songs;
}

function playMusicIndex(index, { pause = false } = {}) {
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  const track = songs[index];
  playMusic(track, { pause });
}

function playMusic(track, { pause = false } = {}) {
  // set source and UI
  currentSong.src = `/${currFolder}/` + track;
  songInfoEl.textContent = decodeURIComponent(track);
  songTimeEl.textContent = "00:00 / 00:00";

  // when metadata is ready, update total duration
  currentSong.onloadedmetadata = () => {
    const total = secondsToMinutesSeconds(currentSong.duration);
    const cur = secondsToMinutesSeconds(currentSong.currentTime);
    songTimeEl.textContent = `${cur} / ${total}`;
  };

  if (!pause) {
    currentSong.play().then(() => {
      if (playBtn) playBtn.src = "pause.svg";
    }).catch(() => {
      // autoplay might be blocked until user interaction
      if (playBtn) playBtn.src = "play.svg";
    });
  }
}

/* ---------- albums (cards) ---------- */
async function displayAlbums() {
  // Find subfolders inside /Songs/ and read their info.json
  const res = await fetch(`/Songs/`);
  const html = await res.text();
  const div = document.createElement("div");
  div.innerHTML = html;

  const cardContainer = document.querySelector(".cardContainer");
  const anchors = Array.from(div.getElementsByTagName("a"));

  if (cardContainer) {
    for (const a of anchors) {
      const href = a.getAttribute("href") || a.href || "";
      const full = a.href || href;
      // Heuristic: a folder link inside /Songs/ should end with "/"
      if (full.includes("/Songs/") && full.endsWith("/")) {
        const folder = full.split("/").slice(-2)[0]; // the folder name
        try {
          const metaRes = await fetch(`/Songs/${folder}/info.json`);
          const meta = await metaRes.json().catch(() => ({}));
          cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card">
              <div class="play">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                        stroke-linejoin="round" />
                </svg>
              </div>
              <img src="/Songs/${folder}/cover.jpg" alt="cover image">
              <h2>${meta.title ?? folder}</h2>
              <p>${meta.description ?? ""}</p>
            </div>`;
        } catch {
          // ignore folders without meta
        }
      }
    }

    // Load playlist when clicking a card
    Array.from(document.getElementsByClassName("card")).forEach(card => {
      card.addEventListener("click", async (ev) => {
        const folder = ev.currentTarget.dataset.folder;
        if (!folder) return;
        await getSongs(`Songs/${folder}`);
        playMusicIndex(0);
      });
    });
  }
}

/* ---------- listeners & UI wiring ---------- */
function wireControls() {
  // Play / Pause
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (currentSong.paused) {
        currentSong.play();
        playBtn.src = "pause.svg";
      } else {
        currentSong.pause();
        playBtn.src = "play.svg";
      }
    });
  }

  // Previous
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) playMusicIndex(currentIndex - 1);
    });
  }

  // Next
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentIndex + 1 < songs.length) playMusicIndex(currentIndex + 1);
    });
  }

  // When a song ends -> next (or reset to play icon)
  currentSong.addEventListener("ended", () => {
    if (currentIndex + 1 < songs.length) {
      playMusicIndex(currentIndex + 1);
    } else {
      if (playBtn) playBtn.src = "play.svg";
    }
  });

  // Time/progress updates
  currentSong.addEventListener("timeupdate", () => {
    const dur = currentSong.duration;
    const cur = currentSong.currentTime;

    // text
    songTimeEl.textContent =
      `${secondsToMinutesSeconds(cur)} / ${secondsToMinutesSeconds(dur)}`;

    // bar
    if (!isNaN(dur) && dur > 0) {
      const pct = (cur / dur) * 100;
      circle.style.left = `${pct}%`;
    } else {
      circle.style.left = "0%";
    }
  });

  // Seek (click on bar)
  if (seekbar) {
    seekbar.addEventListener("click", (e) => {
      const rect = seekbar.getBoundingClientRect();
      const x = e.clientX - rect.left; // position within seekbar
      const pct = Math.max(0, Math.min(1, x / rect.width));
      if (!isNaN(currentSong.duration) && currentSong.duration > 0) {
        currentSong.currentTime = pct * currentSong.duration;
      }
    });
  }

  // Volume slider (live update)
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const v = Number(e.target.value);
      currentSong.volume = Math.max(0, Math.min(1, v / 100));
      if (currentSong.volume > 0 && volumeIcon) {
        volumeIcon.src = volumeIcon.src.replace("mute.svg", "volume.svg");
      }
    });
  }

  // Mute toggle
  if (volumeIcon) {
    volumeIcon.addEventListener("click", (e) => {
      const isVolIcon = e.target.src.includes("volume.svg");
      if (isVolIcon) {
        e.target.src = e.target.src.replace("volume.svg", "mute.svg");
        currentSong.volume = 0;
        if (volumeSlider) volumeSlider.value = "0";
      } else {
        e.target.src = e.target.src.replace("mute.svg", "volume.svg");
        currentSong.volume = Math.max(currentSong.volume, 0.1);
        if (volumeSlider) volumeSlider.value = String(Math.round(currentSong.volume * 100));
      }
    });
  }

  // Sidebar open/close
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      leftPane.style.left = "0";
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      leftPane.style.left = "-120%";
    });
  }
}

/* ---------- bootstrap ---------- */
async function main() {
  wireControls();

  // Load initial list from /Songs/
  await getSongs("Songs");

  // If we have at least one song, select it (paused)
  if (songs.length > 0) {
    playMusicIndex(0, { pause: true });
  }

  // Populate album cards (optional folders under /Songs/)
  await displayAlbums();
}

main();