/* =========================================================
   MIDNIGHT HOUR
   persistent music + page overlay
========================================================= */


/* =========================================================
   BASIC
========================================================= */

const IS_IFRAME =
  window.self !== window.top;


/* =========================================================
   MUSIC
========================================================= */

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
  "midnight-hour-player-v7";


const bgm =
  document.getElementById("bgm");


const musicBtn =
  document.getElementById("music-btn");


const musicTitle =
  document.getElementById("music-title");


const musicPlayer =
  document.getElementById("music-player");


let currentTrack = 0;

let currentSource = 0;

let pendingTime = 0;

let saveTimer = null;



/* =========================================================
   IFRAME PAGE
========================================================= */

/*
  하위 페이지가 iframe 안에서 열렸을 때는
  그 페이지에 있는 음악 플레이어를 사용하지 않는다.

  실제 음악은 계속 홈 페이지에서 재생된다.
*/

if (IS_IFRAME) {

  if (musicPlayer) {
    musicPlayer.style.display = "none";
  }


  if (bgm) {

    try {

      bgm.pause();

      bgm.removeAttribute("src");

      bgm.load();

    }

    catch (error) {
      /* ignore */
    }

  }


  /*
    하위 페이지의 BACK TO MAIN을 누르면
    iframe 안에서 홈으로 이동하지 않고
    부모 홈 화면에게 "페이지 닫아줘"라고 보낸다.
  */

  document.addEventListener(
    "click",
    function(event) {

      const anchor =
        event.target.closest("a");


      if (!anchor) {
        return;
      }


      const text =
        (
          anchor.textContent || ""
        )
        .trim()
        .toUpperCase();


      const href =
        anchor.getAttribute("href") || "";


      const isBack =
        text.includes("BACK TO MAIN") ||
        text === "HOME" ||
        text === "← HOME" ||
        href === "../index.html" ||
        href === "../" ||
        href === "/";


      if (!isBack) {
        return;
      }


      event.preventDefault();


      window.parent.postMessage(
        {
          type:
            "midnight-hour-close-page"
        },
        window.location.origin
      );

    }
  );

}



/* =========================================================
   STORAGE
========================================================= */

function readPlayerState() {

  try {

    return (
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      ) || {}
    );

  }

  catch (error) {

    return {};

  }

}



function savePlayerState() {

  if (
    !bgm ||
    IS_IFRAME
  ) {
    return;
  }


  try {

    localStorage.setItem(
      STORAGE_KEY,

      JSON.stringify({

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

      })
    );

  }

  catch (error) {
    /* ignore */
  }

}



/* =========================================================
   ICON
========================================================= */

function setPlayIcon(
  playing
) {

  if (!musicBtn) {
    return;
  }


  musicBtn.textContent =
    playing
      ? "Ⅱ"
      : "▶";

}



/* =========================================================
   TRACK SOURCE
========================================================= */

