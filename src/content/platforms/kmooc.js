(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;

  function createKmoocAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);
    const controlZIndex = "3";
    const promotedElements = new Map();

    function rememberStyle(element) {
      if (!element || promotedElements.has(element)) {
        return;
      }

      promotedElements.set(element, {
        position: element.style.position,
        zIndex: element.style.zIndex,
        pointerEvents: element.style.pointerEvents
      });
    }

    function pruneDisconnectedPromotedElements() {
      promotedElements.forEach((_style, element) => {
        if (!element.isConnected) {
          promotedElements.delete(element);
        }
      });
    }

    function promoteElement(element) {
      pruneDisconnectedPromotedElements();

      if (!element) {
        return;
      }

      rememberStyle(element);

      const style = getComputedStyle(element);
      if (style.position === "static") {
        element.style.position = "relative";
      }

      element.style.zIndex = controlZIndex;
      element.style.pointerEvents = "auto";
    }

    function keepControlsInteractive() {
      promoteElement(document.querySelector(".vjs-control-bar"));
      promoteElement(document.querySelector(".vjs-progress-control"));
    }

    function findPointerActivityTarget(video) {
      const player = document.querySelector(".video-js");
      const target =
        [player, video?.parentElement, video].filter(Boolean).find(isVisibleElement) ||
        player ||
        video?.parentElement ||
        video ||
        null;

      keepControlsInteractive();

      return target;
    }

    return createVideoAdapter({
      isSupportedPage,
      interactionMode: "pointer-activity",
      findPointerActivityTarget,
      pointerActivityHideDelayMs: 1000,
      cleanup() {
        promotedElements.forEach((style, element) => {
          element.style.position = style.position;
          element.style.zIndex = style.zIndex;
          element.style.pointerEvents = style.pointerEvents;
        });
        promotedElements.clear();
      }
    });
  }

  Realtime.adapters.registerPlatform({
    name: "kmooc",
    isMatch({ host }) {
      return host === "lms.kmooc.kr";
    },
    create() {
      return createKmoocAdapter({
        isSupportedPage() {
          return window.location.pathname === "/mod/vod/viewer.php";
        }
      });
    }
  });
})();
