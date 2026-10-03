function showHome() {
  const intro = document.getElementById("intro");
  const home = document.getElementById("home");
  const player = document.getElementById("music-player");

  if (intro) intro.style.display = "none";
  if (home) home.style.display = "block";
  if (player) player.style.display = "flex";

  document.body.classList.remove("intro-active");
  window.scrollTo(0, 0);
}

/* -------------------------------------------------------
   GLOBAL MODAL
   root 페이지에서 Fragments / Stills로 소프트 이동해도
   modal 요소가 항상 존재하도록 만든다.
-------------------------------------------------------- */
function ensureModal() {
  if (document.getElementById("modal")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal" id="modal" onclick="closeModal(event)">
      <div class="modal-content">
        <button class="modal-close" onclick="closeModal()">CLOSE</button>
        <div id="modal-inner"></div>
      </div>
    </div>
  `);
}

ensureModal();

function openImage(src) {
  const modal = document.getElementById("modal");
  const modalInner = document.getElementById("modal-inner");
  if (!modal || !modalInner) return;

  modalInner.innerHTML = `<img class="modal-image" src="${src}" alt="">`;
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function openText(id) {
  const modal = document.getElementById("modal");
  const modalInner = document.getElementById("modal-inner");
  const textSource = document.getElementById(id);
  if (!modal || !modalInner || !textSource) return;

  modalInner.innerHTML = `
    <div class="modal-text">
      ${textSource.innerHTML}
    </div>
  `;

  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeModal(event) {
  const modal = document.getElementById("modal");
  const modalInner = document.getElementById("modal-inner");
  if (!modal || !modalInner) return;
  if (event && event.target.id !== "modal") return;

  modal.style.display = "none";
  modalInner.innerHTML = "";
  document.body.style.overflow = "";
}

/* -------------------------------------------------------
   MUSIC PLAYER
   실제 페이지 reload가 일어나지 않는 동안에는 이 audio 요소가
   그대로 살아 있으므로 모바일에서도 음악이 끊기지 않는다.
   localStorage는 새로고침/직접 주소 접근 때 복구용으로 남겨둔다.
-------------------------------------------------------- */
const tracks = [
  {
    title: "긴 밤(feat. 기리보이) - Seori",
    src: "https://pmc314159.github.io/Music/long-night.mp3"
  },
  {
    title: "Running through the night - Seori",
    src: "https://pmc314159.github.io/Music/seori-running-through-the-night.mp3"
  }
];

const MUSIC_KEYS = {
  track: "mh_music_track",
  time: "mh_music_time",
  playing: "mh_music_playing",
  resumeWanted: "mh_music_resume_wanted",
  savedAt: "mh_music_saved_at"
};

function ensureMusicPlayer() {
  if (document.getElementById("music-player")) return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="music-player" id="music-player">
      <div class="music-left">
        <span class="music-icon">♫</span>
        <span class="music-title" id="music-title">긴 밤(feat. 기리보이) - Seori</span>
      </div>
      <div class="music-controls">
        <button class="music-btn small" type="button" onclick="prevTrack()" aria-label="previous track">‹</button>
        <button class="music-btn" type="button" onclick="toggleMusic()" id="music-btn" aria-label="play or pause">▶</button>
        <button class="music-btn small" type="button" onclick="nextTrack()" aria-label="next track">›</button>
      </div>
      <audio id="bgm" preload="auto"></audio>
    </div>
  `);
}

ensureMusicPlayer();

const bgm = document.getElementById("bgm");
const musicBtn = document.getElementById("music-btn");
const musicTitle = document.getElementById("music-title");
const musicPlayer = document.getElementById("music-player");

let currentTrack = Number(localStorage.getItem(MUSIC_KEYS.track) || 0);
let restoringTrack = false;
let lastTimeSave = 0;
let softNavigationActive = false;
let navSerial = 0;

if (!Number.isInteger(currentTrack) || currentTrack < 0 || currentTrack >= tracks.length) {
  currentTrack = 0;
}

function setMusicButton(isPlaying) {
  if (!musicBtn) return;
  musicBtn.textContent = isPlaying ? "Ⅱ" : "▶";
  musicBtn.setAttribute("aria-label", isPlaying ? "pause" : "play");
}

function readStoredNumber(key, fallback = 0) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

