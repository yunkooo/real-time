(() => {
  const Realtime = window.Realtime;
  const { isVisibleElement } = Realtime.video;
  const { createVideoAdapter } = Realtime.adapters;

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

    return createVideoAdapter({
      isSupportedPage,
      findTrigger() {
        return findProgressDisplay();
      },
      isTriggerVisible: isVisibleElement
    });
  }

  Realtime.adapters.createUdemyAdapter = createUdemyAdapter;
})();
