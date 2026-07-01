/**
 * Video Popup JS - Consent-safe external video popup
 *
 * Important:
 * - Never assigns Vimeo/YouTube iframe src during initialization.
 * - Reads video URLs from data-consent-src, data-src, src, or fallback links.
 * - Stores video URLs in data-consent-src.
 * - Loads Vimeo SDK only after personalization consent and first open click.
 * - Loads YouTube API only after marketing consent and first open click.
 */
(function () {
  'use strict';

  var videoPopupOpenSteps = [{ opacity: '0' }, { opacity: '1' }];
  var videoPopupCloseSteps = [{ opacity: '1' }, { opacity: '0' }];

  var consentCallbacks = {};
  var consentState = {};
  var consentBridgeStarted = false;

  function startConsentBridge() {
    if (consentBridgeStarted) return;
    consentBridgeStarted = true;

    window.FinsweetConsentPro = window.FinsweetConsentPro || [];
    window.FinsweetConsentPro.push(function (consent) {
      function refreshConsentState() {
        consentState = consent.consents.get() || {};

        Object.keys(consentCallbacks).forEach(function (category) {
          if (!consentState[category]) return;

          var callbacks = consentCallbacks[category].slice();
          consentCallbacks[category] = [];

          callbacks.forEach(function (callback) {
            callback();
          });
        });
      }

      refreshConsentState();
      consent.on('consent-updated', refreshConsentState);
    });
  }

  function whenConsented(category, callback) {
    startConsentBridge();

    if (consentState[category]) {
      callback();
      return;
    }

    consentCallbacks[category] = consentCallbacks[category] || [];
    consentCallbacks[category].push(callback);
  }

  var scrollLockState = { active: false, scrollY: 0 };

  function lockScroll() {
    if (scrollLockState.active) return;
    scrollLockState.active = true;
    scrollLockState.scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollLockState.scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.documentElement.style.overflow = 'hidden';
  }

  function unlockScroll() {
    if (!scrollLockState.active) return;
    scrollLockState.active = false;

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.documentElement.style.overflow = '';

    window.scrollTo(0, scrollLockState.scrollY);
  }

  function playButtonFadeOut(playButton) {
    if (!playButton || !playButton.parentNode) return;
    var fadeOutSteps = [{ opacity: '1' }, { opacity: '0' }];
    var timing = { duration: 300, fill: 'forwards' };
    playButton.parentNode.animate(fadeOutSteps, timing);
    setTimeout(function () {
      playButton.parentNode.style.display = 'none';
    }, 300);
  }

  function playButtonFadeIn(playButton) {
    if (!playButton || !playButton.parentNode) return;
    var fadeInSteps = [{ opacity: '0' }, { opacity: '1' }];
    var timing = { duration: 300, fill: 'forwards' };
    playButton.parentNode.style.display = 'flex';
    playButton.parentNode.animate(fadeInSteps, timing);
  }

  function getPopupGroup(component) {
    var attr = (component && component.getAttribute('fc-video-popup')) || '';
    var match = attr.match(/^component(.*)$/);
    return match ? match[1] : '';
  }

  function normalizeEmbedUrl(src) {
    if (!src) return src;

    var vimeoPage = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoPage) {
      return 'https://player.vimeo.com/video/' + vimeoPage[1] + '?dnt=1&preload=none';
    }

    var ytWatch = src.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (ytWatch) {
      return 'https://www.youtube.com/embed/' + ytWatch[1];
    }

    return src;
  }

  function getStoredVideoSrc(iframe) {
    if (!iframe) return '';

    return (
      iframe.getAttribute('data-consent-src') ||
      iframe.getAttribute('data-src') ||
      iframe.getAttribute('src') ||
      ''
    );
  }

  function storeConsentSrc(iframe, src) {
    if (!iframe || !src) return '';

    var normalizedSrc = normalizeEmbedUrl(src);
    iframe.setAttribute('data-consent-src', normalizedSrc);
    iframe.removeAttribute('data-src');
    iframe.removeAttribute('src');

    return normalizedSrc;
  }

  function getProviderFromSrc(src) {
    if (!src) return null;
    if (src.indexOf('player.vimeo.com') !== -1 || src.indexOf('vimeo.com') !== -1) {
      return 'vimeo';
    }
    if (src.indexOf('youtube.com') !== -1 || src.indexOf('youtu.be') !== -1) {
      return 'youtube';
    }
    return null;
  }

  function sizeEmbedToWrapper(element) {
    if (!element) return;

    element.setAttribute('width', '100%');
    element.setAttribute('height', '100%');
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.display = 'block';
  }

  function getEmbedInfo(component) {
    var iframe = component.querySelector('iframe');
    var src = getStoredVideoSrc(iframe);

    if (!src) {
      var link = component.querySelector(
        'a[href*="vimeo.com"], a[href*="youtube.com"], a[href*="youtu.be"]'
      );
      if (link) src = link.getAttribute('href') || '';
    }

    src = storeConsentSrc(iframe, src);

    var provider = getProviderFromSrc(src);
    if (!iframe || !src || !provider) return null;

    return {
      iframe: iframe,
      src: src,
      provider: provider
    };
  }

  function getConsentCategory(component, iframe, provider) {
    var explicitCategory =
      (iframe && iframe.getAttribute('fs-consent-categories')) ||
      (component && component.getAttribute('fs-consent-categories'));

    if (explicitCategory) return explicitCategory;

    if (provider === 'vimeo') return 'personalization';
    if (provider === 'youtube') return 'marketing';

    return 'personalization';
  }

  function findPlayButton(component) {
    return (
      component.querySelector('[fc-video-popup="play"]') ||
      component.querySelector('[fc-video-popup*="play"]')
    );
  }

  function findOpenButtons(component, group) {
    var g = group || '';
    return document.querySelectorAll('[fc-video-popup="open' + g + '"]');
  }

  function findCloseButtons(component) {
    return (
      component.querySelectorAll('[fc-video-popup="close"]') ||
      component.querySelectorAll('[fc-video-popup*="close"]')
    );
  }

  function getTiming(component) {
    var duration = parseFloat(component.getAttribute('duration'));
    var easing = component.getAttribute('easing');

    if (isNaN(duration)) duration = 300;
    if (!easing) easing = 'ease';

    return {
      duration: duration,
      timing: { duration: duration, fill: 'forwards', easing: easing }
    };
  }

  function pausePageVideos(component) {
    var pausedVideos = [];

    document.querySelectorAll('video').forEach(function (video) {
      if (video.paused) return;

      pausedVideos.push(video);
      video.pause();
    });

    component.__fcVideoPopupPausedVideos = pausedVideos;
  }

  function resumePageVideos(component) {
    var pausedVideos = component.__fcVideoPopupPausedVideos || [];
    component.__fcVideoPopupPausedVideos = [];

    pausedVideos.forEach(function (video) {
      if (!video.isConnected || !video.autoplay) return;

      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    });
  }

  function openPopup(component, timing) {
    pausePageVideos(component);
    component.style.display = 'flex';
    component.animate(videoPopupOpenSteps, timing);
    lockScroll();
  }

  function closePopup(component, closeSteps, timing, duration, callback) {
    component.animate(closeSteps, timing);
    setTimeout(function () {
      component.style.display = 'none';
      unlockScroll();
      resumePageVideos(component);
      if (typeof callback === 'function') callback();
    }, duration);
  }

  function loadScriptOnce(id, src, callback, errorCallback) {
    var existing = document.getElementById(id);

    if (existing && existing.getAttribute('data-loaded') === 'true') {
      callback();
      return;
    }

    if (existing) {
      existing.addEventListener('load', callback, { once: true });
      existing.addEventListener('error', errorCallback, { once: true });
      return;
    }

    var script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;

    script.onload = function () {
      script.setAttribute('data-loaded', 'true');
      callback();
    };

    script.onerror = errorCallback;

    document.head.appendChild(script);
  }

  var youtubeReadyCallbacks = [];

  function flushYoutubeReadyCallbacks() {
    var callbacks = youtubeReadyCallbacks.slice();
    youtubeReadyCallbacks = [];

    callbacks.forEach(function (callback) {
      callback();
    });
  }

  function ensureYoutubeApi(callback, errorCallback) {
    if (typeof YT !== 'undefined' && YT.Player) {
      callback();
      return;
    }

    youtubeReadyCallbacks.push(callback);

    window.onYouTubeIframeAPIReady = function () {
      flushYoutubeReadyCallbacks();
    };

    loadScriptOnce(
      'youtube-iframe-api',
      'https://www.youtube.com/iframe_api',
      function () {
        if (typeof YT !== 'undefined' && YT.Player) {
          flushYoutubeReadyCallbacks();
        }
      },
      errorCallback
    );
  }

  function setupVimeoPopupLazy(component, info) {
    var iframe = info.iframe;
    var storedSrc = info.src;
    var category = getConsentCategory(component, iframe, 'vimeo');

    var group = getPopupGroup(component);
    var openButtons = findOpenButtons(component, group);
    var closeButtons = findCloseButtons(component);
    var timingInfo = getTiming(component);

    var player = null;
    var wired = false;
    var opening = false;

    function wirePlayerAndOpen() {
      if (!iframe.getAttribute('src')) {
        iframe.setAttribute('src', storedSrc);
      }

      if (typeof Vimeo === 'undefined') {
        opening = false;
        return;
      }

      if (!wired) {
        wired = true;
        setupVimeoPopup(
          component,
          iframe,
          playButtonFadeIn,
          playButtonFadeOut,
          videoPopupOpenSteps,
          videoPopupCloseSteps,
          timingInfo
        );
      }

      player = player || new Vimeo.Player(iframe);

      openPopup(component, timingInfo.timing);

      requestAnimationFrame(function () {
        player.play().catch(function (err) {
          console.warn('[video-popup] Autoplay blocked by browser:', err);
        });
      });

      opening = false;
    }

    openButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (opening) return;
        opening = true;

        whenConsented(category, function () {
          loadScriptOnce(
            'vimeo-player-api',
            'https://player.vimeo.com/api/player.js',
            wirePlayerAndOpen,
            function () {
              opening = false;
              console.error('[video-popup] Failed to load Vimeo SDK.');
            }
          );
        });
      });
    });

    closeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (player) {
          player.pause();
          player.setCurrentTime(0);
        }

        closePopup(
          component,
          videoPopupCloseSteps,
          timingInfo.timing,
          timingInfo.duration
        );
      });
    });
  }

  function setupVimeoPopup(
    component,
    iframe,
    playButtonFadeInFn,
    playButtonFadeOutFn,
    openSteps,
    closeSteps,
    timingInfo
  ) {
    var playButton = findPlayButton(component);
    if (!playButton || !iframe || typeof Vimeo === 'undefined') return;

    var player = new Vimeo.Player(iframe);

    player.on('pause', function () {
      playButtonFadeInFn(playButton);
    });

    player.on('play', function () {
      playButtonFadeOutFn(playButton);
    });

    playButton.addEventListener('click', function () {
      player.play();
    });
  }

  function setupYoutubePopupLazy(component, info) {
    var iframe = info.iframe;
    var storedSrc = info.src;
    var category = getConsentCategory(component, iframe, 'youtube');

    var group = getPopupGroup(component);
    var openButtons = findOpenButtons(component, group);
    var closeButtons = findCloseButtons(component);
    var timingInfo = getTiming(component);

    var player = null;
    var wired = false;
    var opening = false;

    function getYoutubeId(src) {
      var match = src.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      return match && match[1];
    }

    function wirePlayerAndOpen() {
      if (typeof YT === 'undefined' || !YT.Player) {
        opening = false;
        return;
      }

      if (!wired) {
        wired = true;

        var videoId = getYoutubeId(storedSrc);
        if (!videoId) {
          opening = false;
          return;
        }

        var originalClassName = iframe.className || '';
        var originalAllow =
          iframe.getAttribute('allow') ||
          'autoplay; fullscreen; picture-in-picture';
        var originalTitle =
          iframe.getAttribute('title') ||
          'YouTube video player';
        var container = document.createElement('div');
        container.className = originalClassName;
        sizeEmbedToWrapper(container);
        iframe.parentNode.replaceChild(container, iframe);

        player = new YT.Player(container, {
          width: '100%',
          height: '100%',
          videoId: videoId,
          playerVars: {
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: function (e) {
              var iframeEl = e.target.getIframe();
              if (iframeEl) {
                if (originalClassName) {
                  iframeEl.className = originalClassName;
                } else {
                  iframeEl.classList.add('iframe');
                }

                iframeEl.setAttribute('allow', originalAllow);
                iframeEl.setAttribute('allowfullscreen', '');
                iframeEl.setAttribute('title', originalTitle);
                sizeEmbedToWrapper(iframeEl);
              }

              openPopup(component, timingInfo.timing);

              requestAnimationFrame(function () {
                player.playVideo();
              });

              opening = false;
            },
            onStateChange: function (e) {
              var playButton = findPlayButton(component);
              if (e.data === 1) playButtonFadeOut(playButton);
              if (e.data === 2) playButtonFadeIn(playButton);
            }
          }
        });

        var playButton = findPlayButton(component);
        if (playButton) {
          playButton.addEventListener('click', function () {
            if (player) player.playVideo();
          });
        }

        return;
      }

      openPopup(component, timingInfo.timing);

      requestAnimationFrame(function () {
        if (player) player.playVideo();
      });

      opening = false;
    }

    openButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (opening) return;
        opening = true;

        whenConsented(category, function () {
          ensureYoutubeApi(
            wirePlayerAndOpen,
            function () {
              opening = false;
              console.error('[video-popup] Failed to load YouTube API.');
            }
          );
        });
      });
    });

    closeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (player) {
          player.pauseVideo();
          player.seekTo(0);
        }

        closePopup(
          component,
          videoPopupCloseSteps,
          timingInfo.timing,
          timingInfo.duration
        );
      });
    });
  }

  function initVideoPopups() {
    startConsentBridge();

    var videoPopupComponents = document.querySelectorAll(
      '[fc-video-popup^="component"]'
    );

    if (!videoPopupComponents.length) return;

    for (var i = 0; i < videoPopupComponents.length; i++) {
      var component = videoPopupComponents[i];

      document.body.appendChild(component);

      var info = getEmbedInfo(component);
      if (!info) continue;

      if (info.provider === 'vimeo') {
        setupVimeoPopupLazy(component, info);
      }

      if (info.provider === 'youtube') {
        setupYoutubePopupLazy(component, info);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoPopups);
  } else {
    initVideoPopups();
  }
})();
