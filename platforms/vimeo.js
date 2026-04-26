(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;

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

    return createVideoAdapter({
      isSupportedPage,
      findTrigger() {
        return findProgressBarContainer();
      },
      isTriggerVisible(trigger) {
        return document.visibilityState === "visible" && isVisibleElement(trigger);
      }
    }, { getFallbackRect });
  }

  Realtime.adapters.createVimeoAdapter = createVimeoAdapter;
})();
