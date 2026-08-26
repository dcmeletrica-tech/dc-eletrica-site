(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  var navToggle = document.getElementById("nav-toggle");
  var siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Abrir menu");
      });
    });
  }

  var form = document.getElementById("contact-form");
  if (!form) {
    return;
  }

  var errorEl = document.getElementById("form-error");
  var successEl = document.getElementById("form-success");

  function setInvalid(input, invalid) {
    input.classList.toggle("invalid", invalid);
  }

  function validateField(input) {
    var value = input.value.trim();
    var valid = true;

    if (input.required && value === "") {
      valid = false;
    }

    if (input.type === "email" && value !== "") {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) {
        valid = false;
      }
    }

    setInvalid(input, !valid);
    return valid;
  }

  function validateForm() {
    var fields = form.querySelectorAll("input, textarea");
    var allValid = true;
    fields.forEach(function (input) {
      if (!validateField(input)) {
        allValid = false;
      }
    });
    return allValid;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    successEl.hidden = true;
    errorEl.hidden = true;

    if (!validateForm()) {
      errorEl.textContent = "Preencha os campos obrigatórios corretamente.";
      errorEl.hidden = false;
      return;
    }

    successEl.hidden = false;
    form.reset();
  });

  form.querySelectorAll("input, textarea").forEach(function (input) {
    input.addEventListener("input", function () {
      validateField(input);
    });
  });
})();
