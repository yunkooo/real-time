(() => {
  const RealTime = window.RealTime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = RealTime.video;

  function createVimeoAdapter() {
    function isSupportedPage() {
      if (window.location.hostname === "player.vimeo.com") {
        return true;
      }

      return /^\/\d+(?:$|\/)/.test(window.location.pathname);
    }

    function getFallbackRect() {
      if (window.location.hostname !== "player.vimeo.com") {
        return null;
      }

      return {
        left: 0,
        right: window.innerWidth,
        top: 0,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    function findProgressBarContainer() {
      const progressBar = document.querySelector("[data-progress-bar='true']");
      return progressBar?.parentElement || progressBar;
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findProgressBarContainer();
      },
      isTriggerVisible(trigger) {
        return document.visibilityState === "visible" && isVisibleElement(trigger);
      },
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel, getFallbackRect);
      }
    };
  }

  RealTime.adapters.createVimeoAdapter = createVimeoAdapter;
})();
