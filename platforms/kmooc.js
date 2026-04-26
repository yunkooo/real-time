(() => {
  const Realtime = window.Realtime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = Realtime.video;

  function createKmoocAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);
    const maxZIndex = 2147483647;
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

    function promoteElement(element) {
      if (!element) {
        return;
      }

      rememberStyle(element);

      const style = getComputedStyle(element);
      if (style.position === "static") {
        element.style.position = "relative";
      }

      element.style.zIndex = String(maxZIndex);
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

      if (target) {
        promoteElement(target.closest?.(".video-js") || target);
        keepControlsInteractive();
      }

      return target;
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findPointerActivityTarget,
      pointerActivityHideDelayMs: 1000,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      },
      cleanup() {
        promotedElements.forEach((style, element) => {
          element.style.position = style.position;
          element.style.zIndex = style.zIndex;
          element.style.pointerEvents = style.pointerEvents;
        });
        promotedElements.clear();
      }
    };
  }

  Realtime.adapters.createKmoocAdapter = createKmoocAdapter;
})();
