/*
  Midnight Hour
  Persistent music player + iframe page navigation

  루트 index.html
    <script src="./common.js?v=8"></script>

  하위 폴더 index.html
    <script src="../common.js?v=8"></script>

  핵심:
  - 메인 페이지의 audio는 절대 없어지지 않음.
  - 카테고리는 iframe 안에서만 열림.
  - iframe 안의 중복 음악 플레이어는 숨김.
  - BACK TO MAIN / HOME은 iframe을 닫고 메인으로 복귀.
  - 브라우저 뒤로가기 / 앞으로가기 지원.
*/


/* =========================================================
   TRACKS
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
  "midnight-hour-player-v8";


const IS_IFRAME =
  window.self !== window.top;


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
   IFRAME MODE
========================================================= */

if (IS_IFRAME) {

  /*
    iframe 안에 들어 있는 중복 음악 플레이어는 숨긴다.
    실제 음악은 부모 홈 페이지에서 계속 재생된다.
  */

  if (musicPlayer) {

    musicPlayer.style.display =
      "none";

  }


  /*
    혹시 하위 페이지의 audio가 생성되어 있더라도
    절대 재생되지 않게 한다.
  */

  if (bgm) {

    try {

      bgm.pause();

      bgm.removeAttribute(
        "src"
      );

      bgm.load();

    }

    catch (_) {}

  }


  /*
    하위 페이지의 BACK TO MAIN / HOME 클릭 처리.

    iframe 내부에서 index.html로 이동하지 않고,
    바깥 홈 페이지에게 iframe을 닫으라고 알려준다.
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
        (
          anchor.getAttribute("href") || ""
        )
          .trim();


      const isBackButton =

        anchor.classList.contains("back") ||

        anchor.classList.contains(
          "fragments-back"
        ) ||

        anchor.classList.contains(
          "stills-back"
        ) ||

        anchor.classList.contains(
          "mh-back"
        ) ||

        text.includes(
          "BACK TO MAIN"
        ) ||

        text === "← HOME" ||

        text === "HOME" ||

        href === "../index.html" ||

        href === "../index.html#home" ||

        href === "../" ||

        href === "/";


      if (!isBackButton) {
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
   PLAYER STORAGE
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

  catch (_) {

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

  catch (_) {}

}



/* =========================================================
   PLAY ICON
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
   AUDIO SOURCE
========================================================= */

function setAudioSource(
  trackIndex,
  sourceIndex = 0
) {

  if (
    !bgm ||
    IS_IFRAME ||
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


  bgm.src =
    track.sources[
      currentSource
    ];


  if (musicTitle) {

    musicTitle.textContent =
      track.title;

  }


  bgm.load();

}



/* =========================================================
   LOAD TRACK
========================================================= */

function loadTrack(
  index,
  resumeTime = 0
) {

  if (
    !bgm ||
    IS_IFRAME
  ) {
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
      "Audio playback was blocked or failed:",
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
   CHANGE TRACK
========================================================= */

async function changeTrack(
  direction
) {

  if (
    !TRACKS.length ||
    !bgm ||
    IS_IFRAME
  ) {
    return;
  }


  const wasPlaying =
    !bgm.paused;


  loadTrack(
    currentTrack +
    direction,
    0
  );


  if (wasPlaying) {

    await playCurrentTrack();

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
   AUTO NEXT
========================================================= */

async function playNextTrackAutomatically() {

  if (
    !TRACKS.length ||
    !bgm ||
    IS_IFRAME
  ) {
    return;
  }


  loadTrack(
    currentTrack + 1,
    0
  );


  await playCurrentTrack();


  savePlayerState();

}



/* =========================================================
   PLAYER INITIALIZATION
========================================================= */

if (
  !IS_IFRAME &&
  bgm
) {

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



  /* saved playback position */

  bgm.addEventListener(
    "loadedmetadata",
    function() {

      if (
        pendingTime > 0 &&
        Number.isFinite(
          bgm.duration
        )
      ) {

        bgm.currentTime =
          Math.min(
            pendingTime,

            Math.max(
              0,
              bgm.duration - .25
            )
          );


        pendingTime = 0;

      }

    }
  );



  /* fallback URL */

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

        const time =
          Number.isFinite(
            bgm.currentTime
          )
            ? bgm.currentTime
            : pendingTime;


        pendingTime =
          time || 0;


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
    playNextTrackAutomatically
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


  window.addEventListener(
    "beforeunload",
    savePlayerState
  );


  setPlayIcon(false);

}



/* =========================================================
   GLOBAL PLAYER FUNCTIONS
========================================================= */

window.toggleMusic =
  toggleMusic;


window.prevTrack =
  prevTrack;


window.nextTrack =
  nextTrack;



/* =========================================================
   MAIN PAGE ROUTER
========================================================= */

if (!IS_IFRAME) {


  const ROUTES =
    new Set([
      "personnel",
      "timeline",
      "fragments",
      "stills"
    ]);



  /*
    common.js의 실제 위치를 기준으로
    사이트 root를 구한다.

    GitHub Pages 서브경로에서도 작동.
  */

  const currentScript =

    document.currentScript ||

    [...document.scripts]
      .reverse()
      .find(
        function(script) {

          return /(?:^|\/)common\.js(?:\?|#|$)/
            .test(
              script.src
            );

        }
      );


  const siteBase =
    currentScript

      ? new URL(
          "./",
          currentScript.src
        )

      : new URL(
          "./",
          window.location.href
        );



  let frameLayer =
    null;


  let contentFrame =
    null;


  let activeRoute =
    null;


  let previousBodyOverflow =
    "";



  /* =======================================================
     ROUTE FROM URL
  ======================================================== */

  function routeFromUrl(
    url
  ) {

    if (
      url.origin !==
      window.location.origin
    ) {
      return null;
    }


    if (
      !url.pathname.startsWith(
        siteBase.pathname
      )
    ) {
      return null;
    }


    const relative =
      url.pathname.slice(
        siteBase.pathname.length
      );


    const match =
      relative.match(
        /^(personnel|timeline|fragments|stills)(?:\/(?:index\.html)?)?$/
      );


    return match
      ? match[1]
      : null;

  }



  /* =======================================================
     FRAME LAYER
  ======================================================== */

  function ensureFrameLayer() {

    if (frameLayer) {
      return;
    }


    frameLayer =
      document.createElement(
        "div"
      );


    frameLayer.id =
      "mh-page-layer";


    frameLayer.style.cssText = [

      "position:fixed",

      "inset:0",

      "z-index:40",

      "display:none",

      "background:#08080d",

      "overflow:hidden"

    ].join(";");



    /*
      iframe은 음악 플레이어보다 아래에 둔다.
    */

    if (musicPlayer) {

      musicPlayer.before(
        frameLayer
      );


      musicPlayer.style.zIndex =
        "100";

    }

    else {

      document.body.appendChild(
        frameLayer
      );

    }

  }



  /* =======================================================
     ROUTE URL
  ======================================================== */

  function routeUrl(
    route
  ) {

    const url =
      new URL(
        `${route}/index.html`,
        siteBase
      );


    /*
      수정 전 iframe 페이지가 캐시되는 문제 방지.
    */

    url.searchParams.set(
      "_v",
      Date.now().toString()
    );


    return url;

  }



  /* =======================================================
     CREATE FRAME
  ======================================================== */

  function createContentFrame(
    route
  ) {

    ensureFrameLayer();


    /*
      iframe 자체의 내부 history가 브라우저 history와
      섞이는 걸 피하려고 매번 새 iframe 생성.
    */

    if (contentFrame) {

      contentFrame.remove();

      contentFrame = null;

    }


    const frame =
      document.createElement(
        "iframe"
      );


    frame.id =
      "mh-content-frame";


    frame.title =
      "Midnight Hour content";


    frame.setAttribute(
      "loading",
      "eager"
    );


    frame.style.cssText = [

      "display:block",

      "width:100%",

      "height:100%",

      "border:0",

      "margin:0",

      "padding:0",

      "background:#08080d"

    ].join(";");


    frame.src =
      routeUrl(
        route
      ).href;


    frameLayer.appendChild(
      frame
    );


    contentFrame =
      frame;

  }



  /* =======================================================
     SHOW ROUTE
  ======================================================== */

  function showRoute(
    route,
    pushHistory = true
  ) {

    if (
      !ROUTES.has(
        route
      )
    ) {
      return;
    }


    activeRoute =
      route;


    createContentFrame(
      route
    );


    frameLayer.style.display =
      "block";


    previousBodyOverflow =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    if (pushHistory) {

      history.pushState(

        {
          midnightHourRoute:
            route
        },

        "",

        `#${route}`

      );

    }

  }



  /* =======================================================
     HIDE ROUTE
  ======================================================== */

  function hideRoute(
    pushHistory = false
  ) {

    if (!frameLayer) {
      return;
    }


    activeRoute =
      null;


    frameLayer.style.display =
      "none";


    if (contentFrame) {

      contentFrame.remove();

      contentFrame = null;

    }


    document.body.style.overflow =
      previousBodyOverflow;


    if (pushHistory) {

      history.pushState(

        {
          midnightHourRoute:
            null
        },

        "",

        siteBase.pathname

      );

    }

  }



  /* =======================================================
     MAIN CARD CLICK
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
        새 탭 등의 기본 기능 유지.
      */

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.hasAttribute(
          "download"
        )
      ) {
        return;
      }


      const target =
        (
          anchor.getAttribute(
            "target"
          ) || ""
        )
          .toLowerCase();


      if (
        target &&
        target !== "_self"
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

      catch (_) {

        return;

      }


      const route =
        routeFromUrl(
          url
        );


      if (!route) {
        return;
      }


      event.preventDefault();


      showRoute(
        route,
        true
      );

    }
  );



  /* =======================================================
     MESSAGE FROM IFRAME
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
        !contentFrame ||
        event.source !==
          contentFrame.contentWindow
      ) {
        return;
      }


      if (
        event.data?.type ===
        "midnight-hour-close-page"
      ) {

        /*
          HOME / BACK TO MAIN도
          브라우저 뒤로가기와 같은 history 흐름을 사용.
        */

        if (
          history.state
            ?.midnightHourRoute
        ) {

          history.back();

        }

        else {

          hideRoute(false);

        }

      }

    }
  );



  /* =======================================================
     BROWSER BACK / FORWARD
  ======================================================== */

  window.addEventListener(
    "popstate",
    function(event) {

      const route =

        event.state
          ?.midnightHourRoute ||

        window.location.hash
          .replace(
            /^#/,
            ""
          );


      if (
        ROUTES.has(
          route
        )
      ) {

        showRoute(
          route,
          false
        );

      }

      else {

        hideRoute(false);

      }

    }
  );



  /* =======================================================
     INITIAL ROUTE
  ======================================================== */

  const initialRoute =
    window.location.hash
      .replace(
        /^#/,
        ""
      );


  if (
    ROUTES.has(
      initialRoute
    )
  ) {

    history.replaceState(

      {
        midnightHourRoute:
          initialRoute
      },

      "",

      window.location.href

    );


    showRoute(
      initialRoute,
      false
    );

  }

  else {

    history.replaceState(

      {
        midnightHourRoute:
          null
      },

      "",

      window.location.href

    );

  }

}
