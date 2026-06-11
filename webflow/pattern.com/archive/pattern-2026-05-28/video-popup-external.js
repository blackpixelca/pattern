/**
 * Video Popup JS - Externally loadable (runs after DOM, safe when elements missing)
 * Host this on your CDN and load with: <script src="..." defer></script>
 */
(function () {
  'use strict';

  var videoPopupOpenSteps = [
    { opacity: '0' },
    { opacity: '1' }
  ];

  var videoPopupCloseSteps = [
    { opacity: '1' },
    { opacity: '0' }
  ];

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

  /**
   * Normalize iframe src to an embeddable URL. Vimeo watch URLs (vimeo.com/ID) cannot be
   * framed; only player.vimeo.com/video/ID works. YouTube watch URLs need to be /embed/ID.
   */
  function normalizeEmbedUrl(iframe, src) {
    if (!iframe || !src) return src;
    var vimeoPage = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoPage) {
      var embedSrc = 'https://player.vimeo.com/video/' + vimeoPage[1];
      iframe.setAttribute('src', embedSrc);
      return embedSrc;
    }
    var ytWatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytWatch) {
      var ytEmbed = 'https://www.youtube.com/embed/' + ytWatch[1];
      iframe.setAttribute('src', ytEmbed);
      return ytEmbed;
    }
    return src;
  }

  /**
   * Get embed URL and provider from iframe (src/data-src) or from a link inside the component.
   * Webflow often leaves iframe src empty and puts the URL in a link or data attribute.
   */
  function getEmbedInfo(component) {
    var iframe = component.querySelector('iframe');
    var src = iframe && (iframe.getAttribute('src') || iframe.getAttribute('data-src') || '');
    src = normalizeEmbedUrl(iframe, src);
    if (src && src.indexOf('player.vimeo.com') !== -1) return { iframe: iframe, src: src, provider: 'vimeo' };
    if (src && src.indexOf('vimeo') !== -1) return { iframe: iframe, src: src, provider: 'vimeo' };
    if (src && (src.indexOf('youtube') !== -1 || src.indexOf('youtu.be') !== -1)) return { iframe: iframe, src: src, provider: 'youtube' };
    var link = component.querySelector('a[href*="vimeo.com"], a[href*="youtube.com"], a[href*="youtu.be"]');
    if (link) {
      var href = link.getAttribute('href') || '';
      var videoId = null;
      if (href.indexOf('vimeo') !== -1) {
        var vimeoMatch = href.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        videoId = vimeoMatch && vimeoMatch[1];
        if (videoId && iframe) {
          var vimeoSrc = 'https://player.vimeo.com/video/' + videoId;
          iframe.setAttribute('src', vimeoSrc);
          return { iframe: iframe, src: vimeoSrc, provider: 'vimeo' };
        }
      }
      if (href.indexOf('youtube') !== -1 || href.indexOf('youtu.be') !== -1) {
        var ytMatch = href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        videoId = ytMatch && ytMatch[1];
        if (videoId && iframe) {
          var ytSrc = 'https://www.youtube.com/embed/' + videoId;
          iframe.setAttribute('src', ytSrc);
          return { iframe: iframe, src: ytSrc, provider: 'youtube' };
        }
      }
    }
    return null;
  }

  function initVideoPopups() {
    var videoPopupComponents = document.querySelectorAll('[fc-video-popup^="component"]');
    if (!videoPopupComponents.length) return;

    var vimeoComponents = [];
    var youtubeComponents = [];
    for (var i = 0; i < videoPopupComponents.length; i++) {
      var info = getEmbedInfo(videoPopupComponents[i]);
      if (info && info.provider === 'vimeo') vimeoComponents.push(videoPopupComponents[i]);
      if (info && info.provider === 'youtube') youtubeComponents.push(videoPopupComponents[i]);
    }

    if (vimeoComponents.length > 0) {
      var vimeoScript = document.createElement('script');
      vimeoScript.src = 'https://player.vimeo.com/api/player.js';
      vimeoScript.onload = function () {
        vimeoComponents.forEach(function (component) {
          setupVimeoPopup(component, playButtonFadeIn, playButtonFadeOut, videoPopupOpenSteps, videoPopupCloseSteps);
        });
      };
      document.head.appendChild(vimeoScript);
    }

    if (youtubeComponents.length > 0) {
      var runYoutubeSetups = function () {
        youtubeComponents.forEach(function (component) {
          setupYoutubePopup(component, playButtonFadeIn, playButtonFadeOut, videoPopupOpenSteps, videoPopupCloseSteps);
        });
      };
      if (typeof YT !== 'undefined' && YT.Player) {
        runYoutubeSetups();
      } else {
        window.onYouTubeIframeAPIReady = function () {
          runYoutubeSetups();
        };
        var ytScript = document.createElement('script');
        ytScript.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(ytScript);
      }
    }
  }

  function findPlayButton(component) {
    return component.querySelector('[fc-video-popup="play"]') || component.querySelector('[fc-video-popup*="play"]');
  }
  function findOpenButtons(component, group) {
    var g = group || '';
    var sel = '[fc-video-popup="open' + g + '"]';
    var list = document.querySelectorAll(sel);
    if (list.length) return list;
    return document.querySelectorAll('[fc-video-popup^="open"]');
  }
  function findCloseButtons(component) {
    return component.querySelectorAll('[fc-video-popup="close"]') || component.querySelectorAll('[fc-video-popup*="close"]');
  }

  function setupVimeoPopup(component, playButtonFadeIn, playButtonFadeOut, openSteps, closeSteps) {
    var playButton = findPlayButton(component);
    if (!playButton) return;
    var group = (component.getAttribute('fc-video-popup') || '').split('component')[1];
    if (group === undefined) group = '';
    var openButtons = findOpenButtons(component, group);
    var closeButtons = findCloseButtons(component);
    var duration = parseFloat(component.getAttribute('duration'));
    var easing = component.getAttribute('easing');
    if (isNaN(duration)) duration = 300;
    if (!easing) easing = 'ease';
    var timing = { duration: duration, fill: 'forwards', easing: easing };
    var iframe = component.querySelector('iframe');
    if (!iframe || typeof Vimeo === 'undefined') return;
    var player = new Vimeo.Player(iframe);
    player.on('pause', function () { playButtonFadeIn(playButton); });
    player.on('play', function () { playButtonFadeOut(playButton); });
    playButton.addEventListener('click', function () { player.play(); });
    openButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        player.play();
        component.style.display = 'flex';
        component.animate(openSteps, timing);
        document.body.style.overflow = 'hidden';
      });
    });
    closeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        player.pause();
        player.setCurrentTime(0);
        component.animate(closeSteps, timing);
        setTimeout(function () {
          component.style.display = 'none';
          document.body.style.overflow = 'visible';
        }, duration);
      });
    });
  }

  function setupYoutubePopup(component, playButtonFadeIn, playButtonFadeOut, openSteps, closeSteps) {
    var playButton = findPlayButton(component);
    if (!playButton) return;
    var group = (component.getAttribute('fc-video-popup') || '').split('component')[1];
    if (group === undefined) group = '';
    var openButtons = findOpenButtons(component, group);
    var closeButtons = findCloseButtons(component);
    var duration = parseFloat(component.getAttribute('duration'));
    var easing = component.getAttribute('easing');
    if (isNaN(duration)) duration = 300;
    if (!easing) easing = 'ease';
    var timing = { duration: duration, fill: 'forwards', easing: easing };
    var iframe = component.querySelector('iframe');
    if (!iframe) return;
    var src = iframe.getAttribute('src') || '';
    var videoId = (src.split('/embed/')[1] || '').split('?')[0];
    if (!videoId || typeof YT === 'undefined') return;
    var container = document.createElement('div');
    iframe.parentNode.replaceChild(container, iframe);
    var player = new YT.Player(container, {
      videoId: videoId,
      events: { onReady: function (e) {
        var iframeEl = e.target.getIframe();
        if (iframeEl) iframeEl.classList.add('iframe');
      } }
    });
    player.addEventListener('onStateChange', function (e) {
      if (e.data === 1) playButtonFadeOut(playButton);
      if (e.data === 2) playButtonFadeIn(playButton);
    });
    playButton.addEventListener('click', function () { player.playVideo(); });
    openButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        player.playVideo();
        component.style.display = 'flex';
        component.animate(openSteps, timing);
        document.body.style.overflow = 'hidden';
      });
    });
    closeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        player.pauseVideo();
        player.seekTo(0);
        component.animate(closeSteps, timing);
        setTimeout(function () {
          component.style.display = 'none';
          document.body.style.overflow = 'visible';
        }, duration);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoPopups);
  } else {
    initVideoPopups();
  }
})();
