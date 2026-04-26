(() => {
  const RealTime = window.RealTime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = RealTime.video;

  function createInflearnAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findCurrentTimeButton() {
      return document.querySelector("button.shaka-current-time");
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findCurrentTimeButton();
      },
      isTriggerVisible: isVisibleElement,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  RealTime.adapters.createInflearnAdapter = createInflearnAdapter;
})();
