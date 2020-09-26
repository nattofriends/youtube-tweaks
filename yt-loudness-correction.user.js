// ==UserScript==
// @name        YouTube: Loudness Correction
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @match       *://*.youtube-nocookie.com/*
// @author      nattofriends
// @description Amplify videos to equal loudness using the peak loudness value from YouTube. NOT recommended for use in Firefox.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_notification
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.0
// ==/UserScript==

(() => {
  const name = GM_info.script.name;
  
  const playerStateUnstarted = -1;
  const playerStateCued = 5;
  
  const log = logger(name);
  const wrap = errorWrapper(name);
  
  var gainNode;

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
      return;
    }
    
    // Embeds have .html5-video-player, but not #movie_player.
    waitForElement('.html5-video-player', (player) => {
      log(`Loaded player on ${window.location.pathname}`);
    
      var playerResponse = player.getPlayerResponse();
      if (playerResponse === null) {
        log("Waiting for metadata to load")
        let metadataListener = () => {
          player.removeEventListener('onLoadedMetadata', metadataListener);
          log('Got onLoadedMetadata, restarting')
          main();
        }
        player.addEventListener('onLoadedMetadata', metadataListener);
        return;
      }

      // A video could not have this information for a variety of reasons.
      if (playerResponse.playerConfig === undefined) {
        log("Undefined playerConfig, giving up");
        return;
      }
      
      let loudness = playerResponse.playerConfig.audioConfig.loudnessDb;

      if (loudness < 0.0) {
        log(`Loudness Corrected: ${loudness}dB`);

        // XXX: What's a reasonable maximum?
        if (loudness < -10.0) {
          log("Refusing to correct by more than 10dB")
          loudness = -10.0;
        }

        loudness = 10 ** ((loudness * -1) / 20);

        if (gainNode !== undefined) {
          log("Using existing gainNode")
          gainNode.gain.value = loudness;
          return;
        }

        var v = document.querySelector("video");
        var audioCtx, terminal;

        if (v._audioTerminalNode === undefined) {
          audioCtx = new AudioContext();
          terminal = audioCtx.createMediaElementSource(v);
          log("Creating new AudioContext")
        } else { // Use the already-defined audioCtx.
          audioCtx = v._audioTerminalNode.context;
          terminal = v._audioTerminalNode;
          log("Using existing audioCtx")
        }

        gainNode = audioCtx.createGain()
        gainNode.gain.value = loudness;

        terminal.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        v._audioTerminalNode = gainNode;
      } else {
        if (gainNode !== undefined) {
          log("Resetting gain to 1");
          gainNode.gain.value = 1;
          return;
        } else {
          log("No gainNode defined, doing nothing")
        }
      }
    });
  });

  main();
  window.addEventListener('yt-navigate-finish', main)
})();
