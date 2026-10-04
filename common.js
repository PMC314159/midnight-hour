/*
  Midnight Hour
  Persistent music player + iframe page navigation

  root:
    <script src="./common.js?v=9"></script>

  subpages:
    <script src="../common.js?v=9"></script>

  기능:
  - 음악은 메인 페이지에서 계속 재생
  - 카테고리 페이지는 iframe으로 표시
  - 하위 페이지의 중복 음악 플레이어 숨김
  - BACK TO MAIN 지원
  - BACK TO MAIN이 없는 페이지에는 자동 생성
  - 브라우저 뒤로가기 / 앞으로가기 지원
*/


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
  "midnight-hour-player-v9";


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
   PLAYER ICON
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
      "Audio playback failed:",
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
   PREVIOUS / NEXT
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
   MAIN PLAYER INITIALIZE
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



  bgm.addEventListener(
    "loadedmetadata",
    function() {

      if (
        pendingTime > 0 &&
        Number.isFinite(
          bgm.duration
        )
      ) {

        try {

          bgm.currentTime =
            Math.min(
              pendingTime,

              Math.max(
                0,
                bgm.duration - .25
              )
            );

        }

        catch (_) {}


        pendingTime = 0;

      }

    }
  );



  /*
    첫 번째 음악 URL이 실패하면
    두 번째 URL 사용.
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

        const currentTime =
          Number.isFinite(
            bgm.currentTime
          )
            ? bgm.currentTime
            : pendingTime;


        pendingTime =
          currentTime || 0;


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
   GLOBAL MUSIC FUNCTIONS
========================================================= */

window.toggleMusic =
  toggleMusic;


window.prevTrack =
  prevTrack;


window.nextTrack =
  nextTrack;



/* =========================================================
   IFRAME SUBPAGE MODE
========================================================= */

