(() => {
  const YRTC = window.YRTC;
  const { OVERLAY_TRIGGER_ID } = YRTC.constants;
  const { createOverlayController, findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition } = YRTC.video;

  function createGenericAdapter() {
    const overlay = createOverlayController(OVERLAY_TRIGGER_ID);

    function positionOverlay(video) {
      return overlay.position(video, {
        align: "left",
        widthRatio: 1,
        minWidth: 96,
        maxWidth: Number.POSITIVE_INFINITY,
        height: 44,
        bottomOffset: 0,
        leftOffset: 0,
        useVideoFrame: true
      });
    }

    return {
      findVideo: findActiveVideo,
      findTrigger(video) {
        return positionOverlay(video);
      },
      areControlsVisible(trigger) {
        return document.visibilityState === "visible" && !!trigger?.isConnected;
      },
      getPlaybackRate: getVideoRate,
      getTriggerRect(trigger) {
        return trigger?.getBoundingClientRect() || null;
      },
      getPanelPosition(_trigger, panel) {
        return getVideoTopLeftPanelPosition(findActiveVideo(), panel);
      },
      afterUpdate(target, video) {
        if (target.id === OVERLAY_TRIGGER_ID) {
          positionOverlay(video);
        }
      },
      cleanup() {
        overlay.cleanup();
      }
    };
  }

  YRTC.adapters.createGenericAdapter = createGenericAdapter;
})();
