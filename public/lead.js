(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5519998093790";

  var form = document.getElementById("lead-form");
  if (!form) {
    return;
  }

  var errorEl = document.getElementById("lead-error");
  var successEl = document.getElementById("lead-success");

  function setInvalid(input, invalid) {
    input.classList.toggle("invalid", invalid);
  }

  function validateField(input) {
    var value = input.value.trim();
    var valid = true;

    if (input.required && value === "") {
      valid = false;
    }

    if (input.id === "lead-phone" && value !== "") {
      var digits = value.replace(/\D/g, "");
      if (digits.length < 10) {
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
      errorEl.textContent = "Preencha seu nome e um WhatsApp válido.";
      errorEl.hidden = false;
      return;
    }

    var name = document.getElementById("lead-name").value.trim();
    var phone = document.getElementById("lead-phone").value.trim();
    var message = document.getElementById("lead-message").value.trim();

    var text =
      "Olá, DC Elétrica! Quero uma proposta de energia solar.\n\n" +
      "Nome: " + name + "\n" +
      "WhatsApp: " + phone +
      (message ? "\nMensagem: " + message : "");

    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");

    successEl.hidden = false;
    form.reset();
  });

  form.querySelectorAll("input, textarea").forEach(function (input) {
    input.addEventListener("input", function () {
      validateField(input);
    });
  });
})();
