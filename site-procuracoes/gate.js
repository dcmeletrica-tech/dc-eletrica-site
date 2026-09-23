(function () {
  "use strict";

  var SESSION_KEY = "dc-procuracoes-acesso";

  function hash(texto) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  var SENHA_ESPERADA_HASH = hash("Dm1993*");

  var body = document.body;
  var overlay = document.getElementById("gate-overlay");
  var form = document.getElementById("gate-form");
  var input = document.getElementById("gate-senha");
  var erro = document.getElementById("gate-erro");

  function desbloquear() {
    body.classList.remove("locked");
    overlay.hidden = true;
  }

  try {
    if (sessionStorage.getItem(SESSION_KEY) === "ok") {
      desbloquear();
    }
  } catch (e) {
    // sessionStorage indisponível: mantém a tela de senha visível.
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var valor = input.value || "";
    if (hash(valor) === SENHA_ESPERADA_HASH) {
      try {
        sessionStorage.setItem(SESSION_KEY, "ok");
      } catch (err) {
        // segue sem persistir a sessão.
      }
      erro.hidden = true;
      desbloquear();
    } else {
      erro.hidden = false;
      input.value = "";
      input.focus();
    }
  });
})();
