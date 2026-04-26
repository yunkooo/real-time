(() => {
  const Realtime = window.Realtime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = Realtime.video;

  function createEbsiAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findSpeedControl() {
      const currentSpeed = document.querySelector(".mpv_current_speed");
      if (currentSpeed) {
        return currentSpeed;
      }

      const rateValue = document.querySelector("#rateValue[data-control-id='displayRate']");
      return rateValue?.closest(".drop.drop_speed") || document.querySelector(".drop.drop_speed");
    }

    function getDisplayedRate() {
      const rateElement =
        document.querySelector(".mpv_current_speed") ||
        document.querySelector("#rateValue[data-control-id='displayRate']");
      const rateText = rateElement?.textContent || "";
      const rate = Number.parseFloat(rateText.replace("배속", "").trim());

      return Number.isFinite(rate) && rate > 0 ? rate : null;
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findSpeedControl();
      },
      isTriggerVisible: isVisibleElement,
      getPlaybackRate(video) {
        return getDisplayedRate() || getVideoRate(video);
      },
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  Realtime.adapters.createEbsiAdapter = createEbsiAdapter;
})();
