/**
 * Paste this in the browser console on the page with the video popup to see why it might not work.
 */
(function () {
  var comp = document.querySelector('[fc-video-popup^="component"]');
  if (!comp) {
    console.log('Video popup: No component found with [fc-video-popup^="component"]');
    return;
  }
  var iframe = comp.querySelector('iframe');
  var src = iframe ? (iframe.getAttribute('src') || iframe.getAttribute('data-src') || '') : '';
  var link = comp.querySelector('a[href*="vimeo"], a[href*="youtube"], a[href*="youtu.be"]');
  var playBtn = comp.querySelector('[fc-video-popup="play"]') || comp.querySelector('[fc-video-popup*="play"]');
  var group = (comp.getAttribute('fc-video-popup') || '').split('component')[1] || '';
  var openSel = '[fc-video-popup="open' + group + '"]';
  var openBtns = document.querySelectorAll(openSel);
  var closeBtns = comp.querySelectorAll('[fc-video-popup="close"]') || comp.querySelectorAll('[fc-video-popup*="close"]');

  console.log('--- Video popup diagnostic ---');
  console.log('Component:', comp);
  console.log('iframe:', iframe);
  console.log('iframe src:', src || '(empty)');
  console.log('iframe data-src:', iframe ? (iframe.getAttribute('data-src') || '(none)') : 'no iframe');
  console.log('Link with video URL:', link ? link.getAttribute('href') : '(none)');
  console.log('Provider detected:', src && src.indexOf('vimeo') !== -1 ? 'vimeo' : src && (src.indexOf('youtube') !== -1 || src.indexOf('youtu.be') !== -1) ? 'youtube' : link ? 'from link' : 'NONE (add src/data-src or a link with video URL)');
  console.log('Play button [fc-video-popup="play"]:', playBtn ? 'found' : 'MISSING');
  console.log('Open trigger selector:', openSel);
  console.log('Open buttons found:', openBtns.length, openBtns.length ? '(add fc-video-popup="open" to the thumbnail/trigger element)' : 'MISSING');
  console.log('Close buttons found:', closeBtns.length);
  console.log('---');
})();
