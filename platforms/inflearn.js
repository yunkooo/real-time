(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;

  function createInflearnAdapter(options = {}) {
    const isSupportedPage = options.isSupportedPage || (() => true);

    function findTimerButton() {
      const timerButtons = [...document.querySelectorAll("button.timer")];
      return (
        timerButtons.find((button) => button.querySelector('svg[data-icon="timer"]')) ||
        timerButtons[0] ||
        null
      );
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

    return createVideoAdapter({
      isSupportedPage,
      findTrigger() {
        return findTimerButton();
      },
      fallbackOnUnusableTrigger: false,
      isTriggerVisible: isHoverableElement
    });
  }

  Realtime.adapters.createInflearnAdapter = createInflearnAdapter;
})();
