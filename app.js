/* ── IELTS Practice — app.js ──────────────────── */

(function () {
  'use strict';

  // ── Nav pill animation ─────────────────────────
  const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
  const navSlider = document.querySelector('.nav-slider');

  function positionSlider(btn) {
    const track = btn.closest('.nav-pill-track');
    const trackRect = track.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    navSlider.style.width = btnRect.width + 'px';
    navSlider.style.transform = 'translateX(' + (btnRect.left - trackRect.left) + 'px)';
  }

  // Initialise slider position without transition on first load
  window.addEventListener('load', function () {
    requestAnimationFrame(function () {
      const activeBtn = document.querySelector('.nav-btn.active');
      if (activeBtn) {
        navSlider.style.transition = 'none';
        positionSlider(activeBtn);
        // Re-enable transition after the initial placement
        requestAnimationFrame(function () {
          navSlider.style.transition = '';
        });
      }
    });
  });

  // ── Mode switching ─────────────────────────────
  const sections = {
    writing: document.getElementById('section-writing'),
    speaking: document.getElementById('section-speaking'),
  };

  function switchMode(mode) {
    // Update nav buttons
    navBtns.forEach(function (btn) {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
      if (isActive) positionSlider(btn);
    });

    // Show / hide sections
    Object.keys(sections).forEach(function (key) {
      sections[key].classList.toggle('hidden', key !== mode);
    });
  }

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchMode(btn.dataset.mode);
    });
  });

  // ── Picker setup (drag + IntersectionObserver) ─
  function setupPicker(pickerId, dotsId) {
    const wrap = document.getElementById(pickerId);
    const dotsContainer = document.getElementById(dotsId);
    if (!wrap || !dotsContainer) return;

    const cards = Array.from(wrap.querySelectorAll('.card'));
    const dots = Array.from(dotsContainer.querySelectorAll('.dot'));

    // Track currently visible card index
    let activeIndex = 0;

    // -- IntersectionObserver to sync dots --
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const idx = cards.indexOf(entry.target);
            if (idx !== -1) {
              activeIndex = idx;
              dots.forEach(function (d, i) {
                d.classList.toggle('active', i === idx);
              });
            }
          }
        });
      },
      {
        root: wrap,
        threshold: 0.6,
      }
    );

    cards.forEach(function (card) {
      observer.observe(card);
    });

    // -- Mouse drag scrolling --
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    wrap.addEventListener('mousedown', function (e) {
      isDragging = true;
      wrap.classList.add('grabbing');
      startX = e.pageX - wrap.offsetLeft;
      scrollLeft = wrap.scrollLeft;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      const x = e.pageX - wrap.offsetLeft;
      const delta = x - startX;
      wrap.scrollLeft = scrollLeft - delta;
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      wrap.classList.remove('grabbing');
    });

    // Prevent default drag behaviour on cards (e.g. image ghost drag)
    wrap.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });

    // Return a getter for the active card value
    return function getActiveValue() {
      return cards[activeIndex] ? cards[activeIndex].dataset.value : null;
    };
  }

  const getWritingValue = setupPicker('picker-writing', 'dots-writing');
  const getSpeakingValue = setupPicker('picker-speaking', 'dots-speaking');

  // ── Start buttons ──────────────────────────────
  document.querySelectorAll('.start-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const pickerId = btn.dataset.picker;
      let value = null;

      if (pickerId === 'picker-writing' && getWritingValue) {
        value = getWritingValue();
      } else if (pickerId === 'picker-speaking' && getSpeakingValue) {
        value = getSpeakingValue();
      }

      if (value) {
        window.location.href = value + '.html';
      }
    });
  });
})();
