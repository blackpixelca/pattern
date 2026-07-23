/**
 * Pattern partner counter animation.
 * Requires jQuery, CountUp 1.8.2, GSAP, and ScrollTrigger.
 */
(function ($) {
  'use strict';

  $('.counterup').each(function (index) {
    var element = $(this);
    var id = 'countup' + index;
    var startNumber = Number(element.text());
    var endNumber = Number(element.attr('final-number'));
    var duration = element.attr('count-duration');
    var staggerDelay = index * 200;
    var counter;

    element.attr('id', id);
    counter = new CountUp(id, startNumber, endNumber, 0, duration);

    ScrollTrigger.create({
      trigger: '.section_partner_wrap',
      start: 'top bottom',
      end: 'bottom bottom',
      onEnter: function () {
        window.setTimeout(function () {
          counter.start();
        }, staggerDelay);
      }
    });
  });
})(jQuery);
