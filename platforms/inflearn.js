(() => {
  const Realtime = window.Realtime;
  const { findActiveVideo, getVideoRate, getVideoTopLeftPanelPosition, isVisibleElement } = Realtime.video;

  function createInflearnAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findShakaSeekBarContainer() {
      const seekBarContainer =
        document.querySelector(".shaka-range-container.shaka-seek-bar-container") ||
        document.querySelector("#player-container .shaka-seek-bar-container") ||
        document.querySelector(".shaka-seek-bar-container");

      if (seekBarContainer) {
        return seekBarContainer;
      }

      const seekBar = document.querySelector("input.shaka-seek-bar");
      return seekBar?.closest(".shaka-range-container") || seekBar;
    }

    function isHoverableElement(element) {
      if (!isVisibleElement(element)) {
        return false;
      }

      const style = getComputedStyle(element);
      if (style.pointerEvents === "none") {
        return false;
      }

      const rect = element.getBoundingClientRect();
      const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);

      return document.elementsFromPoint(x, y).some((target) => target === element || element.contains(target));
    }

    return {
      isSupportedPage,
      findVideo: findActiveVideo,
      findTrigger() {
        return findShakaSeekBarContainer();
      },
      isTriggerVisible: isHoverableElement,
      getPlaybackRate: getVideoRate,
      getPanelPosition(video, panel) {
        return getVideoTopLeftPanelPosition(video, panel);
      }
    };
  }

  Realtime.adapters.createInflearnAdapter = createInflearnAdapter;
})();
