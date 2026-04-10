/* ── IELTS AI Evaluator — eval.js ─────────────────────── */
(function () {
  'use strict';

  /* ── Utilities ─────────────────────────────────────── */
  function countWords(text) {
    var trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  }

  function getTaskType() {
    var el = document.querySelector('.practice-nav__title');
    if (!el) return 'task1';
    return el.textContent.indexOf('Task 2') !== -1 ? 'task2' : 'task1';
  }

  function getMinWords() {
    return getTaskType() === 'task1' ? 150 : 250;
  }

  function getQuestion() {
    var el = document.getElementById('q-prompt');
    return el ? el.textContent.trim() : '';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bandColor(b) {
    if (b >= 7)   return '#16a34a';
    if (b >= 5.5) return '#d97706';
    return '#dc2626';
  }

  function bandBg(b) {
    if (b >= 7)   return 'rgba(22,163,74,.1)';
    if (b >= 5.5) return 'rgba(217,119,6,.1)';
    return 'rgba(220,38,38,.1)';
  }

  /* ── Word count ─────────────────────────────────────── */
  function initWordCount() {
    var textarea  = document.getElementById('eval-textarea');
    var countEl   = document.getElementById('eval-word-count');
    var warningEl = document.getElementById('eval-word-warning');
    if (!textarea || !countEl) return;

    textarea.addEventListener('input', function () {
      var n   = countWords(textarea.value);
      var min = getMinWords();
      countEl.textContent = n + ' word' + (n !== 1 ? 's' : '');
      countEl.classList.remove('count-ok', 'count-low');
      if (textarea.value.trim()) {
        if (n >= min) {
          countEl.classList.add('count-ok');
          if (warningEl) warningEl.style.display = 'none';
        } else {
          countEl.classList.add('count-low');
          if (warningEl) {
            warningEl.textContent = '⚠ Minimum ' + min + ' words required';
            warningEl.style.display = 'inline';
          }
        }
      } else {
        if (warningEl) warningEl.style.display = 'none';
      }
    });
  }

  /* ── Prompt builder ─────────────────────────────────── */
  function buildPrompt(taskType, question, essay) {
    var taskName = taskType === 'task1'
      ? 'Task 1 (academic graph / chart / map / diagram description)'
      : 'Task 2 (academic argumentative / discussion essay)';
    var crit1 = taskType === 'task1' ? 'Task Achievement' : 'Task Response';
    var minW  = taskType === 'task1' ? 150 : 250;
    var wc    = countWords(essay);

    return (
      'You are an IELTS Writing examiner. Evaluate the following IELTS Writing ' + taskName + ' response.\n\n' +
      'Question given to the student:\n"' + question + '"\n\n' +
      'Student response (' + wc + ' words):\n"' + essay + '"\n\n' +
      'Scoring rules:\n' +
      '- Score each criterion 0–9, 0.5 increments allowed\n' +
      '- overall_band = average of the 4 criteria, rounded to the nearest 0.5\n' +
      '- Penalise if fewer than ' + minW + ' words\n' +
      '- Penalise bullet-point answers (not full sentences)\n' +
      '- Be strict but fair; do NOT invent content absent from the text\n' +
      '- Pick 2–3 real sentences verbatim from the text to rewrite\n\n' +
      'Return ONLY a valid JSON object — no markdown, no extra text:\n' +
      '{\n' +
      '  "overall_band": 6.5,\n' +
      '  "criteria": [\n' +
      '    {"name": "' + crit1 + '", "band": 6.0, "explanation": "2-3 sentences"},\n' +
      '    {"name": "Coherence and Cohesion", "band": 6.0, "explanation": "2-3 sentences"},\n' +
      '    {"name": "Lexical Resource", "band": 6.0, "explanation": "2-3 sentences"},\n' +
      '    {"name": "Grammatical Range and Accuracy", "band": 6.0, "explanation": "2-3 sentences"}\n' +
      '  ],\n' +
      '  "strengths": ["...", "...", "..."],\n' +
      '  "weaknesses": ["...", "...", "..."],\n' +
      '  "improvements": ["...", "...", "..."],\n' +
      '  "sentence_corrections": [\n' +
      '    {"original": "verbatim sentence from text", "improved": "rewritten version"},\n' +
      '    {"original": "...", "improved": "..."},\n' +
      '    {"original": "...", "improved": "..."}\n' +
      '  ],\n' +
      '  "band_tips": ["...", "...", "..."]\n' +
      '}'
    );
  }

  /* ── API call (via server proxy) ────────────────────── */
  function callEvaluate(prompt) {
    return fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model      : 'claude-haiku-4-5-20251001',
        max_tokens : 2048,
        messages   : [{ role: 'user', content: prompt }]
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (e) {
          throw new Error(
            (e.error && e.error.message) ? e.error.message : 'Server error ' + res.status
          );
        });
      }
      return res.json();
    }).then(function (data) {
      var raw     = data.content && data.content[0] && data.content[0].text || '';
      var cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      return JSON.parse(cleaned);
    });
  }

  /* ── Render results ─────────────────────────────────── */
  function renderResults(data) {
    var container = document.getElementById('eval-results');
    if (!container) return;

    var bc = bandColor(data.overall_band);
    var bb = bandBg(data.overall_band);
    var h  = '';

    /* Overall band */
    h += '<div class="er-card er-card--overall">';
    h += '<div class="er-band-num" style="color:' + bc + ';background:' + bb + '">' + data.overall_band + '</div>';
    h += '<div><div class="er-band-label">Overall Band Score</div>';
    h += '<span class="er-estimated">Estimated</span></div>';
    h += '</div>';

    /* Criteria grid */
    h += '<div class="er-section-title">Criteria Breakdown</div>';
    h += '<div class="er-criteria-grid">';
    (data.criteria || []).forEach(function (c) {
      var cc = bandColor(c.band); var cb = bandBg(c.band);
      h += '<div class="er-card er-card--criterion">';
      h += '<div class="er-crit-header">';
      h += '<span class="er-crit-name">' + escapeHtml(c.name) + '</span>';
      h += '<span class="er-crit-band" style="color:' + cc + ';background:' + cb + '">' + c.band + '</span>';
      h += '</div>';
      h += '<p class="er-crit-text">' + escapeHtml(c.explanation) + '</p>';
      h += '</div>';
    });
    h += '</div>';

    /* Strengths / Weaknesses / Improvements */
    h += '<div class="er-feedback-grid">';
    [
      { key: 'strengths',    cls: 'green', icon: '✓', label: 'Strengths'      },
      { key: 'weaknesses',   cls: 'red',   icon: '✗', label: 'Weaknesses'     },
      { key: 'improvements', cls: 'amber', icon: '→', label: 'What to Improve' }
    ].forEach(function (s) {
      h += '<div class="er-card er-card--' + s.cls + '">';
      h += '<div class="er-fb-title er-fb-title--' + s.cls + '">' + s.icon + '&ensp;' + s.label + '</div>';
      h += '<ul class="er-list">';
      (data[s.key] || []).forEach(function (item) { h += '<li>' + escapeHtml(item) + '</li>'; });
      h += '</ul></div>';
    });
    h += '</div>';

    /* Sentence corrections */
    if (data.sentence_corrections && data.sentence_corrections.length) {
      h += '<div class="er-section-title">Sentence-Level Corrections</div>';
      h += '<div class="er-card">';
      data.sentence_corrections.forEach(function (sc) {
        h += '<div class="er-correction">';
        h += '<div class="er-corr-orig"><span class="er-corr-lbl">Original</span>' + escapeHtml(sc.original) + '</div>';
        h += '<div class="er-corr-arrow">↓</div>';
        h += '<div class="er-corr-impr"><span class="er-corr-lbl">Improved</span>' + escapeHtml(sc.improved) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    /* Band tips */
    if (data.band_tips && data.band_tips.length) {
      h += '<div class="er-section-title">Tips to Raise Your Band Score</div>';
      h += '<div class="er-card er-card--tips"><ul class="er-list er-list--tips">';
      (data.band_tips || []).forEach(function (tip) {
        h += '<li>✦&ensp;' + escapeHtml(tip) + '</li>';
      });
      h += '</ul></div>';
    }

    /* Disclaimer + copy */
    h += '<div class="er-disclaimer">⚠ AI feedback is not 100% accurate and may differ from official IELTS examiners. Use this as guidance only.</div>';
    h += '<button class="er-btn-copy" id="er-btn-copy">⎘&ensp;Copy Feedback</button>';

    container.innerHTML = h;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('er-btn-copy').addEventListener('click', function () {
      copyFeedback(data);
    });
  }

  function copyFeedback(data) {
    var t = 'IELTS Writing Evaluation\n\nOverall Band: ' + data.overall_band + '\n\n';
    t += 'Criteria:\n';
    (data.criteria || []).forEach(function (c) { t += '• ' + c.name + ': ' + c.band + '\n  ' + c.explanation + '\n'; });
    t += '\nStrengths:\n'    + (data.strengths    || []).map(function (s) { return '• ' + s; }).join('\n');
    t += '\n\nWeaknesses:\n' + (data.weaknesses   || []).map(function (s) { return '• ' + s; }).join('\n');
    t += '\n\nImprovements:\n' + (data.improvements || []).map(function (s) { return '• ' + s; }).join('\n');
    t += '\n\nBand Tips:\n'  + (data.band_tips    || []).map(function (s) { return '• ' + s; }).join('\n');

    var btn = document.getElementById('er-btn-copy');
    function flash() { if (btn) { btn.textContent = '✓ Copied!'; setTimeout(function () { btn.textContent = '⎘\u2005Copy Feedback'; }, 2000); } }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(flash).catch(fallback);
    } else { fallback(); }

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); flash(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ── Evaluate button ────────────────────────────────── */
  function initEvaluate() {
    var btn       = document.getElementById('btn-evaluate');
    var textarea  = document.getElementById('eval-textarea');
    var resultsEl = document.getElementById('eval-results');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var essay = textarea ? textarea.value.trim() : '';
      if (!essay || countWords(essay) < 10) {
        if (textarea) textarea.focus();
        return;
      }

      /* Loading state */
      btn.disabled = true;
      btn.textContent = 'Analyzing\u2026';
      if (resultsEl) {
        resultsEl.innerHTML =
          '<div class="er-loading"><div class="er-spinner"></div>Analyzing your writing\u2026</div>';
        resultsEl.style.display = 'block';
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      var prompt = buildPrompt(getTaskType(), getQuestion(), essay);

      callEvaluate(prompt).then(function (result) {
        renderResults(result);
      }).catch(function (err) {
        var msg = err && err.message ? err.message : 'Unknown error';
        if (resultsEl) {
          resultsEl.innerHTML =
            '<div class="er-error"><strong>Error:</strong> ' + escapeHtml(msg) +
            '<br><small>Please try again.</small></div>';
        }
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = '✦\u2005Evaluate with AI';
      });
    });
  }

  /* ── Boot ───────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initWordCount();
    initEvaluate();
  });

})();