function saveMusicState({ playing, resumeWanted } = {}) {
  if (!bgm) return;

  const actualPlaying = playing ?? (!bgm.paused && !bgm.ended);
  const wantsResume = resumeWanted ?? actualPlaying;
  const currentTime = Number.isFinite(bgm.currentTime) ? bgm.currentTime : 0;

  localStorage.setItem(MUSIC_KEYS.track, String(currentTrack));
  localStorage.setItem(MUSIC_KEYS.time, String(currentTime));
  localStorage.setItem(MUSIC_KEYS.playing, String(actualPlaying));
  localStorage.setItem(MUSIC_KEYS.resumeWanted, String(wantsResume));
  localStorage.setItem(MUSIC_KEYS.savedAt, String(Date.now()));
}

function setTrackSource(index) {
  if (!bgm || !musicTitle) return;

  currentTrack = index;
  restoringTrack = true;
  bgm.src = tracks[currentTrack].src;
  bgm.load();
  musicTitle.textContent = tracks[currentTrack].title;
  localStorage.setItem(MUSIC_KEYS.track, String(currentTrack));
}

function tryResumeMusic() {
  if (!bgm || !musicBtn) return;

  bgm.play()
    .then(() => {
      restoringTrack = false;
      setMusicButton(true);
      musicBtn.removeAttribute("title");
      saveMusicState({ playing: true, resumeWanted: true });
    })
    .catch(() => {
      restoringTrack = false;
      setMusicButton(false);
      musicBtn.title = "브라우저가 자동 재생을 막았습니다. 누르면 이어서 재생됩니다.";
      saveMusicState({ playing: false, resumeWanted: true });
    });
}

function restoreMusicState() {
  if (!bgm || !musicTitle || !musicBtn) return;

  const storedTime = Math.max(0, readStoredNumber(MUSIC_KEYS.time, 0));
  const wasActuallyPlaying = localStorage.getItem(MUSIC_KEYS.playing) === "true";
  const resumeWanted = localStorage.getItem(MUSIC_KEYS.resumeWanted) === "true";
  const savedAt = readStoredNumber(MUSIC_KEYS.savedAt, Date.now());

  const elapsedSinceSave = wasActuallyPlaying
    ? Math.max(0, (Date.now() - savedAt) / 1000)
    : 0;

  const desiredTime = storedTime + elapsedSinceSave;
  setTrackSource(currentTrack);

  const applySavedPosition = () => {
    let targetTime = desiredTime;

    if (Number.isFinite(bgm.duration) && bgm.duration > 0) {
      targetTime %= bgm.duration;
    }

    try {
      bgm.currentTime = targetTime;
    } catch (_) {
      bgm.currentTime = 0;
    }

    localStorage.setItem(MUSIC_KEYS.time, String(bgm.currentTime || 0));
    localStorage.setItem(MUSIC_KEYS.savedAt, String(Date.now()));

    if (resumeWanted) {
      tryResumeMusic();
    } else {
      restoringTrack = false;
      setMusicButton(false);
    }
  };

  if (bgm.readyState >= 1) {
    applySavedPosition();
  } else {
    bgm.addEventListener("loadedmetadata", applySavedPosition, { once: true });
  }
}

function toggleMusic() {
  if (!bgm || !musicBtn) return;

  if (bgm.paused) {
    localStorage.setItem(MUSIC_KEYS.resumeWanted, "true");

    bgm.play()
      .then(() => {
        setMusicButton(true);
        musicBtn.removeAttribute("title");
        saveMusicState({ playing: true, resumeWanted: true });
      })
      .catch(() => {
        setMusicButton(false);
        saveMusicState({ playing: false, resumeWanted: false });
      });
  } else {
    saveMusicState({ playing: false, resumeWanted: false });
    bgm.pause();
    setMusicButton(false);
  }
}

function changeTrack(index, shouldPlay) {
  if (!bgm || !musicBtn) return;

  const normalizedIndex = (index + tracks.length) % tracks.length;
  setTrackSource(normalizedIndex);

  const startNewTrack = () => {
    try {
      bgm.currentTime = 0;
    } catch (_) {}

    localStorage.setItem(MUSIC_KEYS.time, "0");
    localStorage.setItem(MUSIC_KEYS.savedAt, String(Date.now()));
    localStorage.setItem(MUSIC_KEYS.resumeWanted, String(shouldPlay));

    if (shouldPlay) {
      tryResumeMusic();
    } else {
      restoringTrack = false;
      setMusicButton(false);
      saveMusicState({ playing: false, resumeWanted: false });
    }
  };

  if (bgm.readyState >= 1) {
    startNewTrack();
  } else {
    bgm.addEventListener("loadedmetadata", startNewTrack, { once: true });
  }
}

function nextTrack() {
  if (!bgm) return;
  const shouldPlay = !bgm.paused || localStorage.getItem(MUSIC_KEYS.resumeWanted) === "true";
  changeTrack(currentTrack + 1, shouldPlay);
}

