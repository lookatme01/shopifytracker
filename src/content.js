(function () {
  let done = false;

  function onSnapshot(event) {
    if (done) return;
    try {
      const detected = ShopifyDetect.detect(JSON.parse(event.detail));
      done = true;
      document.removeEventListener('shopify-detector:snapshot', onSnapshot);
      if (detected) chrome.runtime.sendMessage({ type: 'store-detected', detected });
    } catch (e) {
      /* ignore malformed snapshots */
    }
  }

  document.addEventListener('shopify-detector:snapshot', onSnapshot);

  // The MAIN-world script may register its listener after this one; retry a few times.
  [0, 1000, 3000].forEach((delay) =>
    setTimeout(() => {
      if (!done) document.dispatchEvent(new CustomEvent('shopify-detector:request'));
    }, delay)
  );
})();