function setAudioSource(
  trackIndex,
  sourceIndex = 0
) {

  if (
    !bgm ||
    !TRACKS.length ||
    IS_IFRAME
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
  index,
  resumeTime = 0
) {

  if (IS_IFRAME) {
    return;
  }


  pendingTime =
    Math.max(
      0,
      Number(resumeTime) || 0
    );


  currentSource = 0;


  setAudioSource(
    index,
    0
  );

}



/* =========================================================
   PLAY
========================================================= */

async function playCurrentTrack() {

  if (
    !bgm ||
    IS_IFRAME
  ) {
    return;
  }


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

  if (
    !bgm ||
    IS_IFRAME
  ) {
    return;
  }


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
   PREVIOUS / NEXT
========================================================= */

async function changeTrack(
  direction
) {

  if (
    !bgm ||
    !TRACKS.length ||
    IS_IFRAME
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

if (
  bgm &&
  !IS_IFRAME
) {


  bgm.addEventListener(
    "loadedmetadata",
    function() {

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
              bgm.duration - 0.25
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
    음악 주소 하나가 실패하면
    같은 곡의 다음 주소 사용
  */

  bgm.addEventListener(
    "error",
    function() {

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
    function() {

      setPlayIcon(true);

      savePlayerState();

    }
  );



  bgm.addEventListener(
    "pause",
    function() {

      setPlayIcon(false);

      savePlayerState();

    }
  );



  bgm.addEventListener(
    "ended",
    async function() {

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
    function() {

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



  /* =========================================================
     INITIAL MUSIC STATE
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

}



/* =========================================================
   GLOBAL MUSIC FUNCTIONS
========================================================= */

window.toggleMusic =
  toggleMusic;


window.prevTrack =
  prevTrack;


window.nextTrack =
  nextTrack;



/* =========================================================
   PERSISTENT PAGE ROUTER
========================================================= */

if (!IS_IFRAME) {


  const CATEGORY_ROUTES =
    new Set([
      "personnel",
      "timeline",
      "fragments",
      "stills"
    ]);


  let pageLayer = null;

  let pageFrame = null;

  let activeRoute = null;

  let oldBodyOverflow = "";



  /* =======================================================
     CREATE LAYER
  ======================================================== */

  function createPageLayer() {

    if (
      pageLayer &&
      pageFrame
    ) {
      return;
    }


    pageLayer =
      document.createElement(
        "div"
      );


    pageLayer.id =
      "mh-page-layer";


    pageLayer.style.cssText = [

      "position:fixed",

      "inset:0",

      "z-index:90",

      "display:none",

      "background:#08080d",

      "overflow:hidden"

    ].join(";");



    pageFrame =
      document.createElement(
        "iframe"
      );


    pageFrame.id =
      "mh-page-frame";


    pageFrame.title =
      "Midnight Hour content";


    pageFrame.setAttribute(
      "loading",
      "eager"
    );


    pageFrame.style.cssText = [

      "display:block",

      "width:100%",

      "height:100%",

      "margin:0",

      "padding:0",

      "border:0",

      "background:#08080d"

    ].join(";");



    pageLayer.appendChild(
      pageFrame
    );


    document.body.appendChild(
      pageLayer
    );

  }



  /* =======================================================
     GET ROUTE
  ======================================================== */

  function getCategoryRoute(
    url
  ) {

    if (
      url.origin !==
      window.location.origin
    ) {
      return null;
    }


    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);


    if (!parts.length) {
      return null;
    }


    const route =
      parts[
        parts.length - 1
      ] === "index.html"

        ? parts[
            parts.length - 2
          ]

        : parts[
            parts.length - 1
          ];


    return CATEGORY_ROUTES.has(
      route
    )
      ? route
      : null;

  }



  /* =======================================================
     OPEN CATEGORY
  ======================================================== */

  function openCategory(
    route,
    pushHistory = true
  ) {

    if (
      !CATEGORY_ROUTES.has(
        route
      )
    ) {
      return;
    }


    createPageLayer();


    activeRoute =
      route;


    oldBodyOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    pageFrame.src =
      "/" +
      route +
      "/";


    pageLayer.style.display =
      "block";


    /*
      음악 플레이어는 iframe보다 위에 남겨둔다.
    */

    if (musicPlayer) {

      musicPlayer.style.zIndex =
        "110";

    }


    if (pushHistory) {

      history.pushState(
        {
          midnightHourRoute:
            route
        },

        "",

        "/" +
        route +
        "/"
      );

    }

  }



  /* =======================================================
     CLOSE CATEGORY
  ======================================================== */

  function closeCategory(
    pushHistory = true
  ) {

    if (!pageLayer) {
      return;
    }


    pageLayer.style.display =
      "none";


    if (pageFrame) {

      pageFrame.src =
        "about:blank";

    }


    activeRoute =
      null;


    document.body.style.overflow =
      oldBodyOverflow;


    if (musicPlayer) {

      musicPlayer.style.zIndex =
        "100";

    }


    if (pushHistory) {

      history.pushState(
        {
          midnightHourRoute:
            null
        },

        "",

        "/"
      );

    }

  }



  /* =======================================================
     INTERCEPT CATEGORY LINKS
  ======================================================== */

  document.addEventListener(
    "click",
    function(event) {

      const anchor =
        event.target.closest("a");


      if (!anchor) {
        return;
      }


      /*
        Ctrl / Cmd 클릭 등은 원래 동작 유지
      */

      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }


      if (
        anchor.target === "_blank"
      ) {
        return;
      }


      let url;


      try {

        url =
          new URL(
            anchor.href,
            window.location.href
          );

      }

      catch (error) {

        return;

      }


      const route =
        getCategoryRoute(
          url
        );


      if (!route) {
        return;
      }


      event.preventDefault();


      openCategory(
        route,
        true
      );

    }
  );



  /* =======================================================
     MESSAGE FROM SUBPAGE
  ======================================================== */

  window.addEventListener(
    "message",
    function(event) {

      if (
        event.origin !==
        window.location.origin
      ) {
        return;
      }


      if (
        !event.data ||
        event.data.type !==
          "midnight-hour-close-page"
      ) {
        return;
      }


      closeCategory(true);

    }
  );



  /* =======================================================
     BROWSER BACK BUTTON
  ======================================================== */

  window.addEventListener(
    "popstate",
    function() {

      const path =
        window.location.pathname;


      const parts =
        path
          .split("/")
          .filter(Boolean);


      const route =
        parts.length
          ? parts[0]
          : null;


      if (
        route &&
        CATEGORY_ROUTES.has(
          route
        )
      ) {

        if (
          activeRoute !==
          route
        ) {

          openCategory(
            route,
            false
          );

        }

      }

      else {

        if (activeRoute) {

          closeCategory(false);

        }

      }

    }
  );

}
