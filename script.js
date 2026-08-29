// ===========================================================
// THE MUSTARD HUB — interactions
// ===========================================================
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");

  // ---- Sticky header background on scroll ----
  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- Mobile nav toggle ----
  function closeNav() {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.classList.remove("is-active");
  }

  navToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    navToggle.classList.toggle("is-active", isOpen);
  });

  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll(".reveal");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var delay = (Array.prototype.indexOf.call(el.parentNode.children, el) % 6) * 70;
            setTimeout(function () {
              el.classList.add("is-visible");
            }, delay);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  // ---- Footer year ----
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Hero slideshow ----
  var slideshow = document.getElementById("heroSlideshow");
  if (slideshow && !prefersReducedMotion) {
    var slides = slideshow.querySelectorAll(".hero-slide");
    if (slides.length > 1) {
      var current = 0;
      setInterval(function () {
        slides[current].classList.remove("active");
        current = (current + 1) % slides.length;
        slides[current].classList.add("active");
      }, 5500);
    }
  }
})();

// ===========================================================
// LIGHTBOX — full-size image modal with backdrop blur
// Auto-attaches to any .gallery-card figure on the page
// ===========================================================
(function () {
  "use strict";

  var cards = document.querySelectorAll(".gallery-card");
  if (!cards.length) return;

  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
  var ICON_ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var ICON_ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg>';

  // Build item list from the cards already on the page
  var items = Array.prototype.map.call(cards, function (card) {
    var img = card.querySelector("img");
    var caption = card.querySelector("figcaption");
    return {
      src: img ? img.getAttribute("src") : "",
      alt: img ? img.getAttribute("alt") || "" : "",
      caption: caption ? caption.textContent.trim() : ""
    };
  });

  // Add a subtle zoom hint icon to each card (visual affordance only)
  cards.forEach(function (card) {
    if (card.querySelector(".gallery-zoom-hint")) return;
    var hint = document.createElement("span");
    hint.className = "gallery-zoom-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML = ICON_ZOOM;
    card.appendChild(hint);
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "View larger image" + (card.querySelector("figcaption") ? ": " + card.querySelector("figcaption").textContent.trim() : ""));
  });

  // Build the lightbox DOM once
  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close">' + ICON_CLOSE + "</button>" +
    (items.length > 1
      ? '<button type="button" class="lightbox-prev" aria-label="Previous image">' + ICON_ARROW_L + "</button>" +
        '<button type="button" class="lightbox-next" aria-label="Next image">' + ICON_ARROW_R + "</button>"
      : "") +
    '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" src="" alt="">' +
      '<figcaption class="lightbox-caption"></figcaption>' +
    "</figure>" +
    (items.length > 1 ? '<div class="lightbox-counter"></div>' : "");
  document.body.appendChild(lightbox);

  var imgEl = lightbox.querySelector(".lightbox-img");
  var captionEl = lightbox.querySelector(".lightbox-caption");
  var counterEl = lightbox.querySelector(".lightbox-counter");
  var closeBtn = lightbox.querySelector(".lightbox-close");
  var prevBtn = lightbox.querySelector(".lightbox-prev");
  var nextBtn = lightbox.querySelector(".lightbox-next");

  var activeIndex = 0;
  var lastFocused = null;

  function render() {
    var item = items[activeIndex];
    imgEl.src = item.src;
    imgEl.alt = item.alt;
    captionEl.textContent = item.caption;
    if (counterEl) counterEl.textContent = (activeIndex + 1) + " / " + items.length;
  }

  function openAt(index) {
    activeIndex = index;
    lastFocused = document.activeElement;
    render();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function next() {
    activeIndex = (activeIndex + 1) % items.length;
    render();
  }

  function prev() {
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    render();
  }

  cards.forEach(function (card, index) {
    card.addEventListener("click", function () {
      openAt(index);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt(index);
      }
    });
  });

  closeBtn.addEventListener("click", close);
  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  // Click outside the image/figure closes the lightbox
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" && nextBtn) next();
    if (e.key === "ArrowLeft" && prevBtn) prev();
  });
})();
