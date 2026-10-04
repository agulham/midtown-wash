/* Midtown Wash — motion primitives, ported from real production patterns
   (AnimatedLines mask-reveal, pop-in spring, scramble-text, drum-text hover)
   Vanilla JS, no framework. IntersectionObserver fires once per element. */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- AnimatedLines ----------
     Wrap each line of text in a masked span so it slides up from
     underneath on scroll-into-view, staggered line by line. */
  function initAnimatedLines() {
    var targets = document.querySelectorAll('[data-lines]');
    if (!targets.length) return;

    targets.forEach(function (el) {
      if (el.dataset.linesInit) return;
      el.dataset.linesInit = '1';

      // Split on explicit <br> or manual line markers; each direct child
      // text node/line becomes its own masked row.
      var rawLines = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = '';
      rawLines.forEach(function (line, i) {
        var mask = document.createElement('span');
        mask.className = 'al-mask';
        var inner = document.createElement('span');
        inner.className = 'al-inner';
        inner.innerHTML = line;
        inner.style.transitionDelay = (i * 0.08) + 's';
        mask.appendChild(inner);
        el.appendChild(mask);
      });
    });

    if (prefersReduced) {
      document.querySelectorAll('.al-inner').forEach(function (s) { s.classList.add('al-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.al-inner').forEach(function (s) {
            s.classList.add('al-in');
          });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Pop-in (spring-like) ----------
     Small elements (badges, buttons, icons) pop in with an overshoot
     easing curve approximating a critically-damped spring. */
  function initPopIn() {
    var targets = document.querySelectorAll('[data-pop]');
    if (!targets.length || prefersReduced) {
      targets.forEach(function (el) { el.classList.add('pop-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = parseFloat(entry.target.dataset.popDelay || '0');
          setTimeout(function () { entry.target.classList.add('pop-in'); }, delay * 1000);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- ScrambleText ----------
     On hover, text re-rolls through random characters before settling
     back on the real word. Used for footer/nav links. */
  var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el) {
    if (el._scrambling || prefersReduced) return;
    var target = el.dataset.text || el.textContent;
    el.dataset.text = target;
    el._scrambling = true;
    var frame = 0;
    var totalFrames = 14;
    var revealAt = 6; // start locking characters in after this frame
    var interval = setInterval(function () {
      var out = '';
      for (var i = 0; i < target.length; i++) {
        if (target[i] === ' ') { out += ' '; continue; }
        var lockPoint = (i / target.length) * (totalFrames - revealAt) + revealAt;
        if (frame >= lockPoint) {
          out += target[i];
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = out;
      frame++;
      if (frame > totalFrames) {
        clearInterval(interval);
        el.textContent = target;
        el._scrambling = false;
      }
    }, 28);
  }
  function initScrambleText() {
    document.querySelectorAll('[data-scramble]').forEach(function (el) {
      el.dataset.text = el.textContent;
      el.addEventListener('mouseenter', function () { scramble(el); });
    });
  }

  /* ---------- DrumText (rolodex hover) ----------
     Two stacked copies of the label; on hover the top rotates away
     and the bottom rotates in, like a flip clock / rolodex. */
  function initDrumText() {
    document.querySelectorAll('[data-drum]').forEach(function (el) {
      if (el.dataset.drumInit) return;
      el.dataset.drumInit = '1';
      var label = el.textContent.trim();
      el.innerHTML =
        '<span class="drum-wrap">' +
          '<span class="drum-face drum-top">' + label + '</span>' +
          '<span class="drum-face drum-bottom">' + label + '</span>' +
        '</span>';
    });
  }

  /* ---------- Guide lines ----------
     Thin rules that draw themselves (scaleX 0->1) just before the
     text content they introduce animates in. */
  function initGuideLines() {
    var targets = document.querySelectorAll('[data-guide]');
    if (!targets.length) return;
    if (prefersReduced) {
      targets.forEach(function (el) { el.classList.add('guide-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('guide-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Count-up ----------
     Numeric values count up from 0 once scrolled into view; any
     non-digit characters (+, %, $, etc.) stay static. */
  function initCountUp() {
    var targets = document.querySelectorAll('[data-count-to]');
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var end = parseInt(el.dataset.countTo, 10);
        var suffix = el.dataset.countSuffix || '';
        if (prefersReduced) { el.textContent = end + suffix; io.unobserve(el); return; }
        var start = performance.now();
        var dur = 1400;
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          el.textContent = Math.round(eased * end) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    targets.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAnimatedLines();
    initPopIn();
    initScrambleText();
    initDrumText();
    initGuideLines();
    initCountUp();
  });
})();
