/* ============================================================================
   features.js — Mejoras del sitio (script clásico, corre tras el script principal).
   1) "¿Dónde estamos ahora?": banner según la fecha + parada resaltada en el mapa.
   2) Galería de fotos del diario (se alimenta de las entradas del diario).
   ========================================================================== */
(function () {
  "use strict";

  // ── Calendario del viaje (fechas de inicio en cada parada del mapa) ──────────
  var TRIP_START = new Date("2026-12-26T00:00:00");
  var TRIP_END   = new Date("2027-02-01T23:59:59");
  var SCHEDULE = [
    { num: 1, city: "Bali",       flag: "🇮🇩", start: "2026-12-28", color: "#d4783a" },
    { num: 2, city: "Phuket",     flag: "🇹🇭", start: "2027-01-05", color: "#8b1a3a" },
    { num: 3, city: "Krabi",      flag: "🇹🇭", start: "2027-01-09", color: "#8b1a3a" },
    { num: 4, city: "Bangkok",    flag: "🇹🇭", start: "2027-01-13", color: "#8b1a3a" },
    { num: 5, city: "Chiang Mai", flag: "🇹🇭", start: "2027-01-15", color: "#8b1a3a" },
    { num: 6, city: "Osaka",      flag: "🇯🇵", start: "2027-01-19", color: "#c8293a" },
    { num: 7, city: "Kyoto",      flag: "🇯🇵", start: "2027-01-22", color: "#c8293a" },
    { num: 8, city: "Tokyo",      flag: "🇯🇵", start: "2027-01-25", color: "#c8293a" },
  ].map(function (s) { s.startDate = new Date(s.start + "T00:00:00"); return s; });

  var DAY = 86400000;
  function daysBetween(a, b) { return Math.ceil((b - a) / DAY); }

  function computeState(now) {
    if (now < SCHEDULE[0].startDate) {
      return { status: "before", next: SCHEDULE[0], days: Math.max(0, daysBetween(now, TRIP_START)) };
    }
    if (now > TRIP_END) {
      return { status: "after" };
    }
    var current = SCHEDULE[0];
    for (var i = 0; i < SCHEDULE.length; i++) {
      if (now >= SCHEDULE[i].startDate) current = SCHEDULE[i];
    }
    var dayNum = Math.min(38, Math.max(1, daysBetween(TRIP_START, now)));
    return { status: "during", stop: current, dayNum: dayNum };
  }

  // ── Banner "¿Dónde estamos ahora?" ────────────────────────────────────────────
  function renderBanner() {
    var resumen = document.getElementById("resumen");
    if (!resumen) return;
    var st = computeState(new Date());
    var el = document.getElementById("now-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "now-banner";
      el.className = "now-banner";
      resumen.insertBefore(el, resumen.firstChild);
    }
    var html = "", num = null;
    if (st.status === "before") {
      num = st.next.num;
      html = '<span class="nb-icon">✈️</span><span class="nb-text">Faltan <b>' + st.days +
        ' días</b> para partir · primera parada <b>' + st.next.city + " " + st.next.flag + "</b></span>";
    } else if (st.status === "during") {
      num = st.stop.num;
      html = '<span class="nb-dot" style="background:' + st.stop.color + '"></span>' +
        '<span class="nb-text">Ahora en <b>' + st.stop.city + " " + st.stop.flag +
        "</b> · Parada " + st.stop.num + " de 8 · Día " + st.dayNum + " de 38</span>";
    } else {
      html = '<span class="nb-icon">🏡</span><span class="nb-text">Viaje terminado · <b>38 días</b> de recuerdos increíbles</span>';
    }
    el.innerHTML = html + '<button class="nb-map" onclick="goTo(\'mapa\',this)">Ver en el mapa →</button>';
    if (num) highlightStop(num);
  }

  // ── Resaltar la parada actual/próxima en el mapa ──────────────────────────────
  function highlightStop(num) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var markers = document.querySelectorAll(".leaflet-marker-icon");
      var found = false;
      markers.forEach(function (m) {
        var d = m.querySelector("div");
        if (d && d.textContent.trim() === String(num)) {
          d.classList.add("stop-current");
          found = true;
        }
      });
      if (found || tries > 60) clearInterval(iv);
    }, 400);
  }

  // ── Galería de fotos (se inyecta al actualizarse el diario) ───────────────────
  function renderGallery(entries) {
    var grid = document.getElementById("galeria-grid");
    if (!grid) return;
    var photos = [];
    (entries || []).forEach(function (e) {
      (e.photos || []).forEach(function (src) {
        photos.push({ src: src, place: e.place, country: e.country, title: e.title });
      });
    });
    var filter = window._galFilter || "";
    var shown = filter ? photos.filter(function (p) { return p.country === filter; }) : photos;
    if (shown.length === 0) {
      grid.innerHTML = '<div class="diario-empty" style="grid-column:1/-1">' +
        '<div class="diario-empty-icon">🖼️</div>Las fotos del viaje aparecerán aquí a medida que el grupo publique en el diario.</div>';
      return;
    }
    // Guardar para el lightbox de la galería
    window._galPhotos = shown.map(function (p) { return p.src; });
    grid.innerHTML = shown.map(function (p, i) {
      return '<div class="gal-item" onclick="openGalleryLightbox(' + i + ')">' +
        '<img src="' + p.src + '" alt="' + (p.title || "foto") + '" loading="lazy">' +
        '<div class="gal-cap">' + (p.place || "") + "</div></div>";
    }).join("");
  }

  window.filterGallery = function (country, btn) {
    window._galFilter = country || "";
    document.querySelectorAll("#galeria .df-btn").forEach(function (b) { b.classList.remove("active"); });
    if (btn) btn.classList.add("active");
    renderGallery(window._lastEntries || []);
  };

  // Lightbox de la galería: reutiliza el del diario (botones ‹ › y teclado ya funcionan)
  window.openGalleryLightbox = function (idx) {
    var photos = window._galPhotos || [];
    if (!photos.length) return;
    window._lbPhotos = photos;
    window._lbIdx = idx;
    document.getElementById("lightbox").classList.add("open");
    document.body.style.overflow = "hidden";
    if (typeof window.updateLightbox === "function") window.updateLightbox();
    if (typeof window.lightboxKey === "function") document.addEventListener("keydown", window.lightboxKey);
  };

  // Enganchar la galería al render del diario sin tocar el script principal
  function hookDiario() {
    if (typeof window.renderDiario !== "function") return false;
    var orig = window.renderDiario;
    window.renderDiario = function (entries) {
      orig.apply(this, arguments);
      renderGallery(window._lastEntries && window._lastEntries.length ? window._lastEntries : entries);
    };
    return true;
  }

  // ── Animación de aparición al hacer scroll ────────────────────────────────────
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    var els = document.querySelectorAll(".sum-card,.zone-card,.flight-row,.aloj-item,.tip-card,.prep-item");
    if (!els.length) return;
    els.forEach(function (e) { e.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  function init() {
    renderBanner();
    setInterval(renderBanner, 60000); // refresca cada minuto
    if (!hookDiario()) {
      var t = setInterval(function () { if (hookDiario()) clearInterval(t); }, 300);
    }
    renderGallery(window._lastEntries || []);
    initReveal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
