(() => {
  const YRTC = window.YRTC;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = YRTC.video;

  function createUdemyAdapter() {
    function findProgressBar() {
      return document.querySelector('[data-purpose="video-progress-bar"]');
    }

    function isVisibleElement(element) {
      if (!element?.isConnected) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }

      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
    }

    return {
      findVideo: findActiveVideo,
      findTrigger() {
        return findProgressBar();
      },
      areControlsVisible(trigger) {
        return document.visibilityState === "visible" && isVisibleElement(trigger);
      },
      getPlaybackRate: getVideoRate,
      getTriggerRect(trigger) {
        return trigger?.getBoundingClientRect() || null;
      },
      getPanelPosition(_trigger, panel) {
        return getVideoTopLeftPanelPosition(findActiveVideo(), panel);
      }
    };
  }

  YRTC.adapters.createUdemyAdapter = createUdemyAdapter;
})();
