(() => {
  const Realtime = window.Realtime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = Realtime.video;

  function createUdemyAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findProgressDisplay() {
      const displays = [...document.querySelectorAll('[data-purpose="progress-display"]')];
      return (
        displays.find(
          (display) =>
            display.querySelector('[data-purpose="current-time"]') &&
            display.querySelector('[data-purpose="duration"]')
        ) ||
        displays[0] ||
        null
      );
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findProgressDisplay();
      },
      isTriggerVisible: isVisibleElement,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  Realtime.adapters.createUdemyAdapter = createUdemyAdapter;
})();
