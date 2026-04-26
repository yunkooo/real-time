(() => {
  const Realtime = window.Realtime;
  const { getVideoRate, isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;
  const { findFirstVisibleElement, parsePlaybackRateText } = Realtime.dom;

  function createEbsiAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function getSpeedControlCandidates() {
      const rateValue = document.querySelector("#rateValue[data-control-id='displayRate']");
      return [
        document.querySelector(".mpv_current_speed"),
        rateValue?.closest(".drop.drop_speed"),
        document.querySelector(".drop.drop_speed")
      ];
    }

    function getRateDisplayCandidates() {
      return [
        document.querySelector(".mpv_current_speed"),
        document.querySelector("#rateValue[data-control-id='displayRate']")
      ];
    }

    function findSpeedControl() {
      const candidates = getSpeedControlCandidates();
      return findFirstVisibleElement(candidates) || candidates.filter(Boolean)[0] || null;
    }

    function getDisplayedRate() {
      const candidates = getRateDisplayCandidates();
      const rateElement = findFirstVisibleElement(candidates) || candidates.filter(Boolean)[0];
      const rateText = rateElement?.textContent || "";
      return parsePlaybackRateText(rateText);
    }

    return createVideoAdapter({
      isSupportedPage,
      findTrigger() {
        return findSpeedControl();
      },
      isTriggerVisible: isVisibleElement,
      getPlaybackRate(video) {
        return getDisplayedRate() || getVideoRate(video);
      }
    });
  }

  Realtime.adapters.createEbsiAdapter = createEbsiAdapter;
})();
