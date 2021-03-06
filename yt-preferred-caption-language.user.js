// ==UserScript==
// @name        YouTube: Preferred Caption Language
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @author      nattofriends
// @description Select captions only from a list of preferred languages, otherwise disable them.
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_notification
// @grant       GM_registerMenuCommand
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @noframes    Otherwise the menu option will run for both the main window and the chat frame.
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.1
// ==/UserScript==

(() => {
  const name = GM_info.script.name;

  const playerStateUnstarted = -1;
  const playerStateCued = 5;
    
  const log = logger(name);
  const wrap = errorWrapper(name);
    
  // Greasemonkey 4 doesn't support this! But Tampermonkey and Violentmonkey do!
  GM_registerMenuCommand('Set Preferred Languages', saveSettings);
  
  var preferredLanguages = GM_getValue('preferredLanguages')
  if (preferredLanguages === undefined) {
    GM_notification({
      title: name,
      text: 'Please set preferred languages to use this script.',
    })
    return;
  }
  preferredLanguages = preferredLanguages.split(',')
                   
  function saveSettings() {
    let response = window.prompt(
      'Input a comma-separated list of preferred languages:',
      GM_getValue('preferredLanguages', ''),
    );
    
    if (response !== null) {
      preferredLanguages = response.split(',');
      GM_setValue('preferredLanguages', response);
      log(`Saving preferredLanguages: ${response}`);
    }
  }

  let main = wrap((event) => {
    // We explicitly call main() in addition to listening for yt-navigate-finish events,
    // because sometimes this code will run after that event is fired for the initial page
    // load.
    // Ignore the event if that is the case.
    if (event !== undefined && event.target.numNavigations_ == 0) {
      log('Ignoring navigation event when numNavigations is 0');
      return;
    }
    
    // Embeds seem to not have the captions functions (toggleSubtitles())
    // and the caption tracklist seems to be undefined if we ask at this point,
    // so skip embeds.
    if (!/\/(watch)/.test(window.location.pathname)) {
      return;
    }
            
    waitForElement('.html5-video-player', wrap((player) => {
      log(`Loaded player on ${window.location.pathname}`);
      
      // Does player.setOption('captions', 'reload', true) have the same effect?
      player.toggleSubtitles();

      var trackList = player.getOption('captions', 'tracklist');
      // There may not actually be any caption tracks at all, even autogenerated ones.
      // This in spite of the fact that the autogenerated one is listed in the playerResponse?
      // Also, this may mask issues with querying the player too early.
      if (trackList === undefined) {
        log('No caption tracks found, exiting');
        return
      }

      var availableTracks = trackList.map(track => track.languageCode);
      log(`Available tracks: ${availableTracks}`)

      var selectedLanguage = preferredLanguages.find(lang => availableTracks.includes(lang));
      log(`Selected ${selectedLanguage} of available ${availableTracks}`);

      var newValue = selectedLanguage === undefined ? {} : {languageCode: selectedLanguage};

      player.setOption('captions', 'track', newValue);
    }));
  });

  main();
  window.addEventListener('yt-navigate-finish', main);
})();
