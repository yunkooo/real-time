(() => {
  const YRTC = window.YRTC;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = YRTC.video;

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

  YRTC.adapters.createGenericAdapter = createGenericAdapter;
})();
