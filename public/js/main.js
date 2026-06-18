/* =====================================================================
   OzoPet Salus Medica — REGENERAH · front-end interactions
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- year ---- */
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  /* ---- topbar stuck + scroll progress ---- */
  const topbar = $("#topbar");
  const progress = $("#progress");
  function onScroll() {
    const sc = window.scrollY || document.documentElement.scrollTop;
    if (topbar) topbar.classList.toggle("is-stuck", sc > 24);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (sc / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- mobile nav ---- */
  const burger = $("#burger");
  const nav = $("#nav");
  function closeNav() {
    document.body.classList.remove("nav-open");
    if (nav) nav.classList.remove("is-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", closeNav));
  }
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });

  /* ---- reveal on scroll ---- */
  const reveals = $$(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- active section in nav ---- */
  const links = $$("#nav a");
  const map = new Map();
  links.forEach((a) => { const id = a.getAttribute("href").slice(1); const sec = document.getElementById(id); if (sec) map.set(sec, a); });
  if ("IntersectionObserver" in window && map.size) {
    const so = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove("is-active"));
          const a = map.get(en.target); if (a) a.classList.add("is-active");
        }
      }),
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    map.forEach((_, sec) => so.observe(sec));
  }

  /* ---- oxygen bubbles field (hero) ---- */
  const bubbles = $("#bubbles");
  if (bubbles && !reduce) {
    const N = 16;
    for (let i = 0; i < N; i++) {
      const b = document.createElement("span");
      b.className = "bubble";
      const size = 6 + Math.random() * 26;
      b.style.width = b.style.height = size + "px";
      b.style.left = Math.random() * 100 + "%";
      b.style.bottom = -10 - Math.random() * 30 + "%";
      b.style.animationDuration = 9 + Math.random() * 12 + "s";
      b.style.animationDelay = -Math.random() * 12 + "s";
      bubbles.appendChild(b);
    }
  }

  /* ---- contact form ---- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  const btn = $("#submitBtn");
  const CLINIC_EMAIL = "info@ozopetsalusmedica.it"; // fallback mailto recipient

  function setStatus(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form__status " + (ok ? "is-ok" : "is-err");
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        name: $("#name").value.trim(),
        phone: $("#phone").value.trim(),
        email: $("#email").value.trim(),
        pet: $("#pet").value,
        therapy: $("#therapy").value,
        message: $("#message").value.trim(),
        consent: $("#consent").checked,
      };

      if (!data.name || !data.phone || !data.email || !data.message) {
        return setStatus("Compila tutti i campi contrassegnati con *.", false);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return setStatus("Inserisci un indirizzo email valido.", false);
      }
      if (!data.consent) {
        return setStatus("Per procedere è necessario il consenso al trattamento dati.", false);
      }

      btn.disabled = true;
      const label = btn.innerHTML;
      btn.innerHTML = "Invio in corso…";

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          form.reset();
          setStatus("Grazie! Abbiamo ricevuto la tua richiesta: ti ricontatteremo al più presto.", true);
        } else {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Errore");
        }
      } catch (err) {
        // graceful fallback for static hosting (no backend): open email client
        const subject = encodeURIComponent("Richiesta info — " + data.name + " (" + data.pet + ")");
        const body = encodeURIComponent(
          "Nome: " + data.name + "\nTelefono: " + data.phone + "\nEmail: " + data.email +
          "\nAnimale: " + data.pet + "\nInteresse: " + data.therapy + "\n\n" + data.message
        );
        setStatus("Apriamo il tuo programma di posta per inviare la richiesta. In alternativa, chiamaci allo 0323 346281.", true);
        window.location.href = "mailto:" + CLINIC_EMAIL + "?subject=" + subject + "&body=" + body;
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  }
})();