function prevTrack() {
  if (!bgm) return;
  const shouldPlay = !bgm.paused || localStorage.getItem(MUSIC_KEYS.resumeWanted) === "true";
  changeTrack(currentTrack - 1, shouldPlay);
}

if (bgm && musicBtn) {
  bgm.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastTimeSave < 500) return;
    lastTimeSave = now;

    localStorage.setItem(MUSIC_KEYS.time, String(bgm.currentTime || 0));
    localStorage.setItem(MUSIC_KEYS.savedAt, String(now));
  });

  bgm.addEventListener("play", () => {
    setMusicButton(true);
    saveMusicState({ playing: true, resumeWanted: true });
  });

  bgm.addEventListener("pause", () => {
    setMusicButton(false);
    if (restoringTrack) return;
    saveMusicState({ playing: false, resumeWanted: false });
  });

  bgm.addEventListener("seeking", () => {
    localStorage.setItem(MUSIC_KEYS.time, String(bgm.currentTime || 0));
    localStorage.setItem(MUSIC_KEYS.savedAt, String(Date.now()));
  });

  bgm.addEventListener("ended", () => {
    changeTrack(currentTrack + 1, true);
  });
}

/* -------------------------------------------------------
   SOFT NAVIGATION
   각 HTML 파일은 그대로 두되, 내부 링크 클릭 시 문서 전체를
   새로 여는 대신 목적지 HTML의 .screen만 가져와 교체한다.
   그래서 #bgm은 DOM에서 사라지지 않고 그대로 재생된다.
-------------------------------------------------------- */
function isSoftNavigationLink(link) {
  return !!link.closest(".archive-item, .back-btn");
}

function normalizedHistoryUrl(targetUrl, nextScreen) {
  if (nextScreen.id === "home") {
    return `${targetUrl.origin}/`;
  }
  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

async function softNavigate(href, { push = true } = {}) {
  const targetUrl = new URL(href, window.location.href);
  if (targetUrl.origin !== window.location.origin) {
    window.location.href = targetUrl.href;
    return;
  }

  const requestNumber = ++navSerial;
  softNavigationActive = true;

  try {
    const response = await fetch(targetUrl.href, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    if (requestNumber !== navSerial) return;

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const nextScreen = parsed.querySelector(".screen");
    const currentScreen = document.querySelector(".screen");

    if (!nextScreen || !currentScreen) {
      throw new Error("페이지의 .screen 영역을 찾지 못했습니다.");
    }

    /* 상대 이미지 경로가 새 주소를 기준으로 해석되도록 URL부터 바꾼다. */
    if (push) {
      history.pushState({}, "", normalizedHistoryUrl(targetUrl, nextScreen));
    }

    const importedScreen = document.importNode(nextScreen, true);
    currentScreen.replaceWith(importedScreen);
    document.title = parsed.title || document.title;

    const intro = document.getElementById("intro");
    if (intro) intro.style.display = "none";

    document.body.classList.remove("intro-active");

    if (importedScreen.id === "home") {
      document.body.classList.remove("subpage");
      importedScreen.style.display = "block";
    } else {
      document.body.classList.add("subpage");
      importedScreen.style.display = "block";
    }

    if (musicPlayer) {
      musicPlayer.style.display = "flex";
    }

    closeModal();
    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Soft navigation failed:", error);
    /* fetch가 실패하면 일반 페이지 이동으로 안전하게 fallback */
    window.location.href = targetUrl.href;
  } finally {
    softNavigationActive = false;
  }
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest("a[href]");
  if (!link || !isSoftNavigationLink(link)) return;
  if (link.target === "_blank" || link.hasAttribute("download")) return;

  let destination;
  try {
    destination = new URL(link.href, window.location.href);
  } catch (_) {
    return;
  }

  if (destination.origin !== window.location.origin) return;

  event.preventDefault();
  softNavigate(destination.href, { push: true });
});

/* 브라우저 뒤로/앞으로 버튼도 reload 없이 내용만 바꾼다. */
window.addEventListener("popstate", () => {
  softNavigate(window.location.href, { push: false });
});

/* 진짜 새로고침/탭 닫기 때만 localStorage에 마지막 상태를 저장한다. */
window.addEventListener("pagehide", () => {
  if (!softNavigationActive) {
    const shouldResume = bgm ? !bgm.paused : false;
    saveMusicState({ playing: shouldResume, resumeWanted: shouldResume });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

window.addEventListener("load", () => {
  if (document.body.classList.contains("subpage") && musicPlayer) {
    musicPlayer.style.display = "flex";
  }

  if (window.location.hash === "#home") {
    showHome();
  }

  restoreMusicState();
});
