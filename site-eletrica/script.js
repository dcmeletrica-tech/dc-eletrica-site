(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var captureSection = document.getElementById("captura");
  var whatsappFloat = document.querySelector(".whatsapp-float");
  if (captureSection && whatsappFloat && "IntersectionObserver" in window) {
    var captureObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          document.body.classList.toggle("has-capture-in-view", entry.isIntersecting);
        });
      },
      { threshold: 0.12 }
    );
    captureObserver.observe(captureSection);
  }

  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");
  if (!navToggle || !siteNav) {
    return;
  }

  var mobileMenu = window.matchMedia("(max-width: 800px)");

  function setNavState(open) {
    if (!mobileMenu.matches) {
      siteNav.hidden = false;
      siteNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Abrir menu");
      return;
    }

    siteNav.hidden = !open;
    siteNav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  navToggle.addEventListener("click", function () {
    setNavState(navToggle.getAttribute("aria-expanded") !== "true");
  });

  siteNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setNavState(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && mobileMenu.matches && !siteNav.hidden) {
      setNavState(false);
      navToggle.focus();
    }
  });

  function syncNavForViewport() {
    setNavState(false);
  }

  if (mobileMenu.addEventListener) {
    mobileMenu.addEventListener("change", syncNavForViewport);
  } else {
    mobileMenu.addListener(syncNavForViewport);
  }

  setNavState(false);
})();
