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
    var videoSrc = card.getAttribute("data-video");
    if (videoSrc) {
      return {
        type: "video",
        src: videoSrc,
        poster: card.getAttribute("data-video-poster") || (img ? img.getAttribute("src") : ""),
        caption: caption ? caption.textContent.trim() : ""
      };
    }
    return {
      type: "image",
      src: img ? img.getAttribute("src") : "",
      alt: img ? img.getAttribute("alt") || "" : "",
      caption: caption ? caption.textContent.trim() : ""
    };
  });

  // Add a subtle zoom hint icon to each card (visual affordance only;
  // video cards already show their own play-icon, so skip those)
  cards.forEach(function (card) {
    if (card.hasAttribute("data-video")) {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Play video" + (card.querySelector("figcaption") ? ": " + card.querySelector("figcaption").textContent.trim() : ""));
      return;
    }
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
      '<video class="lightbox-video" controls playsinline></video>' +
      '<figcaption class="lightbox-caption"></figcaption>' +
    "</figure>" +
    (items.length > 1 ? '<div class="lightbox-counter"></div>' : "");
  document.body.appendChild(lightbox);

  var imgEl = lightbox.querySelector(".lightbox-img");
  var videoEl = lightbox.querySelector(".lightbox-video");
  var captionEl = lightbox.querySelector(".lightbox-caption");
  var counterEl = lightbox.querySelector(".lightbox-counter");
  var closeBtn = lightbox.querySelector(".lightbox-close");
  var prevBtn = lightbox.querySelector(".lightbox-prev");
  var nextBtn = lightbox.querySelector(".lightbox-next");

  var activeIndex = 0;
  var lastFocused = null;

  function render() {
    var item = items[activeIndex];
    videoEl.pause();
    if (item.type === "video") {
      imgEl.style.display = "none";
      videoEl.style.display = "block";
      videoEl.poster = item.poster || "";
      if (videoEl.getAttribute("src") !== item.src) videoEl.setAttribute("src", item.src);
    } else {
      videoEl.style.display = "none";
      videoEl.removeAttribute("src");
      videoEl.load();
      imgEl.style.display = "block";
      imgEl.src = item.src;
      imgEl.alt = item.alt || "";
    }
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
    videoEl.pause();
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

// ===========================================================
// CART — localStorage cart, drawer, checkout modal, Flutterwave
// ===========================================================
//
// SETUP NOTE FOR THE MUSTARD HUB TEAM:
// 1. Sign up at https://dashboard.flutterwave.com and get your live
//    Public Key (Settings > API Keys).
// 2. Paste it below, replacing FLW_PUBLIC_KEY's placeholder value.
// 3. Until you do that, "Pay Now" will skip online payment and instead
//    send the order straight to your WhatsApp so nothing is lost —
//    you can take payment on delivery or via mobile money manually.
// 4. WHATSAPP_NUMBER below should be in international format with no
//    "+", "0" or spaces (e.g. Uganda 0785 505 004 -> 256785505004).
//
(function () {
  "use strict";

  var CART_KEY = "mustardhub_cart";
  var WHATSAPP_NUMBER = "256785505004";
  var FLW_PUBLIC_KEY = "FLWPUBK_TEST-REPLACE-WITH-YOUR-FLUTTERWAVE-PUBLIC-KEY-X";

  function isPaymentConfigured() {
    return FLW_PUBLIC_KEY.indexOf("REPLACE-WITH") === -1 && typeof window.FlutterwaveCheckout === "function";
  }

  function formatUGX(amount) {
    var rounded = Math.round(amount);
    return "UGX " + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function cartItemKey(id, variant) {
    return id + "::" + (variant || "");
  }

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage unavailable — cart just won't persist across pages */
    }
    renderCart();
  }

  function addToCart(item) {
    var cart = getCart();
    var key = cartItemKey(item.id, item.variant);
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      if (cartItemKey(cart[i].id, cart[i].variant) === key) { existing = cart[i]; break; }
    }
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        variant: item.variant || "",
        qty: item.qty || 1
      });
    }
    setCart(cart);
    showToast(item.name + " added to cart");
  }

  function removeFromCart(key) {
    var cart = getCart().filter(function (c) { return cartItemKey(c.id, c.variant) !== key; });
    setCart(cart);
  }

  function changeQty(key, delta) {
    var cart = getCart();
    for (var i = 0; i < cart.length; i++) {
      if (cartItemKey(cart[i].id, cart[i].variant) === key) {
        cart[i].qty += delta;
        if (cart[i].qty <= 0) cart.splice(i, 1);
        break;
      }
    }
    setCart(cart);
  }

  function subtotal(cart) {
    return cart.reduce(function (sum, c) { return sum + c.price * c.qty; }, 0);
  }

  // ---- Build drawer, checkout modal and toast (once per page) ----
  var drawer = document.createElement("div");
  drawer.className = "cart-drawer";
  drawer.innerHTML =
    '<div class="cart-drawer-backdrop"></div>' +
    '<div class="cart-drawer-panel" role="dialog" aria-modal="true" aria-label="Shopping cart">' +
      '<div class="cart-drawer-header"><h2>Your Cart</h2>' +
        '<button type="button" class="cart-drawer-close" aria-label="Close cart">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        "</button></div>" +
      '<div class="cart-items" id="cartItemsList"></div>' +
      '<div class="cart-drawer-footer">' +
        '<div class="cart-subtotal-row"><span class="cart-subtotal-label">Subtotal</span><span class="cart-subtotal-value" id="cartSubtotal">UGX 0</span></div>' +
        '<button type="button" class="btn btn-solid" id="cartCheckoutBtn">Checkout</button>' +
        '<p class="cart-note">Shipping and delivery details are confirmed after checkout.</p>' +
      "</div>" +
    "</div>";
  document.body.appendChild(drawer);

  var checkoutModal = document.createElement("div");
  checkoutModal.className = "checkout-modal";
  checkoutModal.innerHTML =
    '<div class="checkout-modal-backdrop"></div>' +
    '<div class="checkout-modal-panel" role="dialog" aria-modal="true" aria-label="Checkout">' +
      '<button type="button" class="checkout-modal-close" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      "</button>" +
      "<h2>Checkout</h2>" +
      '<p class="checkout-sub">Enter your details to complete your order with The Mustard Hub.</p>' +
      '<form id="checkoutForm" novalidate>' +
        '<div class="checkout-field"><label for="ckName">Full Name</label><input type="text" id="ckName" autocomplete="name" required></div>' +
        '<div class="checkout-field"><label for="ckPhone">Phone Number</label><input type="tel" id="ckPhone" placeholder="07xx xxx xxx" autocomplete="tel" required></div>' +
        '<div class="checkout-field"><label for="ckEmail">Email</label><input type="email" id="ckEmail" autocomplete="email" required></div>' +
        '<div class="checkout-field"><label for="ckNote">Delivery Address / Notes</label><textarea id="ckNote" placeholder="Where should we deliver this?"></textarea></div>' +
        '<p class="checkout-error" id="checkoutError">Please fill in your name, phone and email.</p>' +
        '<div class="checkout-total"><span class="cart-subtotal-label">Total</span><span class="checkout-total-value" id="checkoutTotal">UGX 0</span></div>' +
        '<button type="submit" class="btn btn-solid" id="checkoutPayBtn">Pay Now</button>' +
      "</form>" +
    "</div>";
  document.body.appendChild(checkoutModal);

  var toast = document.createElement("div");
  toast.className = "cart-toast";
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2600);
  }

  var itemsListEl = document.getElementById("cartItemsList");
  var subtotalEl = document.getElementById("cartSubtotal");
  var checkoutTotalEl = document.getElementById("checkoutTotal");

  function renderCart() {
    var cart = getCart();
    var count = cart.reduce(function (s, c) { return s + c.qty; }, 0);

    document.querySelectorAll(".cart-count").forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });

    if (!cart.length) {
      itemsListEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    } else {
      itemsListEl.innerHTML = cart.map(function (item) {
        var key = cartItemKey(item.id, item.variant);
        return (
          '<div class="cart-item">' +
            '<img class="cart-item-thumb" src="' + item.image + '" alt="">' +
            '<div class="cart-item-info">' +
              '<p class="cart-item-name">' + item.name + "</p>" +
              (item.variant ? '<p class="cart-item-variant">' + item.variant + "</p>" : "") +
              '<div class="cart-item-row">' +
                '<div class="qty-stepper" data-cart-qty="' + key + '">' +
                  '<button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">&minus;</button>' +
                  '<span class="qty-value">' + item.qty + "</span>" +
                  '<button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>' +
                "</div>" +
                '<span class="cart-item-price">' + formatUGX(item.price * item.qty) + "</span>" +
              "</div>" +
              '<button type="button" class="cart-item-remove" data-remove-key="' + key + '">Remove</button>' +
            "</div>" +
          "</div>"
        );
      }).join("");
    }

    var total = subtotal(cart);
    subtotalEl.textContent = formatUGX(total);
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatUGX(total);
  }

  // ---- Open/close helpers ----
  function openCartDrawer() {
    drawer.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeCartDrawer() {
    drawer.classList.remove("is-open");
    if (!checkoutModal.classList.contains("is-open")) document.body.style.overflow = "";
  }
  function openCheckoutModal() {
    if (!getCart().length) return;
    drawer.classList.remove("is-open");
    checkoutModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeCheckoutModal() {
    checkoutModal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  var cartToggleBtn = document.getElementById("cartToggle");
  if (cartToggleBtn) cartToggleBtn.addEventListener("click", openCartDrawer);

  drawer.querySelector(".cart-drawer-close").addEventListener("click", closeCartDrawer);
  drawer.querySelector(".cart-drawer-backdrop").addEventListener("click", closeCartDrawer);
  document.getElementById("cartCheckoutBtn").addEventListener("click", openCheckoutModal);

  checkoutModal.querySelector(".checkout-modal-close").addEventListener("click", closeCheckoutModal);
  checkoutModal.querySelector(".checkout-modal-backdrop").addEventListener("click", closeCheckoutModal);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeCheckoutModal();
    closeCartDrawer();
  });

  // ---- Add to Cart buttons (direct listeners so clicks inside a
  // gallery-card don't also trigger that card's lightbox) ----
  document.querySelectorAll(".btn-add-cart").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      var panel = btn.closest(".product-panel");
      var qty = 1;
      var variant = "";
      if (panel) {
        var qtyValEl = panel.querySelector(".qty-stepper .qty-value");
        if (qtyValEl) qty = parseInt(qtyValEl.textContent, 10) || 1;
        var activeSwatch = panel.querySelector(".swatch.is-active");
        if (activeSwatch) variant = activeSwatch.getAttribute("data-color") || "";
      }

      addToCart({
        id: btn.getAttribute("data-product-id"),
        name: btn.getAttribute("data-name"),
        price: parseFloat(btn.getAttribute("data-price")) || 0,
        image: btn.getAttribute("data-image"),
        variant: variant,
        qty: qty
      });

      var originalText = btn.textContent;
      btn.classList.add("is-added");
      btn.textContent = "Added \u2713";
      setTimeout(function () {
        btn.textContent = originalText;
        btn.classList.remove("is-added");
      }, 1400);
    });
  });

  // ---- Colour swatches + quantity steppers (delegated: cart-item rows
  // are re-rendered dynamically, so they need delegated listeners) ----
  document.addEventListener("click", function (e) {
    var swatch = e.target.closest(".swatch");
    if (swatch) {
      var group = swatch.closest(".color-swatches");
      group.querySelectorAll(".swatch").forEach(function (s) {
        s.classList.remove("is-active");
        s.setAttribute("aria-checked", "false");
      });
      swatch.classList.add("is-active");
      swatch.setAttribute("aria-checked", "true");
      var optionEl = swatch.closest(".product-option");
      var valueEl = optionEl ? optionEl.querySelector(".product-option-value") : null;
      if (valueEl) valueEl.textContent = swatch.getAttribute("data-color") || "";
      return;
    }

    var qtyBtn = e.target.closest(".qty-btn");
    if (qtyBtn) {
      var stepper = qtyBtn.closest(".qty-stepper");
      var step = parseInt(qtyBtn.getAttribute("data-step"), 10) || 0;
      if (stepper.hasAttribute("data-cart-qty")) {
        changeQty(stepper.getAttribute("data-cart-qty"), step);
      } else {
        var valEl = stepper.querySelector(".qty-value");
        var current = parseInt(valEl.textContent, 10) || 1;
        valEl.textContent = Math.max(1, Math.min(10, current + step));
      }
      return;
    }

    var removeBtn = e.target.closest(".cart-item-remove");
    if (removeBtn) {
      removeFromCart(removeBtn.getAttribute("data-remove-key"));
    }
  });

  // ---- Checkout submit: try Flutterwave, fall back to WhatsApp handoff ----
  document.addEventListener("submit", function (e) {
    if (!e.target || e.target.id !== "checkoutForm") return;
    e.preventDefault();

    var cart = getCart();
    if (!cart.length) return;

    var name = document.getElementById("ckName").value.trim();
    var phone = document.getElementById("ckPhone").value.trim();
    var email = document.getElementById("ckEmail").value.trim();
    var note = document.getElementById("ckNote").value.trim();
    var errorEl = document.getElementById("checkoutError");

    if (!name || !phone || !email) {
      errorEl.classList.add("is-visible");
      return;
    }
    errorEl.classList.remove("is-visible");

    var total = subtotal(cart);
    var txRef = "mustardhub_" + Date.now();

    function buildWhatsAppUrl(paymentNote) {
      var lines = cart.map(function (c) {
        return "- " + c.name + (c.variant ? " (" + c.variant + ")" : "") + " x" + c.qty + " \u2014 " + formatUGX(c.price * c.qty);
      });
      var msg =
        "New order from The Mustard Hub website\n\n" +
        lines.join("\n") + "\n\n" +
        "Total: " + formatUGX(total) + "\n\n" +
        "Name: " + name + "\nPhone: " + phone + "\nEmail: " + email +
        (note ? "\nNotes: " + note : "") +
        (paymentNote ? "\n\n" + paymentNote : "");
      return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
    }

    function completeOrder(paymentNote) {
      window.open(buildWhatsAppUrl(paymentNote), "_blank", "noopener");
      setCart([]);
      closeCheckoutModal();
      closeCartDrawer();
      showToast("Order sent! We'll confirm shortly.");
    }

    if (isPaymentConfigured()) {
      window.FlutterwaveCheckout({
        public_key: FLW_PUBLIC_KEY,
        tx_ref: txRef,
        amount: total,
        currency: "UGX",
        payment_options: "card, mobilemoneyuganda, ussd",
        customer: { email: email, phone_number: phone, name: name },
        customizations: {
          title: "The Mustard Hub",
          description: "Order payment"
        },
        callback: function (data) {
          if (data && (data.status === "successful" || data.status === "completed")) {
            completeOrder("Payment confirmed via Flutterwave (ref: " + (data.transaction_id || txRef) + ").");
          }
        },
        onclose: function () { /* user closed the payment popup without paying */ }
      });
    } else {
      // No live Flutterwave key yet — hand the order to WhatsApp so it's
      // never lost. Swap in a real key above to take real payments here.
      completeOrder("Note: online payment isn't connected on the site yet \u2014 please confirm payment method with our team.");
    }
  });

  renderCart();
})();

