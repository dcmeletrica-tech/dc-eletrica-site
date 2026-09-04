(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5519998093790";
  var leadGroup = document.getElementById("lead-form");
  var nameInput = document.getElementById("lead-name");
  var phoneInput = document.getElementById("lead-phone");
  var messageInput = document.getElementById("lead-message");
  var submitButton = document.getElementById("lead-submit");
  var clearButton = document.getElementById("lead-clear");
  var errorEl = document.getElementById("lead-error");
  var successEl = document.getElementById("lead-success");
  var retryLink = document.getElementById("lead-retry");

  if (!leadGroup || !nameInput || !phoneInput || !messageInput || !submitButton || !clearButton || !errorEl || !successEl || !retryLink) {
    return;
  }

  var fields = [nameInput, phoneInput, messageInput];

  function setInvalid(input, invalid) {
    input.classList.toggle("invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
  }

  function formatPhone(value) {
    var digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) {
      return "";
    }
    if (digits.length <= 2) {
      return "(" + digits;
    }

    var ddd = digits.slice(0, 2);
    var localNumber = digits.slice(2);
    if (digits.length === 11) {
      return "(" + ddd + ") " + localNumber.slice(0, 5) + "-" + localNumber.slice(5);
    }
    if (localNumber.length > 4) {
      return "(" + ddd + ") " + localNumber.slice(0, 4) + "-" + localNumber.slice(4);
    }
    return "(" + ddd + ") " + localNumber;
  }

  function getFieldError(input) {
    var value = input.value.trim();
    if (input.required && value === "") {
      return input === nameInput ? "Informe seu nome." : "Informe seu WhatsApp com DDD.";
    }

    if (input === phoneInput && value !== "") {
      var digits = value.replace(/\D/g, "");
      if (digits.length !== 10 && digits.length !== 11) {
        return "Informe um WhatsApp válido, com DDD.";
      }
    }

    return "";
  }

  function validateField(input) {
    var message = getFieldError(input);
    setInvalid(input, message !== "");
    return message;
  }

  function validateLead() {
    var firstInvalid = null;
    var firstError = "";

    fields.forEach(function (input) {
      var message = validateField(input);
      if (message && !firstInvalid) {
        firstInvalid = input;
        firstError = message;
      }
    });

    return { firstInvalid: firstInvalid, firstError: firstError };
  }

  function hideFeedback() {
    errorEl.hidden = true;
    successEl.hidden = true;
  }

  function sendLead() {
    hideFeedback();
    var validation = validateLead();
    if (validation.firstInvalid) {
      errorEl.textContent = validation.firstError;
      errorEl.hidden = false;
      validation.firstInvalid.focus();
      return;
    }

    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();
    var message = messageInput.value.trim();
    var text =
      "Olá, DC Elétrica! Quero uma proposta de energia solar.\n\n" +
      "Nome: " + name + "\n" +
      "WhatsApp: " + phone +
      (message ? "\nMensagem: " + message : "");
    var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);

    retryLink.href = url;
    retryLink.hidden = false;
    window.open(url, "_blank", "noopener,noreferrer");
    successEl.hidden = false;
    clearButton.hidden = false;
  }

  function clearFields() {
    fields.forEach(function (input) {
      input.value = "";
      setInvalid(input, false);
    });
    errorEl.hidden = true;
    successEl.hidden = true;
    retryLink.hidden = true;
    clearButton.hidden = true;
    nameInput.focus();
  }

  phoneInput.addEventListener("input", function () {
    phoneInput.value = formatPhone(phoneInput.value);
    validateField(phoneInput);
    errorEl.hidden = true;
  });

  [nameInput, messageInput].forEach(function (input) {
    input.addEventListener("input", function () {
      validateField(input);
      errorEl.hidden = true;
    });
  });

  fields.forEach(function (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && input !== messageInput) {
        event.preventDefault();
        sendLead();
      }
    });
  });

  submitButton.addEventListener("click", sendLead);
  clearButton.addEventListener("click", clearFields);
})();
