/* ── IELTS Practice — app.js ──────────────────── */

(function () {
  'use strict';

  // ── Nav pill animation ─────────────────────────
  const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
  const navSlider = document.querySelector('.nav-slider');

  function positionSlider(btn) {
    const trackRect = btn.closest('.nav-pill-track').getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    navSlider.style.width = btnRect.width + 'px';
    navSlider.style.transform = 'translateX(' + (btnRect.left - trackRect.left) + 'px)';
  }

  window.addEventListener('load', function () {
    requestAnimationFrame(function () {
      const activeBtn = document.querySelector('.nav-btn.active');
      if (activeBtn) {
        navSlider.style.transition = 'none';
        positionSlider(activeBtn);
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
    navBtns.forEach(function (btn) {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
      if (isActive) positionSlider(btn);
    });
    Object.keys(sections).forEach(function (key) {
      sections[key].classList.toggle('hidden', key !== mode);
    });
  }

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchMode(btn.dataset.mode);
    });
  });

  // ── Card pop + shimmer animation ───────────────
  function triggerPop(card) {
    // Force reflow so re-selecting the same card replays the animation
    card.classList.remove('card-popping');
    void card.offsetWidth;
    card.classList.add('card-popping');
    card.addEventListener('animationend', function () {
      card.classList.remove('card-popping');
    }, { once: true });
  }

  // ── Card stack (click-to-select) ───────────────
  function setupCardStack(stackId, dotsId) {
    const stack = document.getElementById(stackId);
    const dotsEl = document.getElementById(dotsId);
    if (!stack) return null;

    const cards = Array.from(stack.querySelectorAll('.card'));
    const dots = dotsEl ? Array.from(dotsEl.querySelectorAll('.dot')) : [];

    // Find initial active index from HTML
    let activeIdx = cards.findIndex(function (c) {
      return c.classList.contains('card-active');
    });
    if (activeIdx === -1) activeIdx = 0;

    // Sync dots to initial state
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === activeIdx);
    });

    function select(idx) {
      if (idx === activeIdx) return;
      activeIdx = idx;

      cards.forEach(function (card, i) {
        const isActive = i === idx;
        card.classList.toggle('card-active', isActive);
        card.classList.toggle('card-inactive', !isActive);
        if (isActive) triggerPop(card);
      });

      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === idx);
      });
    }

    cards.forEach(function (card, i) {
      card.addEventListener('click', function () {
        select(i);
      });
    });

    return function getActiveValue() {
      return cards[activeIdx] ? cards[activeIdx].dataset.value : null;
    };
  }

  const getWritingValue = setupCardStack('stack-writing', 'dots-writing');
  const getSpeakingValue = setupCardStack('stack-speaking', 'dots-speaking');

  // ── Start buttons ──────────────────────────────
  document.querySelectorAll('.start-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const value = btn.dataset.section === 'writing'
        ? getWritingValue && getWritingValue()
        : getSpeakingValue && getSpeakingValue();
      if (value) {
        window.location.href = value + '.html';
      }
    });
  });

})();
