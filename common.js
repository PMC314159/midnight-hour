/* =========================================================
   MIDNIGHT HOUR
   SHARED MUSIC PLAYER
========================================================= */


/*
  한 주소가 실패하면 다음 주소를 시도한다.
*/

const TRACKS = [

  {
    title: "긴 밤(feat. 기리보이) - Seori",

    sources: [
      "https://pmc314159.github.io/Music/long-night.mp3",
      "https://raw.githubusercontent.com/PMC314159/Music/main/long-night.mp3"
    ]
  },

  {
    title: "Running through the night - Seori",

    sources: [
      "https://pmc314159.github.io/Music/seori-running-through-the-night.mp3",
      "https://raw.githubusercontent.com/PMC314159/Music/main/seori-running-through-the-night.mp3"
    ]
  }

];


const STORAGE_KEY =
  "midnight-hour-player-v6";


const bgm =
  document.getElementById("bgm");


const musicBtn =
  document.getElementById("music-btn");


const musicTitle =
  document.getElementById("music-title");


let currentTrack = 0;

let currentSource = 0;

let pendingTime = 0;

let saveTimer = null;

let restoringPlayback = false;



/* =========================================================
   STORAGE
========================================================= */

function readPlayerState() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      );


    return saved || {};

  }

  catch (error) {

    return {};

  }

}



function savePlayerState() {

  if (!bgm) {
    return;
  }


  const state = {

    track:
      currentTrack,

    time:
      Number.isFinite(
        bgm.currentTime
      )
        ? bgm.currentTime
        : 0,

    playing:
      !bgm.paused

  };


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  }

  catch (error) {

    /* storage unavailable */

  }

}



/* =========================================================
   ICON
========================================================= */

function setPlayIcon(
  isPlaying
) {

  if (!musicBtn) {
    return;
  }


  musicBtn.textContent =
    isPlaying
      ? "Ⅱ"
      : "▶";

}



/* =========================================================
   SOURCE
========================================================= */

function setAudioSource(
  trackIndex,
  sourceIndex = 0
) {

  if (
    !bgm ||
    !TRACKS.length
  ) {
    return;
  }


  currentTrack =
    (
      trackIndex +
      TRACKS.length
    ) %
    TRACKS.length;


  const track =
    TRACKS[currentTrack];


  currentSource =
    Math.max(
      0,
      Math.min(
        sourceIndex,
        track.sources.length - 1
      )
    );


  if (musicTitle) {

    musicTitle.textContent =
      track.title;

  }


  bgm.src =
    track.sources[currentSource];


  bgm.load();

}



/* =========================================================
   LOAD TRACK
========================================================= */

function loadTrack(
  trackIndex,
  resumeTime = 0
) {

  pendingTime =
    Math.max(
      0,
      Number(resumeTime) || 0
    );


  currentSource = 0;


  setAudioSource(
    trackIndex,
    0
  );

}



/* =========================================================
   PLAY
========================================================= */

async function playCurrentTrack() {

  if (!bgm) {
    return;
  }


  /*
    iPhone/Safari 포함:
    반드시 사용자가 ▶ 버튼을 누른 이벤트 안에서
    bgm.play()가 실행되도록 한다.
  */

  try {

    await bgm.play();


    setPlayIcon(true);


    savePlayerState();

  }

  catch (error) {

    console.warn(
      "Music playback failed:",
      error
    );


    setPlayIcon(false);

  }

}



/* =========================================================
   PLAY / PAUSE
========================================================= */

async function toggleMusic() {

  if (!bgm) {
    return;
  }


  /*
    아직 src가 없는 경우를 대비
  */

  if (!bgm.src) {

    loadTrack(
      currentTrack,
      pendingTime
    );

  }


  if (bgm.paused) {

    await playCurrentTrack();

  }

  else {

    bgm.pause();


    setPlayIcon(false);


    savePlayerState();

  }

}



/* =========================================================
   TRACK CHANGE
========================================================= */

