// ==UserScript==
// @name        YouTube: Aggressive Chat Reader
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @author      nattofriends
// @description Force YouTube Live Chat to poll for new messages every second, instead of the default 5 seconds.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_registerMenuCommand
// @grant       GM_notification
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.0
// ==/UserScript==

(() => {
  const name = GM_info.script.name;

  const log = logger(name);
  const wrap = errorWrapper(name);
  
  let setup = wrap(() => {
    var chatFrame;

    function startAggressivePolling() {
      log("Starting aggressive polling");

      // What's the difference between yt-timed-continuation and yt-invalidation-continuation?
      let continuation = chatFrame.querySelector("yt-timed-continuation, yt-invalidation-continuation");
      
      if (continuation === null) {
        console.error('No continuation element found')
        return;
      }

      window.setInterval(
        // Adding a closure is needed for some reason
        () => { continuation.forceTrigger() },
        // Default is around 5000ms
        1000,
      );

      GM_notification({title: GM_info.script.name, text: 'Started aggressive polling.'});
    }


    let main = wrap(() => {
      waitForElement('#chatframe', wrap((element) => {
        // Navigated yet?
        // Somehow location can be at the intended location but the document isn't quite there yet. Use this instead
        if (element.contentDocument.documentURI === 'about:blank') {
          log('Document not loaded yet, waiting');

          element.onload = wrap(() => {
            chatFrame = element.contentDocument;
            startAggressivePolling();
          });
        } else /* This hasn't happened once yet */ {
          log('Calling pollFrame now');
          chatFrame = element.contentDocument;
          startAggressivePolling();
        }
      }));
    });

    main();
  });

  GM_registerMenuCommand('Start aggressive polling', setup);
})();
