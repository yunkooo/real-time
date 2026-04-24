(() => {
  const YRTC = window.YRTC;
  const { OVERLAY_TRIGGER_ID } = YRTC.constants;
  const { createOverlayController, findActiveVideo, getVideoRate, getVideoTopRightPanelPosition } = YRTC.video;

  function createVimeoAdapter() {
    const overlay = createOverlayController(OVERLAY_TRIGGER_ID);

    function findProgressBarContainer() {
      const progressBar = document.querySelector("[data-progress-bar='true']");
      return progressBar?.parentElement || progressBar;
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

    function positionOverlay(video) {
      return overlay.position(video, {
        widthRatio: 0.12,
        minWidth: 64,
        maxWidth: 92,
        height: 44,
        bottomOffset: 92,
        useVideoFrame: true,
        fallbackRect: getFallbackRect
      });
    }

    return {
      findVideo: findActiveVideo,
      findTrigger(video) {
        const progressBarContainer = findProgressBarContainer();
        if (progressBarContainer) {
          overlay.cleanup();
          return progressBarContainer;
        }

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
        return getVideoTopRightPanelPosition(findActiveVideo(), panel, getFallbackRect);
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

  YRTC.adapters.createVimeoAdapter = createVimeoAdapter;
})();