if (IS_IFRAME) {


  /* =======================================================
     HIDE DUPLICATE MUSIC PLAYER
  ======================================================== */

  if (musicPlayer) {

    musicPlayer.style.display =
      "none";

  }


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



  /* =======================================================
     SEND BACK MESSAGE
  ======================================================== */

  function sendBackToMain() {

    window.parent.postMessage(
      {
        type:
          "midnight-hour-close-page"
      },

      window.location.origin
    );

  }



  /* =======================================================
     CHECK EXISTING BACK BUTTON
  ======================================================== */

  function isVisible(
    element
  ) {

    if (!element) {
      return false;
    }


    const style =
      window.getComputedStyle(
        element
      );


    const rect =
      element.getBoundingClientRect();


    return (

      style.display !== "none" &&

      style.visibility !== "hidden" &&

      Number(style.opacity) !== 0 &&

      rect.width > 0 &&

      rect.height > 0

    );

  }



  function findExistingBack() {

    const controls =
      document.querySelectorAll(
        "a, button"
      );


    for (
      const control
      of controls
    ) {

      const text =
        (
          control.textContent || ""
        )
          .trim()
          .toUpperCase();


      if (

        text.includes(
          "BACK TO MAIN"
        ) ||

        text === "HOME" ||

        text === "← HOME"

      ) {

        if (
          isVisible(
            control
          )
        ) {

          return control;

        }

      }

    }


    return null;

  }



  /* =======================================================
     CREATE BACK BUTTON WHEN MISSING
  ======================================================== */

  function ensureBackButton() {

    /*
      이미 personnel처럼 보이는 뒤로가기 버튼이 있으면
      아무것도 만들지 않는다.
    */

    const existing =
      findExistingBack();


    if (existing) {
      return;
    }


    if (
      document.getElementById(
        "mh-global-back"
      )
    ) {
      return;
    }



    /*
      각 페이지의 기존 topbar가 있으면
      그 안에 자연스럽게 넣는다.
    */

    const topContainer =

      document.querySelector(
        [
          ".topbar",
          ".mh-top",
          ".fragments-top",
          ".stills-top",
          ".personnel-top",
          ".personnel-nav"
        ].join(",")
      );


    const back =
      document.createElement(
        "a"
      );


    back.id =
      "mh-global-back";


    back.href =
      "../index.html";


    back.textContent =
      "← BACK TO MAIN";


    back.setAttribute(
      "aria-label",
      "메인으로 돌아가기"
    );


    /*
      다른 페이지 CSS에 의해 숨겨지지 않게
      기본 스타일을 직접 부여.
    */

    back.style.setProperty(
      "display",
      "inline-flex",
      "important"
    );


    back.style.setProperty(
      "align-items",
      "center",
      "important"
    );


    back.style.setProperty(
      "visibility",
      "visible",
      "important"
    );


    back.style.setProperty(
      "opacity",
      "1",
      "important"
    );


    back.style.setProperty(
      "color",
      "rgba(255,255,255,.58)",
      "important"
    );


    back.style.setProperty(
      "background",
      "transparent",
      "important"
    );


    back.style.setProperty(
      "border",
      "0",
      "important"
    );


    back.style.setProperty(
      "font-family",
      '"GmarketSans", sans-serif',
      "important"
    );


    back.style.setProperty(
      "font-size",
      "11px",
      "important"
    );


    back.style.setProperty(
      "font-weight",
      "300",
      "important"
    );


    back.style.setProperty(
      "line-height",
      "1.4",
      "important"
    );


    back.style.setProperty(
      "letter-spacing",
      ".14em",
      "important"
    );


    back.style.setProperty(
      "text-decoration",
      "none",
      "important"
    );


    back.style.setProperty(
      "cursor",
      "pointer",
      "important"
    );


    back.style.setProperty(
      "white-space",
      "nowrap",
      "important"
    );


    back.addEventListener(
      "click",
      function(event) {

        event.preventDefault();

        event.stopPropagation();


        sendBackToMain();

      }
    );



    if (topContainer) {

      /*
        topbar가 있는 페이지:
        기존 디자인 안에 뒤로가기 삽입.
      */

      topContainer.insertBefore(
        back,
        topContainer.firstChild
      );

    }

    else {

      /*
        topbar 자체가 없는 페이지:
        좌측 상단에 고정 버튼 생성.
      */

      back.style.setProperty(
        "position",
        "fixed",
        "important"
      );


      back.style.setProperty(
        "top",
        "28px",
        "important"
      );


      back.style.setProperty(
        "left",
        "28px",
        "important"
      );


      back.style.setProperty(
        "z-index",
        "9998",
        "important"
      );


      document.body.appendChild(
        back
      );

    }

  }



  /* =======================================================
     INTERCEPT EXISTING BACK BUTTONS
  ======================================================== */

  document.addEventListener(
    "click",
    function(event) {

      const control =
        event.target.closest(
          "a, button"
        );


      if (!control) {
        return;
      }


      const text =
        (
          control.textContent || ""
        )
          .trim()
          .toUpperCase();


      const href =
        (
          control.getAttribute(
            "href"
          ) || ""
        )
          .trim();


      const isBack =

        control.id ===
          "mh-global-back" ||

        control.classList.contains(
          "back"
        ) ||

        control.classList.contains(
          "mh-back"
        ) ||

        control.classList.contains(
          "fragments-back"
        ) ||

        control.classList.contains(
          "stills-back"
        ) ||

        control.classList.contains(
          "personnel-back"
        ) ||

        text.includes(
          "BACK TO MAIN"
        ) ||

        text === "HOME" ||

        text === "← HOME" ||

        href === "../index.html" ||

        href === "../index.html#home" ||

        href === "../" ||

        href === "/";


      if (!isBack) {
        return;
      }


      event.preventDefault();

      event.stopPropagation();


      sendBackToMain();

    },

    true
  );



  /* =======================================================
     INITIALIZE BACK BUTTON
  ======================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      ensureBackButton
    );

  }

  else {

    ensureBackButton();

  }


}



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



  /* =======================================================
     SITE BASE
  ======================================================== */

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
     GET ROUTE FROM URL
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
     CREATE FRAME LAYER
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
      음악 플레이어는 iframe 위에 유지.
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
      이전 버전 하위 페이지가 캐시되는 문제 방지.
    */

    url.searchParams.set(
      "_v",
      Date.now().toString()
    );


    return url;

  }



  /* =======================================================
     CREATE CONTENT FRAME
  ======================================================== */

  function createContentFrame(
    route
  ) {

    ensureFrameLayer();


    /*
      iframe 내부 history가 쌓이는 걸 막기 위해
      페이지마다 새 iframe 생성.
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
     HOME CARD CLICK
  ======================================================== */

  document.addEventListener(
    "click",
    function(event) {

      const anchor =
        event.target.closest(
          "a"
        );


      if (!anchor) {
        return;
      }


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
          BACK TO MAIN을 눌러도
          history 기록을 정상적으로 한 칸 되돌린다.
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
