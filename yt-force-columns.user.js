// ==UserScript==
// @name        YouTube: Force Columns
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @author      nattofriends
// @description Add menu items to force single- or double-column mode regardless of viewport width, useful for forcing live chat below the video.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_registerMenuCommand
// @grant       GM_notification
// @grant       GM_unregisterMenuCommand
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.0
// ==/UserScript==

(() => {
  const name = GM_info.script.name;

  const log = logger(name);
  const wrap = errorWrapper(name);
  
  let setMediaQuery = wrap((query) => {
    log(`Setting media query to ${query}`);
    document.querySelector("iron-media-query#two-column-query").query = query;
    window.dispatchEvent(new Event('resize'));
  });
  
  let main = wrap((event) => {
    // We explicitly call main() in addition to listening for yt-navigate-finish events,
    // because sometimes this code will run after that event is fired for the initial page
    // load.
    // Ignore the event if that is the case.
    if (event !== undefined && event.target.numNavigations_ == 0) {
      log('Ignoring navigation event when numNavigations is 0');
      return;
    }
    
    if (!/\/(watch|embed.+)/.test(window.location.pathname)) {
      GM_unregisterMenuCommand('Single column');
      GM_unregisterMenuCommand('Double column');
      return;
    }
    
    GM_registerMenuCommand('Single column', () => { setMediaQuery("(max-width: 0)")});
    GM_registerMenuCommand('Double column', () => { setMediaQuery("(min-width: 0)")});
  });
  
  main();
  window.addEventListener('yt-navigate-finish', main);
})();
