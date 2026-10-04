// Midtown Wash — shared site behavior
document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // Contact form — no backend yet, so give clear feedback instead of
  // pretending a submission succeeded silently.
  var form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var original = btn.textContent;
      btn.textContent = 'Call us instead — form not yet wired up';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = original;
        btn.disabled = false;
      }, 3500);
    });
  }

  // Reveal-on-scroll: elements rise up through a mask line rather than
  // just fading — a deliberate single motion treatment reused everywhere,
  // not scattered one-off effects. Respects reduced-motion.
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealTargets = document.querySelectorAll(
    '.service-card, .bento-cell, .quote-card, .g-item, .fact-list dt, .split img, .card-stage, .carwash-stage'
  );

  if (prefersReduced) {
    revealTargets.forEach(function (el) { el.style.opacity = 1; });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function (el, i) {
      el.classList.add('reveal-pre');
      el.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      observer.observe(el);
    });
  }

  // Flex-number counter: the stat band near the membership section counts
  // up once, when it first scrolls into view — a single oversized
  // typographic "beat" rather than decoration repeated everywhere.
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    var counted = new WeakSet();
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || counted.has(entry.target)) return;
        counted.add(entry.target);
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count-to'), 10);
        var suffix = el.getAttribute('data-count-suffix') || '';
        var duration = 1400;
        var start = performance.now();
        function tick(now) {
          var p = Math.min(1, (now - start) / duration);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }
});
