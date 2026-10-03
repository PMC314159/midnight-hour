/* =========================================================
   REMOVE LEGACY CLOSE ELEMENTS
========================================================= */

function removeLegacyCloseElements() {
  const elements = document.querySelectorAll("body *");

  elements.forEach((element) => {
    const text = element.textContent?.trim().toUpperCase();

    if (
      text === "CLOSE" &&
      element.children.length === 0
    ) {
      element.remove();
    }
  });
}


/* 처음 페이지가 열렸을 때 제거 */
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    removeLegacyCloseElements
  );
} else {
  removeLegacyCloseElements();
}


/* 다른 스크립트가 나중에 CLOSE를 다시 만들 경우에도 제거 */
const closeCleanupObserver = new MutationObserver(() => {
  removeLegacyCloseElements();
});


closeCleanupObserver.observe(
  document.documentElement,
  {
    childList: true,
    subtree: true
  }
);
