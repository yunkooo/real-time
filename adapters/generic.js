(() => {
  const RealTime = window.RealTime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = RealTime.video;

  function createGenericAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  RealTime.adapters.createGenericAdapter = createGenericAdapter;
})();