async function changeTrack(
  direction
) {

  if (
    !bgm ||
    !TRACKS.length
  ) {
    return;
  }


  const wasPlaying =
    !bgm.paused;


  const nextIndex =
    (
      currentTrack +
      direction +
      TRACKS.length
    ) %
    TRACKS.length;


  loadTrack(
    nextIndex,
    0
  );


  if (wasPlaying) {

    try {

      await bgm.play();


      setPlayIcon(true);

    }

    catch (error) {

      setPlayIcon(false);

    }

  }

  else {

    setPlayIcon(false);

  }


  savePlayerState();

}



function prevTrack() {

  changeTrack(-1);

}



function nextTrack() {

  changeTrack(1);

}



/* =========================================================
   AUDIO EVENTS
========================================================= */

if (bgm) {


  /*
    저장된 재생 위치 복구
  */

  bgm.addEventListener(
    "loadedmetadata",
    () => {

      if (
        pendingTime > 0 &&
        Number.isFinite(
          bgm.duration
        )
      ) {

        const safeTime =
          Math.min(
            pendingTime,
            Math.max(
              0,
              bgm.duration - .25
            )
          );


        try {

          bgm.currentTime =
            safeTime;

        }

        catch (error) {

          /* ignore */

        }


        pendingTime = 0;

      }

    }
  );



  /*
    첫 주소가 실패할 경우
    raw.githubusercontent 주소로 재시도
  */

  bgm.addEventListener(
    "error",
    () => {

      const track =
        TRACKS[currentTrack];


      if (!track) {
        return;
      }


      const nextSource =
        currentSource + 1;


      if (
        nextSource <
        track.sources.length
      ) {

        const savedPosition =
          Number.isFinite(
            bgm.currentTime
          )
            ? bgm.currentTime
            : pendingTime;


        pendingTime =
          savedPosition || 0;


        setAudioSource(
          currentTrack,
          nextSource
        );


        return;

      }


      console.warn(
        "All audio sources failed:",
        track.title
      );


      setPlayIcon(false);

    }
  );



  bgm.addEventListener(
    "play",
    () => {

      setPlayIcon(true);


      savePlayerState();

    }
  );



  bgm.addEventListener(
    "pause",
    () => {

      setPlayIcon(false);


      savePlayerState();

    }
  );



  bgm.addEventListener(
    "ended",
    async () => {

      const nextIndex =
        (
          currentTrack + 1
        ) %
        TRACKS.length;


      loadTrack(
        nextIndex,
        0
      );


      try {

        await bgm.play();


        setPlayIcon(true);

      }

      catch (error) {

        setPlayIcon(false);

      }

    }
  );



  bgm.addEventListener(
    "timeupdate",
    () => {

      clearTimeout(
        saveTimer
      );


      saveTimer =
        setTimeout(
          savePlayerState,
          400
        );

    }
  );



  window.addEventListener(
    "pagehide",
    savePlayerState
  );



  window.addEventListener(
    "beforeunload",
    savePlayerState
  );



  /* =========================================================
     INITIALIZE
  ========================================================= */

  const saved =
    readPlayerState();


  const savedTrack =
    Number.isInteger(
      saved.track
    )
      ? saved.track
      : 0;


  const savedTime =
    typeof saved.time === "number"
      ? saved.time
      : 0;


  loadTrack(
    savedTrack,
    savedTime
  );


  setPlayIcon(false);


  /*
    이전 페이지에서 음악이 재생 중이었으면
    브라우저가 허용하는 경우에 한해 자동 복구를 시도한다.

    모바일 브라우저가 autoplay를 막으면
    ▶ 버튼 한 번만 누르면 된다.
  */

  if (
    saved.playing === true
  ) {

    restoringPlayback = true;


    bgm.addEventListener(
      "canplay",
      async function restoreOnce() {

        bgm.removeEventListener(
          "canplay",
          restoreOnce
        );


        try {

          await bgm.play();


          setPlayIcon(true);

        }

        catch (error) {

          /*
            모바일 Safari/Chrome에서는
            페이지 이동 후 자동 재생이 차단될 수 있음.
          */

          setPlayIcon(false);

        }


        restoringPlayback = false;

      }
    );

  }

}



/* =========================================================
   GLOBAL BUTTON FUNCTIONS
========================================================= */

window.toggleMusic =
  toggleMusic;


window.prevTrack =
  prevTrack;


window.nextTrack =
  nextTrack;
