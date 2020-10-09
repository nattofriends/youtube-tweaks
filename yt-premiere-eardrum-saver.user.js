// ==UserScript==
// @name        YouTube: Premiere Eardrum Saver
// @namespace   nattofriends/youtube-tweaks
// @match       *://youtube.com/*
// @match       *://*.youtube.com/*
// @match       *://*.youtube-nocookie.com/*
// @author      nattofriends
// @description Lower the volume of premiering videos, and restore the volume when the countdown finishes. Does not account for playback rate changes.
// @homepageURL https://github.com/nattofriends/youtube-tweaks
// @icon        https://www.youtube.com/favicon.ico
// @grant       GM_notification
// @require     https://raw.githubusercontent.com/nattofriends/youtube-tweaks/common-5/common.js
// @run-at      document-idle
// @version     1.
// ==/UserScript==

(() => {
  "use strict";
  
  const name = GM_info.script.name;
  
  const premiereIntroVolume = 10;
  const twoMinutesMillis = 2 * 60 * 1000;
  const playerStateUnstarted = -1;
  const playerStatePlaying = 1;
  const playerStateCued = 5;
  
  var lastTimeoutCallback;
  
  const log = logger(name);
  const wrap = errorWrapper(name);

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
    
    waitForElement('.html5-video-player', (player) => {
      log(`Loaded player on ${window.location.pathname}`);
      
      var playerResponse = player.getPlayerResponse();
      // Note: Seems like playerResponse can be null on Google Meet Live Streams even after metadata is loaded
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

      // videoDetails can be undefined if the video is deleted, i.e. playabilityStatus.status == ERROR.
      if (playerResponse.videoDetails === undefined) {
        log(`Video has no details (playability: ${playerResponse.playabilityStatus.status}), exiting`);
        return;
      } else if (playerResponse.videoDetails.isUpcoming === true && playerResponse.videoDetails.isLiveContent === false) {
        // There's some lag between the scheduled start time and things kicking off which we don't want to guess,
        // so ignore the scheduled start time data in playerResponse and wait for player state changes.
        log('Found upcoming premiere');

        // Might as well preemptively lower the volume while we wait.
        var originalVolume = player.getVolume();
        log(`Setting volume to ${premiereIntroVolume}`);
        player.setVolume(premiereIntroVolume);

        let onStateChange = (event) => {
          // We'll get 3 (buffering) and -1 (unstarted) events before playing. Pay them no heed.
          if (event != playerStatePlaying) {
            log(`Got unknown event state ${event} while waiting for player to start`);
            return
          }

          restoreVolume(player, originalVolume, twoMinutesMillis);
          installPlaybackQualityChangeListener(player, originalVolume);
          player.removeEventListener('onStateChange', onStateChange);
        };
        player.addEventListener('onStateChange', onStateChange);

      } else if (playerResponse.videoDetails.isLive === true && playerResponse.videoDetails.isLiveContent === false) {
        log('Found currently premiering video');

        // Wait for video to actually begin playing before getting playback time
        if (player.getPlayerState() !== playerStatePlaying) {
          log('Waiting for player to start');
          let onStateChange = (event) => {
            if (event === playerStatePlaying) {
              log('Player now playing, continuing in-progress configuration');
              player.removeEventListener('onStateChange', onStateChange);
              main();
            }
          };
          player.addEventListener('onStateChange', onStateChange);
          return;
        }

        let currentTime = player.getCurrentTime() * 1000;
        log(`Current time is ${currentTime}`);
        if (currentTime > twoMinutesMillis) {
          log('Past premiere countdown, doing nothing');
          return;
        } else {
          let sleepInterval = twoMinutesMillis - currentTime;

          var originalVolume = player.getVolume();
          log(`Setting volume to ${premiereIntroVolume}`);
          player.setVolume(premiereIntroVolume);

          restoreVolume(player, originalVolume, sleepInterval);
          installPlaybackQualityChangeListener(player);
        }
      } else {
        log('Not an upcoming or current premiere, doing nothing');
      }
    });
  });
     
  function installPlaybackQualityChangeListener(player, originalVolume) {
    player.addEventListener('onPlaybackQualityChange', () => {
      var currentTime = player.getCurrentTime() * 1000;
      if (currentTime > twoMinutesMillis) {
        log('Past premiere countdown, doing nothing');
      } else {
        // Recalculate interval, buffer size will change when switching quality
        clearTimeout(lastTimeoutCallback);
        let sleepInterval = twoMinutesMillis - currentTime;
        restoreVolume(player, originalVolume, sleepInterval);
      }
    })
  }                         
  
  function restoreVolume(player, originalVolume, timeout) {
    log(`Scheduling volume restoration in ${timeout}ms`)
    // Sleep
    
    lastTimeoutCallback = setTimeout(
      () => {
        log(`Setting volume to ${originalVolume} (current player time: ${player.getCurrentTime()})`);
        player.setVolume(originalVolume);
      },
      timeout,
    );
  }

  main();
  window.addEventListener('yt-navigate-finish', main);
})();
