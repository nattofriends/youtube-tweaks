// ==UserScript==
// @name        YouTube: Chat Add Info
// @namespace   nattofriends/youtube-tweaks
// @match       https://www.youtube.com/live_chat*
// @version     1.0
// @author      nattofriends
// @description Add seconds to live chat timestamps, and add a link to message authors' channels.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_notification
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// ==/UserScript==


(() => {
  const name = GM_info.script.name;

  const log = logger(name);
  const wrap = errorWrapper(name);
  
  const template = document.createElement('span');
  template.innerHTML = ` <a target="_blank" style='color: gray; text-decoration: none'>(U)</a>`;
  
  let apply = wrap(() => {
    // This helps us not reapply in the first few comments. Afterwards, the existing list elements
    // are reused, so we have to hook into the data update methods.
    document.querySelectorAll('yt-live-chat-text-message-renderer:not([link-applied])').forEach(el => {
      const span = template.cloneNode(true);
      const a = span.querySelector('a');
      
      // Did we get notified too fast? Hopefully if this is empty, we'll get things fixed up at dataChanged_?
      if (el.data === undefined) {
        log('data is undefined, doing nothing for now');
      } else {
        a.href = `https://www.youtube.com/channel/${el.data.authorExternalChannelId}`;
      }
      
      el.userLink = a;
      el.$.timestamp.appendChild(span);
      el.setAttribute('link-applied', '');
      
      const originalDataChanged = el.dataChanged_.bind(el);
      el.dataChanged_ = (niw, old) => {
        originalDataChanged(niw, old);
        el.userLink.href = `https://www.youtube.com/channel/${niw.authorExternalChannelId}`;
      };
      
    });
  });

  let main = wrap(() => {
    log('Starting')
    
    // When this is called back, the already created elements won't have their timestamps fixed up. Oh well...
    // We only need to get our hands on one yt-live-chat-text-message-renderer.
    waitForElement('yt-live-chat-text-message-renderer', wrap((messageRenderer) => {
      log('Applying formatter changes');
      let rendererPrototype = Object.getPrototypeOf(messageRenderer);

      rendererPrototype.TIME_FORMATTER.patternParts_ = [];
      rendererPrototype.TIME_FORMATTER.applyPattern_('h:mm:ss');      
    }));
    
    apply();
    
    new MutationObserver(apply).observe(
      document.documentElement,
      {attributes: false, childList: true, subtree: true},
    );
  });
  
  main();
})();
