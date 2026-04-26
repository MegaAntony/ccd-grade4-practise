/* ============================================
   CCD Quiz Engine
   Handles: loading questions, rendering UI,
   tracking answers, showing score
   ============================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────
  const state = {
    chapter: null,
    setId: null,
    questions: [],
    current: 0,
    score: 0,
    answered: false,
    responses: [],   // {correct: bool} per question
  };

  // ── DOM refs (populated after DOMContentLoaded) ──
  let dom = {};

  // ── Utility ────────────────────────────────
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function getParams() {
    const p = new URLSearchParams(window.location.search);
    return { chapter: parseInt(p.get('chapter'), 10), set: parseInt(p.get('set'), 10) };
  }

  function getChapterDataVar(chNum) {
    const map = {
      8: 'CHAPTER08_DATA', 9: 'CHAPTER09_DATA', 10: 'CHAPTER10_DATA',
      11: 'CHAPTER11_DATA', 12: 'CHAPTER12_DATA', 13: 'CHAPTER13_DATA',
      14: 'CHAPTER14_DATA', 15: 'CHAPTER15_DATA',
    };
    return map[chNum];
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const LETTERS = ['A', 'B', 'C', 'D'];

  // ── Init ───────────────────────────────────
  async function init() {
    const params = getParams();
    if (!params.chapter || !params.set) {
      showError('Missing quiz parameters. Please return to the chapter page.');
      return;
    }

    state.chapter = params.chapter;
    state.setId = params.set;

    // Load question data script
    const scriptPath = `js/questions/chapter${String(params.chapter).padStart(2, '0')}.js`;
    try {
      await loadScript(scriptPath);
    } catch (e) {
      showError(`Could not load questions for Chapter ${params.chapter}.`);
      return;
    }

    const varName = getChapterDataVar(params.chapter);
    const data = window[varName];
    if (!data) {
      showError(`Question data not found for Chapter ${params.chapter}.`);
      return;
    }

    const setData = data.sets.find(s => s.id === params.set);
    if (!setData) {
      showError(`Exam set ${params.set} not found.`);
      return;
    }

    state.questions = setData.questions;

    // Update page meta
    document.title = `${setData.title} – CCD Grade 4`;
    qs('.quiz-chapter-title').textContent = `Chapter ${params.chapter}: ${data.title}`;
    qsa('.quiz-set-title').forEach(el => { el.textContent = setData.title; });
    qs('.quiz-set-title-bc').textContent = setData.title;
    qs('.quiz-total-label').textContent = state.questions.length;

    // Breadcrumb
    qs('.bc-index').href = 'index.html';
    qs('.bc-chapter').href = `chapter.html?id=${params.chapter}`;
    qs('.bc-chapter').textContent = `Chapter ${params.chapter}`;

    // Hide loading, show quiz
    qs('.loading').style.display = 'none';
    qs('.quiz-container').style.display = 'block';

    renderQuestion();
  }

  // ── Render ─────────────────────────────────
  function renderQuestion() {
    const q = state.questions[state.current];
    const idx = state.current;
    const total = state.questions.length;

    // Progress
    const pct = Math.round((idx / total) * 100);
    qs('.quiz-progress-bar-fill').style.width = pct + '%';
    qs('.quiz-progress-label').textContent = `Question ${idx + 1} of ${total}`;

    // Question meta
    qs('.q-number').textContent = `Q${idx + 1}`;

    // Question text
    qs('.question-text').textContent = q.q;

    // Options
    const list = qs('.options-list');
    list.innerHTML = '';
    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.index = i;
      btn.innerHTML = `<span class="option-letter">${LETTERS[i]}</span><span class="option-text">${opt}</span>`;
      btn.addEventListener('click', () => handleAnswer(i));
      li.appendChild(btn);
      list.appendChild(li);
    });

    // Reset feedback
    const fb = qs('.feedback-block');
    fb.className = 'feedback-block';
    fb.innerHTML = '';

    // Hide Next button
    qs('.btn-next').classList.remove('visible');
    qs('.btn-next').textContent = idx + 1 < total ? 'Next Question →' : 'See My Score';

    state.answered = false;
  }

  function handleAnswer(selectedIdx) {
    if (state.answered) return;
    state.answered = true;

    const q = state.questions[state.current];
    const correct = q.correct;
    const isRight = selectedIdx === correct;

    if (isRight) state.score++;
    state.responses.push({ correct: isRight });

    // Style buttons
    const btns = qsa('.option-btn');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct && i === selectedIdx) btn.classList.add('correct');
      else if (i === selectedIdx) btn.classList.add('wrong');
      else if (i === correct) btn.classList.add('reveal');
    });

    // Feedback
    const fb = qs('.feedback-block');
    fb.className = 'feedback-block visible ' + (isRight ? 'correct-fb' : 'wrong-fb');
    fb.innerHTML = `
      <div class="feedback-result">
        <span>${isRight ? '✅' : '❌'}</span>
        <span>${isRight ? 'Correct!' : 'Not quite.'}</span>
      </div>
      ${!isRight ? `<div>The correct answer is <strong>${LETTERS[correct]}. ${q.options[correct]}</strong></div>` : ''}
      <div class="feedback-ref"><strong>Reference:</strong> ${q.ref}</div>
    `;

    // Show Next
    const nextBtn = qs('.btn-next');
    nextBtn.textContent = state.current + 1 < state.questions.length ? 'Next Question →' : 'See My Score →';
    nextBtn.classList.add('visible');
  }

  function handleNext() {
    state.current++;
    if (state.current >= state.questions.length) {
      showScore();
    } else {
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Score Screen ───────────────────────────
  function showScore() {
    qs('.quiz-container').style.display = 'none';
    const ss = qs('.score-screen');
    ss.classList.add('visible');

    const total = state.questions.length;
    const score = state.score;
    const pct = Math.round((score / total) * 100);
    const wrong = total - score;

    // Trophy / grade
    let trophy = '🏆', message = '', grade = '';
    if (pct >= 90) {
      trophy = '🏆'; grade = 'high';
      message = 'Excellent work! You have a strong understanding of this lesson. God bless your studies!';
    } else if (pct >= 70) {
      trophy = '⭐'; grade = 'high';
      message = 'Great job! You know this material well. Keep studying to reach perfection!';
    } else if (pct >= 50) {
      trophy = '📖'; grade = 'mid';
      message = 'Good effort! Review the lesson again and try another exam to improve your score.';
    } else {
      trophy = '🙏'; grade = 'low';
      message = 'Keep practicing! Read through the lesson once more and try again. God is with you!';
    }

    qs('.score-trophy').textContent = trophy;
    qs('.score-number').textContent = score;
    qs('.score-outof').textContent = `out of ${total}`;
    qs('.score-circle').className = `score-circle ${grade}`;
    qs('.score-percent').textContent = `${pct}%`;
    qs('.score-message').textContent = message;

    // Breakdown
    qs('.bd-correct').textContent = score;
    qs('.bd-wrong').textContent = wrong;
    qs('.bd-percent').textContent = `${pct}%`;

    // Chapter / back links
    const chNum = state.chapter;
    qs('.btn-retry').onclick = () => { window.location.reload(); };
    qs('.btn-chapter-back').href = `chapter.html?id=${chNum}`;
    qs('.btn-home').href = 'index.html';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError(msg) {
    const el = qs('.loading');
    if (el) el.innerHTML = `<div style="color:#dc2626;font-weight:600;">${msg}</div>`;
  }

  // ── Bootstrap ──────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    qs('.btn-next')?.addEventListener('click', handleNext);
    init();
  });

})();
