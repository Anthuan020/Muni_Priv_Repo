/* ============================================================
   Municipalidad del Cantón Central de Limón
   Comportamiento compartido de todas las páginas.

   Sin dependencias: el sitio abre con doble clic sobre
   index.html y funciona igual. Todo va dentro de guardas, de
   modo que una página que no tenga cierto componente no
   produce error en consola.
   ============================================================ */
(function () {
  'use strict';

  var raiz = document.documentElement;

  /* ---------- almacenamiento tolerante ----------
     Abierto como archivo local (file://) el navegador puede
     negar localStorage. En ese caso las preferencias valen
     para la página abierta y el panel lo advierte. */
  var almacen = (function () {
    try {
      var k = '__prueba__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) { return null; }
  })();

  function leer(clave, porDefecto) {
    if (!almacen) return porDefecto;
    try { var v = almacen.getItem(clave); return v === null ? porDefecto : v; }
    catch (e) { return porDefecto; }
  }
  function guardar(clave, valor) {
    if (!almacen) return;
    try { almacen.setItem(clave, valor); } catch (e) {}
  }

  /* ============================================================
     1. PREFERENCIAS DE ACCESIBILIDAD
     ============================================================ */

  var ESCALAS = [1, 1.125, 1.25, 1.4];
  var ESPACIOS = [
    { letra: '0em',    linea: '1.7'  },
    { letra: '.035em', linea: '1.85' },
    { letra: '.075em', linea: '2.05' }
  ];

  var pref = {
    tema:      leer('muni-tema', ''),   // '' sigue al sistema; 'claro', 'oscuro', 'contraste'
    escala:    parseInt(leer('muni-escala', '0'), 10) || 0,
    espacio:   parseInt(leer('muni-espacio', '0'), 10) || 0,
    enlaces:   leer('muni-enlaces', '') === 'si',
    guia:      leer('muni-guia', '') === 'si',
    foco:      leer('muni-foco', '') === 'si',
    cursor:    leer('muni-cursor', '') === 'si',
    animacion: leer('muni-animacion', '') === 'si'
  };

  function aplicar() {
    if (pref.tema) raiz.setAttribute('data-tema', pref.tema);
    else raiz.removeAttribute('data-tema');

    raiz.style.setProperty('--escala', ESCALAS[pref.escala] || 1);
    var e = ESPACIOS[pref.espacio] || ESPACIOS[0];
    raiz.style.setProperty('--espacio-letra', e.letra);
    raiz.style.setProperty('--espacio-linea', e.linea);

    alterna('data-enlaces', pref.enlaces, 'subrayados');
    alterna('data-guia', pref.guia, 'si');
    alterna('data-foco', pref.foco, 'reforzado');
    alterna('data-cursor', pref.cursor, 'grande');
    alterna('data-animacion', pref.animacion, 'detenida');

    sincronizarPanel();
  }
  function alterna(attr, activo, valor) {
    if (activo) raiz.setAttribute(attr, valor);
    else raiz.removeAttribute(attr);
  }

  function persistir() {
    guardar('muni-tema', pref.tema);
    guardar('muni-escala', String(pref.escala));
    guardar('muni-espacio', String(pref.espacio));
    guardar('muni-enlaces', pref.enlaces ? 'si' : '');
    guardar('muni-guia', pref.guia ? 'si' : '');
    guardar('muni-foco', pref.foco ? 'si' : '');
    guardar('muni-cursor', pref.cursor ? 'si' : '');
    guardar('muni-animacion', pref.animacion ? 'si' : '');
  }

  aplicar();   // antes de pintar, para que no haya salto de tema

  /* ---------- panel ---------- */
  var panel, fondo, abridor, avisador, ultimoFoco;

  function anunciar(texto) {
    if (!avisador) return;
    avisador.textContent = texto;
    avisador.setAttribute('data-visible', '');
    clearTimeout(avisador._t);
    avisador._t = setTimeout(function () {
      avisador.removeAttribute('data-visible');
    }, 2200);
  }

  function sincronizarPanel() {
    if (!panel) return;
    panel.querySelectorAll('[data-escala]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.getAttribute('data-escala') === pref.escala));
    });
    panel.querySelectorAll('[data-espacio]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.getAttribute('data-espacio') === pref.espacio));
    });
    panel.querySelectorAll('[data-tema-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-tema-btn') === pref.tema));
    });
    ['enlaces', 'guia', 'foco', 'cursor', 'animacion'].forEach(function (k) {
      var b = panel.querySelector('[data-sw="' + k + '"]');
      if (b) b.setAttribute('aria-pressed', String(!!pref[k]));
    });
    var v = panel.querySelector('[data-sw="voz"]');
    if (v) v.setAttribute('aria-pressed', String(hablando));
  }

  function abrirPanel() {
    if (!panel) return;
    ultimoFoco = document.activeElement;
    panel.setAttribute('data-abierto', '');
    fondo.setAttribute('data-abierto', '');
    abridor.setAttribute('aria-expanded', 'true');
    var p = panel.querySelector('.a11y-cerrar');
    if (p) p.focus();
    document.addEventListener('keydown', teclasPanel, true);
  }
  function cerrarPanel() {
    if (!panel) return;
    panel.removeAttribute('data-abierto');
    fondo.removeAttribute('data-abierto');
    abridor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', teclasPanel, true);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  function teclasPanel(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); cerrarPanel(); return; }
    if (ev.key !== 'Tab') return;
    var f = panel.querySelectorAll('button, [href], input, select, textarea');
    if (!f.length) return;
    var pri = f[0], ult = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === pri) { ev.preventDefault(); ult.focus(); }
    else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
  }

  /* ---------- lectura en voz alta ---------- */
  var hablando = false;
  function pararVoz() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    hablando = false;
    sincronizarPanel();
  }
  function leerPagina() {
    if (!window.speechSynthesis) { anunciar('Este navegador no puede leer en voz alta.'); return; }
    if (hablando) { pararVoz(); anunciar('Lectura detenida'); return; }
    var sel = String(window.getSelection());
    var zona = document.getElementById('contenido');
    var texto = sel.trim() ? sel : (zona ? zona.innerText : document.body.innerText);
    texto = texto.replace(/\s+/g, ' ').trim();
    if (!texto) return;
    var trozos = texto.match(/[^.!?]+[.!?]*\s*/g) || [texto];
    var buf = '', cola = [];
    trozos.forEach(function (t) {
      if ((buf + t).length > 220) { cola.push(buf); buf = t; } else { buf += t; }
    });
    if (buf) cola.push(buf);
    window.speechSynthesis.cancel();
    cola.forEach(function (t, i) {
      var u = new SpeechSynthesisUtterance(t);
      u.lang = 'es-CR'; u.rate = 1;
      if (i === cola.length - 1) u.onend = function () { hablando = false; sincronizarPanel(); };
      window.speechSynthesis.speak(u);
    });
    hablando = true;
    sincronizarPanel();
    anunciar(sel.trim() ? 'Leyendo la selección' : 'Leyendo la página');
  }

  /* ---------- guía de lectura ---------- */
  var guia;
  function moverGuia(ev) {
    if (!guia) return;
    guia.style.top = Math.max(0, ev.clientY - 22) + 'px';
  }

  /* ============================================================
     2. ARRANQUE
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {

    panel    = document.getElementById('a11y');
    fondo    = document.getElementById('a11y-fondo');
    abridor  = document.getElementById('a11y-abrir');
    avisador = document.getElementById('a11y-aviso');
    guia     = document.getElementById('guia-lectura');

    if (panel && abridor && fondo) {
      abridor.addEventListener('click', function () {
        if (panel.hasAttribute('data-abierto')) cerrarPanel(); else abrirPanel();
      });
      fondo.addEventListener('click', cerrarPanel);
      var cerrar = panel.querySelector('.a11y-cerrar');
      if (cerrar) cerrar.addEventListener('click', cerrarPanel);

      panel.addEventListener('click', function (ev) {
        var b = ev.target.closest('button');
        if (!b) return;

        if (b.hasAttribute('data-escala')) {
          pref.escala = +b.getAttribute('data-escala');
          anunciar('Texto al ' + Math.round(ESCALAS[pref.escala] * 100) + ' por ciento');
        } else if (b.hasAttribute('data-espacio')) {
          pref.espacio = +b.getAttribute('data-espacio');
          anunciar(['Espaciado normal', 'Espaciado amplio', 'Espaciado máximo'][pref.espacio]);
        } else if (b.hasAttribute('data-tema-btn')) {
          pref.tema = b.getAttribute('data-tema-btn');
          anunciar('Tema ' + (pref.tema === 'claro' ? 'claro' : pref.tema === 'oscuro' ? 'oscuro' : 'de alto contraste'));
        } else if (b.hasAttribute('data-sw')) {
          var k = b.getAttribute('data-sw');
          if (k === 'voz') { leerPagina(); return; }
          pref[k] = !pref[k];
          anunciar(b.querySelector('.rot').textContent + (pref[k] ? ': activado' : ': desactivado'));
          if (k === 'guia') {
            if (pref.guia) document.addEventListener('mousemove', moverGuia);
            else document.removeEventListener('mousemove', moverGuia);
          }
        } else if (b.classList.contains('a11y-reset')) {
          pararVoz();
          pref = { tema: '', escala: 0, espacio: 0, enlaces: false,
                   guia: false, foco: false, cursor: false, animacion: false };
          document.removeEventListener('mousemove', moverGuia);
          anunciar('Preferencias restablecidas');
        } else { return; }

        aplicar();
        persistir();
      });

      if (pref.guia) document.addEventListener('mousemove', moverGuia);

      if (!almacen) {
        var n = panel.querySelector('.a11y-pie .nota');
        if (n) n.textContent = 'Al abrir el sitio como archivo local, el navegador no guarda las preferencias entre páginas.';
      }
      sincronizarPanel();
    }

    /* ---- atajo de tema en la barra ---- */
    var btnTema = document.getElementById('theme');
    if (btnTema) {
      var sistemaOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var pinta = function () {
        var oscuro = pref.tema === 'oscuro' || (pref.tema === '' && sistemaOscuro);
        btnTema.setAttribute('aria-pressed', String(oscuro));
        var r = document.getElementById('themelabel');
        if (r) r.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
      };
      pinta();
      btnTema.addEventListener('click', function () {
        var oscuroAhora = pref.tema === 'oscuro' || (pref.tema === '' && sistemaOscuro);
        pref.tema = oscuroAhora ? 'claro' : 'oscuro';
        aplicar(); persistir(); pinta();
      });
    }

    /* ---- menú en pantallas pequeñas ---- */
    var burger = document.getElementById('burger'),
        nav = document.getElementById('nav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        var ab = nav.hasAttribute('data-abierto');
        if (ab) nav.removeAttribute('data-abierto'); else nav.setAttribute('data-abierto', '');
        burger.setAttribute('aria-expanded', String(!ab));
      });
    }

    /* ---- índice lateral: marca la sección visible ---- */
    var toc = document.querySelector('.toc');
    if (toc && 'IntersectionObserver' in window) {
      var enlaces = {}, dianas = [];
      toc.querySelectorAll('a[href^="#"]').forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        var s = document.getElementById(id);
        if (s) { enlaces[id] = a; dianas.push(s); }
      });
      if (dianas.length) {
        var obs = new IntersectionObserver(function (ent) {
          ent.forEach(function (e) {
            var a = enlaces[e.target.id];
            if (!a) return;
            if (e.isIntersecting) {
              Object.keys(enlaces).forEach(function (k) { enlaces[k].removeAttribute('aria-current'); });
              a.setAttribute('aria-current', 'true');
            }
          });
        }, { rootMargin: '-96px 0px -66% 0px' });
        dianas.forEach(function (s) { obs.observe(s); });
      }
    }

    /* ---- filtro de tablas ---- */
    document.querySelectorAll('[data-filtro]').forEach(function (campo) {
      var tabla = document.getElementById(campo.getAttribute('data-filtro'));
      if (!tabla) return;
      var cuenta = document.getElementById(campo.getAttribute('data-cuenta'));
      var filas = [].slice.call(tabla.tBodies[0] ? tabla.tBodies[0].rows : []);
      var norma = function (s) {
        return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      };
      campo.addEventListener('input', function () {
        var q = norma(campo.value.trim()), n = 0;
        filas.forEach(function (f) {
          var ok = !q || norma(f.innerText).indexOf(q) !== -1;
          f.hidden = !ok;
          if (ok) n++;
        });
        if (cuenta) cuenta.textContent = n + (n === 1 ? ' resultado' : ' resultados');
      });
    });

    /* ---- el buscador de la portada lleva a buscar.html ---- */
    var form = document.getElementById('buscar'),
        campo = document.getElementById('q');
    if (form && campo && !document.getElementById('resultados')) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var q = campo.value.trim();
        window.location.href = 'buscar.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      });
    }
  });
})();

/* Aviso de maqueta.
   Cada página del sitio deja anotada su dirección; la página de aviso ofrece
   volver a la última que se visitó. Se hace así y no solo con history.back()
   porque bajo el protocolo file:// —que es como se abre esta entrega— el
   navegador no informa del referente y el historial puede empezar en una
   pestaña en blanco, de modo que «atrás» llevaría a ninguna parte. */
(function(){
  var esAviso = /propuesta\.html$/.test(window.location.pathname);
  var guarda;
  try { guarda = window.sessionStorage; } catch (e) { guarda = null; }

  if (!esAviso) {
    if (guarda) { try { guarda.setItem('ultima', window.location.href); } catch (e) {} }
    return;
  }

  var b = document.querySelector('[data-volver]');
  if (!b) return;
  var previa = null;
  if (guarda) { try { previa = guarda.getItem('ultima'); } catch (e) {} }

  if (!previa) {
    b.textContent = 'Ir al inicio';
    b.addEventListener('click', function(){ window.location.href = 'index.html'; });
    return;
  }
  b.addEventListener('click', function(){ window.location.href = previa; });
})();
