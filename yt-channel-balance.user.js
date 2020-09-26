// ==UserScript==
// @name        YouTube: Channel Balance
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @match       *://*.youtube-nocookie.com/*
// @author      nattofriends
// @description Set a video to play back in only the left or right channels.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_notification
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.0
// ==/UserScript==

(() => {
  const name = GM_info.script.name;
  
  const log = logger(name);
  const wrap = errorWrapper(name);
  
  var source;
  
  let ui = document.createElement("span");
  
  var splitter, leftGain, rightGain, merger;

  let makeCallback = (left, right) => {
    return wrap(() => {
      let v = document.querySelector("video");

      var audioCtx, terminal;

      // Compatibility with Loudness Correction
      if (v._audioTerminalNode === undefined) {
        audioCtx = new AudioContext();
        terminal = audioCtx.createMediaElementSource(v);
        
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=1517199
        if (GM_info.platform.browserName === 'firefox') {
          GM_notification({
            title: name,
            text: "Changed playback rates will not work until this tab is reloaded."
          });
          v.addEventListener('ratechange', (event) => {
            // Technically, only non-1x rates don't work.
            if (event.target.playbackRate != 1.0) {
              GM_notification({
                title: name,
                text: `Channel balance incompatible with playback rate ${event.target.playbackRate}.`,
              })
            }
          })
        }
        
        log("Creating new AudioContext")
      } else { // Use the already-defined audioCtx.
        audioCtx = v._audioTerminalNode.context;
        terminal = v._audioTerminalNode;
        log(`Using existing AudioContext: ${audioCtx}`);
        
        if (terminal !== merger) {
          terminal.disconnect();
        }
      }
      
      if (splitter === undefined) {
        log("Setting up graph components");
        
        splitter = audioCtx.createChannelSplitter(2);
        merger = audioCtx.createChannelMerger(2);
        leftGain = audioCtx.createGain();
        rightGain = audioCtx.createGain();

        splitter.connect(leftGain, 0);
        splitter.connect(rightGain, 1);
        leftGain.connect(merger, 0, 0);
        rightGain.connect(merger, 0, 1);
      }
      
      if (terminal !== merger) {
        terminal.connect(splitter);
        merger.connect(audioCtx.destination);
        v._audioTerminalNode = merger;
      }
      
      log(`Setting gains to left=${left}, right=${right}`)
      leftGain.gain.value = left;
      rightGain.gain.value = right;

      // Do not let others handle this event.
      return false;
    })
  }

  function main(event) {
    // We explicitly call main() in addition to listening for yt-navigate-finish events,
    // because sometimes this code will run after that event is fired for the initial page
    // load.
    // Ignore the event if that is the case.
    if (event !== undefined && event.target.numNavigations_ == 0) {
      log('Ignoring navigation event when numNavigations is 0');
      return
    }
    
    if (!/\/(watch|embed.+)/.test(window.location.pathname)) {
      return;
    }
        
    waitForElement('.ytp-left-controls', (controls) => {
      log("Player controls appeared, installing");
      controls.appendChild(ui);
    });
  }
  
  ui.innerHTML = "(Balance: <a href id=audio_left>Left<a> / <a href id=audio_right>Right</a> / <a href id=audio_both>Both</a>)";

  ui.querySelector('#audio_left').onclick = makeCallback(1, 0);
  ui.querySelector('#audio_right').onclick = makeCallback(0, 1);
  ui.querySelector('#audio_both').onclick = makeCallback(1, 1);
  
  main();
  window.addEventListener('yt-navigate-finish', main);
})();