// ===========================================================
// BEFORE / AFTER COMPARISON SLIDER
// ===========================================================
(function () {
  "use strict";

  var sliders = document.querySelectorAll(".compare-slider");
  if (!sliders.length) return;

  sliders.forEach(function (slider) {
    var afterImg = slider.querySelector(".compare-img--after");
    var handle = slider.querySelector(".compare-handle");
    if (!afterImg || !handle) return;

    handle.setAttribute("tabindex", "0");
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", "Drag to compare before and after");
    handle.setAttribute("aria-valuemin", "0");
    handle.setAttribute("aria-valuemax", "100");
    handle.setAttribute("aria-valuenow", "50");

    var dragging = false;

    function setPosition(percent) {
      percent = Math.max(0, Math.min(100, percent));
      afterImg.style.clipPath = "inset(0 0 0 " + percent + "%)";
      handle.style.left = percent + "%";
      handle.setAttribute("aria-valuenow", Math.round(percent));
    }

    function percentFromEvent(clientX) {
      var rect = slider.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    function onMove(clientX) {
      setPosition(percentFromEvent(clientX));
    }

    slider.addEventListener("pointerdown", function (e) {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      onMove(e.clientX);
    });
    slider.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      onMove(e.clientX);
    });
    slider.addEventListener("pointerup", function () { dragging = false; });
    slider.addEventListener("pointercancel", function () { dragging = false; });

    handle.addEventListener("keydown", function (e) {
      var current = parseFloat(handle.style.left) || 50;
      if (e.key === "ArrowLeft") { setPosition(current - 4); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPosition(current + 4); e.preventDefault(); }
    });

    setPosition(50);
  });
})();
