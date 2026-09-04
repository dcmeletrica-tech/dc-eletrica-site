(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var supportsIntersectionObserver = "IntersectionObserver" in window;

  function revealOnScroll() {
    var items = document.querySelectorAll(".reveal");
    if (items.length === 0 || prefersReducedMotion || !supportsIntersectionObserver) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var siblings = el.parentElement.querySelectorAll(".reveal");
            var index = Array.prototype.indexOf.call(siblings, el);
            el.style.transitionDelay = Math.min(index * 60, 300) + "ms";
            el.classList.add("visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    document.documentElement.classList.add("reveal-ready");
    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function animateStats() {
    var stats = document.querySelectorAll(".stat-value[data-count]");
    if (stats.length === 0 || prefersReducedMotion || !supportsIntersectionObserver) {
      return;
    }

    function animate(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      var duration = 1200;
      var start = null;

      function step(timestamp) {
        if (!start) {
          start = timestamp;
        }
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(target * eased);
        el.textContent = prefix + value + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    stats.forEach(function (el) {
      observer.observe(el);
    });
  }

  revealOnScroll();
  animateStats();
})();
