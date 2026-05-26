// ═══ Kanji Adventure - Main App ═══
// Phase 2: Home + Detail screens

let APP_STATE = {
  master: null,
  svgs: null,
  drills: null,
  currentGrade: 1,
  currentTheme: null,
  currentKanji: null,
  completedKanji: new Set(),  // session-only, resets on reload
  themesList: ['Numbers','Nature','Animals','Body','School','People','Town','Time','Colors','Action'],
};

// ═══ DATA LOADING ═══
async function loadData() {
  const msgEl = document.getElementById('loading-message');
  try {
    msgEl.textContent = 'Loading kanji data...';
    const masterRes = await fetch('data/kanji-master.json');
    if (!masterRes.ok) throw new Error(`Master data: HTTP ${masterRes.status}`);
    APP_STATE.master = await masterRes.json();
    
    msgEl.textContent = 'Loading stroke order...';
    const svgsRes = await fetch('data/kanjivg-svgs.json');
    if (!svgsRes.ok) throw new Error(`SVG data: HTTP ${svgsRes.status}`);
    APP_STATE.svgs = await svgsRes.json();
    
    msgEl.textContent = 'Loading drills...';
    const drillsRes = await fetch('data/drills.json');
    if (!drillsRes.ok) throw new Error(`Drill data: HTTP ${drillsRes.status}`);
    APP_STATE.drills = await drillsRes.json();
    
    // Verify Kanji Canvas patterns loaded
    if (typeof KanjiCanvas !== 'undefined' && KanjiCanvas.refPatterns) {
      console.log(`✓ Offline recognition patterns: ${KanjiCanvas.refPatterns.length}`);
    }
    
    msgEl.textContent = 'Ready!';
    console.log(`✓ Loaded ${Object.keys(APP_STATE.master).length} kanji`);
    return true;
  } catch (e) {
    console.error('Data load failed:', e);
    document.getElementById('error-message').textContent = 
      `Could not load data: ${e.message}. Please check your connection and refresh.`;
    return false;
  }
}

// ═══ NAVIGATION ═══
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

// ═══ HOME SCREEN ═══
function renderThemeTabs() {
  const container = document.getElementById('theme-tabs');
  container.innerHTML = '';
  APP_STATE.themesList.forEach((theme, idx) => {
    const btn = document.createElement('button');
    btn.className = 'theme-tab' + (theme === APP_STATE.currentTheme ? ' active' : '');
    btn.textContent = theme;
    btn.dataset.theme = theme;
    btn.addEventListener('click', () => {
      APP_STATE.currentTheme = theme;
      renderThemeTabs();
      renderKanjiGrid();
    });
    container.appendChild(btn);
  });
  // 「All」ボタン（左端）
  if (!APP_STATE.currentTheme) {
    // no theme selected = show all
  }
}

function renderKanjiGrid() {
  const grid = document.getElementById('kanji-grid');
  grid.innerHTML = '';
  
  const entries = Object.entries(APP_STATE.master).filter(([k, v]) => {
    if (v.grade !== APP_STATE.currentGrade) return false;
    if (APP_STATE.currentTheme && v.theme !== APP_STATE.currentTheme) return false;
    return true;
  });

  entries.forEach(([kanji, data]) => {
    const cell = document.createElement('div');
    cell.className = 'kanji-cell' + (APP_STATE.completedKanji.has(kanji) ? ' done' : '');
    cell.textContent = kanji;
    cell.addEventListener('click', () => openDetail(kanji));
    grid.appendChild(cell);
  });
  
  renderProgress();
}

function renderProgress() {
  const total = Object.values(APP_STATE.master).filter(v => v.grade === APP_STATE.currentGrade).length;
  const done = Array.from(APP_STATE.completedKanji).filter(k => 
    APP_STATE.master[k] && APP_STATE.master[k].grade === APP_STATE.currentGrade
  ).length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${total} kanji learned`;
}

function setupGradeTabs() {
  document.querySelectorAll('.grade-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.grade-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      APP_STATE.currentGrade = parseInt(tab.dataset.grade);
      APP_STATE.currentTheme = null;
      renderThemeTabs();
      renderKanjiGrid();
    });
  });
}

// ═══ DETAIL SCREEN ═══
function openDetail(kanji) {
  APP_STATE.currentKanji = kanji;
  const data = APP_STATE.master[kanji];
  
  document.getElementById('detail-nav-kanji').textContent = kanji;
  document.getElementById('detail-meaning').textContent = data.meaning_en;
  document.getElementById('detail-on').textContent = data.on_yomi || '—';
  document.getElementById('detail-kun').textContent = data.kun_yomi || '—';
  document.getElementById('detail-strokes').textContent = data.strokes + (data.strokes === 1 ? ' stroke' : ' strokes');
  document.getElementById('detail-grade').textContent = 'Grade ' + data.grade;
  document.getElementById('detail-ex1-jp').textContent = data.ex1_jp;
  document.getElementById('detail-ex1-en').textContent = data.ex1_en;
  document.getElementById('detail-ex2-jp').textContent = data.ex2_jp;
  document.getElementById('detail-ex2-en').textContent = data.ex2_en;
  
  renderStrokeSVG(kanji);
  clearCanvas('detail-canvas');
  document.getElementById('detail-ocr-result').textContent = '';
  document.getElementById('detail-ocr-result').className = 'ocr-result';
  
  setupSpeechButtons();
  showScreen('detail');
}

function renderStrokeSVG(kanji) {
  const container = document.getElementById('stroke-svg-container');
  const svgRaw = APP_STATE.svgs[kanji];
  if (!svgRaw) {
    container.innerHTML = '<div style="color:var(--soft);">SVG not available</div>';
    return;
  }
  
  // Parse the SVG and extract stroke paths
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgRaw, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) {
    container.innerHTML = svgRaw;
    return;
  }
  
  // Set responsive sizing
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('viewBox', '0 0 109 109');
  
  // Find all stroke paths (in StrokePaths group)
  const paths = svg.querySelectorAll('path');
  
  // Remove text/StrokeNumbers groups from KanjiVG (we'll add our own)
  svg.querySelectorAll('g').forEach(g => {
    const id = g.getAttribute('id') || '';
    if (id.includes('StrokeNumbers')) g.remove();
  });
  
  // Add numbered badges at the start of each stroke
  const ns = 'http://www.w3.org/2000/svg';
  paths.forEach((path, i) => {
    const len = path.getTotalLength();
    path.style.setProperty('--len', len);
    path.dataset.strokeIdx = i;
    
    // Get start point of stroke
    const startPt = path.getPointAtLength(0);
    
    // Create number badge
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'stroke-num');
    g.setAttribute('data-num-for', i);
    
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', startPt.x);
    circle.setAttribute('cy', startPt.y);
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', 'var(--accent)');
    g.appendChild(circle);
    
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', startPt.x);
    text.setAttribute('y', startPt.y + 1.5);
    text.setAttribute('font-size', '4.5');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-weight', '700');
    text.textContent = (i + 1).toString();
    g.appendChild(text);
    
    svg.appendChild(g);
  });
  
  container.innerHTML = '';
  container.appendChild(svg);
}

function animateStrokes() {
  const svg = document.querySelector('#stroke-svg-container svg');
  if (!svg) return;
  const paths = svg.querySelectorAll('path');
  
  // Hide number badges initially
  svg.querySelectorAll('.stroke-num').forEach(g => g.style.opacity = '0');
  
  // Reset all paths to invisible
  paths.forEach(p => {
    p.style.transition = 'none';
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
  
  // Force reflow
  void svg.offsetWidth;
  
  // Animate each path sequentially
  paths.forEach((path, i) => {
    setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 0.7s ease-out';
      path.style.strokeDashoffset = '0';
      // Show number when stroke starts
      const numG = svg.querySelector(`g[data-num-for="${i}"]`);
      if (numG) {
        numG.style.transition = 'opacity 0.3s';
        numG.style.opacity = '1';
      }
    }, i * 800);
  });
}

// ═══ CANVAS ═══
function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set proper size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3D3535';
  ctx.lineWidth = 4;
  
  let drawing = false;
  
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  }
  
  function start(e) {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end(e) {
    drawing = false;
  }
  
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);
}

function clearCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ═══ INIT ═══
async function init() {
  const ok = await loadData();
  if (!ok) {
    showScreen('error');
    return;
  }
  
  // Transition from loading to home
  setTimeout(() => {
    showScreen('home');
    showWelcomeIfFirstVisit();
  }, 300);
  
  setupGradeTabs();
  renderThemeTabs();
  renderKanjiGrid();
  
  // Back buttons
  document.querySelectorAll('.btn-back').forEach(b => {
    b.addEventListener('click', () => showScreen(b.dataset.target));
  });
  
  // Animate buttons
  document.getElementById('btn-animate').addEventListener('click', animateStrokes);
  document.getElementById('btn-replay').addEventListener('click', animateStrokes);
  
  // Clear canvas
  document.getElementById('btn-clear-detail').addEventListener('click', () => {
    clearCanvas('detail-canvas');
    document.getElementById('detail-ocr-result').textContent = '';
    document.getElementById('detail-ocr-result').className = 'ocr-result';
  });
  
  // Prev/Next kanji navigation
  document.getElementById('prev-kanji').addEventListener('click', () => navigateKanji(-1));
  document.getElementById('next-kanji').addEventListener('click', () => navigateKanji(1));
  
  // Setup detail canvas
  setupCanvas('detail-canvas');
  
  // Drills button handler is set in Phase 3 drill section below
}

function navigateKanji(direction) {
  const entries = Object.entries(APP_STATE.master).filter(([k, v]) => {
    if (v.grade !== APP_STATE.currentGrade) return false;
    if (APP_STATE.currentTheme && v.theme !== APP_STATE.currentTheme) return false;
    return true;
  });
  const keys = entries.map(([k]) => k);
  const idx = keys.indexOf(APP_STATE.currentKanji);
  if (idx === -1) return;
  const newIdx = (idx + direction + keys.length) % keys.length;
  openDetail(keys[newIdx]);
}

document.addEventListener('DOMContentLoaded', init);

// ═══════════════════════════════════
// PHASE 3: DRILL LOGIC
// ═══════════════════════════════════

let DRILL_STATE = {
  type: null,        // '読み' / '書き' / '応用'
  course: null,      // e.g. 'G1_Nature'
  questions: [],     // current question list
  qIndex: 0,
  answers: [],       // {qIndex, correct, userAnswer}
  retryMode: false,  // true when retrying wrong questions
  wrongQueue: [],
};

// Drill button (override placeholder)
document.getElementById('btn-drills').addEventListener('click', () => {
  openDrillSelect('読み');  // default to reading drill
}, true);

function openDrillSelect(initialType) {
  DRILL_STATE.type = initialType || '読み';
  renderDrillTypes();
  renderCourses();
  showScreen('drill-select');
}

function renderDrillTypes() {
  document.querySelectorAll('.drill-type-card').forEach(c => {
    c.classList.toggle('active', c.dataset.type === DRILL_STATE.type);
  });
}

// Init drill type clicks
document.querySelectorAll('.drill-type-card').forEach(card => {
  card.addEventListener('click', () => {
    DRILL_STATE.type = card.dataset.type;
    renderDrillTypes();
    renderCourses();
  });
});

function renderCourses() {
  const grade = APP_STATE.currentGrade;
  const type = DRILL_STATE.type;
  const titleEl = document.getElementById('drill-courses-title');
  const typeMap = {'読み':'Reading Drill', '書き':'Writing Drill', '応用':'Application Drill'};
  titleEl.textContent = `${typeMap[type]} — Grade ${grade} Courses`;
  
  const grid = document.getElementById('drill-courses-grid');
  grid.innerHTML = '';
  
  // List themes that have questions for this grade
  const themes = APP_STATE.themesList;
  themes.forEach(theme => {
    const courseKey = `G${grade}_${theme}`;
    const courseData = APP_STATE.drills[type][courseKey];
    if (!courseData) return;
    
    const completionKey = `${type}_${courseKey}`;
    const isDone = APP_STATE.completedCourses?.has(completionKey) || false;
    
    const card = document.createElement('div');
    card.className = 'course-card' + (isDone ? ' done' : '');
    card.innerHTML = `
      <div class="course-card-text">
        <span class="course-card-name">${theme}</span>
        <span class="course-start">${isDone ? 'Completed ✓' : 'Start →'}</span>
      </div>
      ${isDone ? '<div class="course-done-mark">✓</div>' : ''}
    `;
    card.addEventListener('click', () => startCourse(courseKey));
    grid.appendChild(card);
  });
}

function startCourse(courseKey) {
  DRILL_STATE.course = courseKey;
  DRILL_STATE.originalQuestions = APP_STATE.drills[DRILL_STATE.type][courseKey];
  DRILL_STATE.questions = DRILL_STATE.originalQuestions.slice();
  DRILL_STATE.qIndex = 0;
  DRILL_STATE.answers = [];
  DRILL_STATE.firstPassAnswers = [];  // for display
  DRILL_STATE.retryMode = false;
  DRILL_STATE.wrongQueue = [];
  renderQuestion();
  showScreen('drill-question');
}

function renderQuestion() {
  const q = DRILL_STATE.questions[DRILL_STATE.qIndex];
  const total = DRILL_STATE.questions.length;
  const typeMap = {'読み':'Reading Drill', '書き':'Writing Drill', '応用':'Application Drill'};
  const themeName = DRILL_STATE.course.replace(/^G\d_/, '');
  
  document.getElementById('drill-q-title').textContent = 
    `${typeMap[DRILL_STATE.type]} — ${themeName} Q${DRILL_STATE.qIndex+1}/${total}`;
  document.getElementById('drill-progress-fill').style.width = 
    ((DRILL_STATE.qIndex / total) * 100) + '%';
  
  const body = document.getElementById('drill-q-body');
  
  if (DRILL_STATE.type === '読み') {
    renderReadingQuestion(body, q);
  } else if (DRILL_STATE.type === '書き') {
    renderWritingQuestion(body, q);
  } else if (DRILL_STATE.type === '応用') {
    renderApplicationQuestion(body, q);
  }
}

function renderReadingQuestion(body, q) {
  if (q.format === 'word') {
    body.innerHTML = `
      <div class="q-box">
        <div class="q-box-header">How do you read this word?</div>
        <div class="q-display">${q.display}</div>
        <div class="q-hint">💡 Hint: ${q.hint_en}</div>
      </div>
      <div class="q-draw-panel">
        <div class="q-draw-header">
          <span>✏️ Write the reading in hiragana</span>
          <button class="btn-clear" id="btn-clear-drill">Clear</button>
        </div>
        <canvas id="drill-canvas" width="800" height="280"></canvas>
      </div>
      <div id="q-feedback" class="q-feedback"></div>
      <div class="q-actions">
        <button class="btn-skip" id="btn-skip">Skip</button>
        <button class="btn-submit" id="btn-submit">Check Answer</button>
      </div>
    `;
  } else {
    // sentence format
    const sentenceWithTarget = q.sentence_jp.replace(
      q.kanji, `<span class="target">${q.kanji}</span>`
    );
    body.innerHTML = `
      <div class="q-box">
        <div class="q-box-header">Read the highlighted kanji</div>
        <div class="q-sentence-jp">${sentenceWithTarget}</div>
        <div class="q-sentence-en">${q.sentence_en}</div>
      </div>
      <div class="q-draw-panel">
        <div class="q-draw-header">
          <span>✏️ Write the reading in hiragana</span>
          <button class="btn-clear" id="btn-clear-drill">Clear</button>
        </div>
        <canvas id="drill-canvas" width="800" height="280"></canvas>
      </div>
      <div id="q-feedback" class="q-feedback"></div>
      <div class="q-actions">
        <button class="btn-skip" id="btn-skip">Skip</button>
        <button class="btn-submit" id="btn-submit">Check Answer</button>
      </div>
    `;
  }
  setupDrillCanvas();
  attachDrillActions(q);
}

function renderWritingQuestion(body, q) {
  if (q.format === 'word') {
    body.innerHTML = `
      <div class="q-box">
        <div class="q-box-header purple">Write this word in kanji</div>
        <div class="q-display purple">${q.display_kata}</div>
        <div class="q-hint">💡 Hint: ${q.hint_en}</div>
      </div>
      <div class="q-draw-panel purple">
        <div class="q-draw-header">
          <span>✏️ Write the kanji</span>
          <button class="btn-clear" id="btn-clear-drill">Clear</button>
        </div>
        <canvas id="drill-canvas" width="800" height="280"></canvas>
      </div>
      <div id="q-feedback" class="q-feedback"></div>
      <div class="q-actions">
        <button class="btn-skip" id="btn-skip">Skip</button>
        <button class="btn-submit purple" id="btn-submit">Check Answer</button>
      </div>
    `;
  } else {
    // sentence format: highlight katakana part
    const sentenceWithKata = q.sentence_jp_with_kata;
    body.innerHTML = `
      <div class="q-box">
        <div class="q-box-header purple">Write the katakana part in kanji</div>
        <div class="q-sentence-jp purple">${sentenceWithKata}</div>
        <div class="q-sentence-en">${q.sentence_en}</div>
      </div>
      <div class="q-draw-panel purple">
        <div class="q-draw-header">
          <span>✏️ Write the kanji</span>
          <button class="btn-clear" id="btn-clear-drill">Clear</button>
        </div>
        <canvas id="drill-canvas" width="800" height="280"></canvas>
      </div>
      <div id="q-feedback" class="q-feedback"></div>
      <div class="q-actions">
        <button class="btn-skip" id="btn-skip">Skip</button>
        <button class="btn-submit purple" id="btn-submit">Check Answer</button>
      </div>
    `;
  }
  setupDrillCanvas();
  attachDrillActions(q);
}

function renderApplicationQuestion(body, q) {
  const isK2E = q.direction === 'k2e';
  const promptText = isK2E ? 'What does this mean?' : 'Which kanji means this?';
  const displayClass = isK2E ? 'q-mc-kanji' : 'q-mc-english';
  
  let choicesHtml = '';
  q.choices.forEach((c, i) => {
    const labels = ['A','B','C','D'];
    const textClass = isK2E ? '' : 'kanji';
    choicesHtml += `
      <button class="choice-btn" data-choice="${c}" data-idx="${i}">
        <span class="choice-label">${labels[i]}</span>
        <span class="choice-text ${textClass}">${c}</span>
      </button>
    `;
  });
  
  body.innerHTML = `
    <div class="q-box">
      <div class="q-mc-display">
        <div class="q-mc-prompt">${promptText}</div>
        <div class="${displayClass}">${q.question}</div>
      </div>
    </div>
    <div class="q-mc-choices">${choicesHtml}</div>
    <div id="q-feedback" class="q-feedback"></div>
  `;
  
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleApplicationAnswer(q, btn.dataset.choice);
    });
  });
}

function setupDrillCanvas() {
  const canvas = document.getElementById('drill-canvas');
  if (!canvas) return;
  
  // Kanji Canvas で初期化（既存のsetupCanvasは使わない）
  if (typeof KanjiCanvas !== 'undefined') {
    // 子供向けに色を調整：単色ピンク系で番号も小さく
    const drillType = DRILL_STATE.type;
    const baseColor = drillType === '書き' ? '#7B5EA8' : '#3D3535'; // purple for writing, dark for reading
    KanjiCanvas.strokeColors = [
      baseColor, baseColor, baseColor, baseColor, baseColor,
      baseColor, baseColor, baseColor, baseColor, baseColor,
      baseColor, baseColor, baseColor, baseColor, baseColor,
      baseColor, baseColor, baseColor, baseColor, baseColor,
      baseColor, baseColor, baseColor, baseColor, baseColor,
      baseColor, baseColor, baseColor, baseColor, baseColor
    ];
    // ストローク番号を非表示にする（dataset属性で制御）
    canvas.dataset.strokeNumbers = 'false';
    
    KanjiCanvas.init('drill-canvas');
  } else {
    // フォールバック: 通常canvas
    setupCanvas('drill-canvas');
  }
  
  const clearBtn = document.getElementById('btn-clear-drill');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (typeof KanjiCanvas !== 'undefined') {
        KanjiCanvas.erase('drill-canvas');
      } else {
        clearCanvas('drill-canvas');
      }
      const fb = document.getElementById('q-feedback');
      fb.className = 'q-feedback';
      fb.textContent = '';
    });
  }
}

function attachDrillActions(q) {
  document.getElementById('btn-skip').addEventListener('click', () => {
    recordAnswer(q, false, '(skipped)');
    nextQuestion();
  });
  document.getElementById('btn-submit').addEventListener('click', () => {
    submitHandwriting(q);
  });
}

async function submitHandwriting(q) {
  const expectedAnswer = DRILL_STATE.type === '読み' 
    ? q.correct_hiragana 
    : q.correct_kanji;
  
  // Disable button during check
  const submitBtn = document.getElementById('btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';
  
  let isCorrect = false;
  let recognized = '';
  
  try {
    // Use offline Kanji Canvas recognition
    const recognitionResult = recognizeOffline('drill-canvas', expectedAnswer);
    recognized = recognitionResult.recognized;
    isCorrect = recognitionResult.isCorrect;
  } catch (e) {
    console.error('Recognition error:', e);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Check Answer';
    
    const feedback = document.getElementById('q-feedback');
    feedback.className = 'q-feedback wrong';
    feedback.innerHTML = `⚠️ Recognition failed. Try again or skip.`;
    return;
  }
  
  const feedback = document.getElementById('q-feedback');
  if (isCorrect) {
    feedback.className = 'q-feedback correct';
    feedback.textContent = `✓ Correct! "${recognized || expectedAnswer}" recognized → Next ▶`;
  } else {
    feedback.className = 'q-feedback wrong';
    feedback.textContent = `✗ Not quite — Correct answer: "${expectedAnswer}" (you wrote something like "${recognized}") → Continue ▶`;
  }
  
  recordAnswer(q, isCorrect, recognized);
  
  // Auto-advance after 2 seconds
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Check Answer';
    nextQuestion();
  }, 2200);
}

/**
 * オフライン手書き認識
 * Kanji Canvas + 拡張パターン（漢字240字 + ひらがな・カタカナ152字）使用
 */
function recognizeOffline(canvasId, expected) {
  // Check that Kanji Canvas is loaded
  if (typeof KanjiCanvas === 'undefined' || !KanjiCanvas.recognize) {
    throw new Error('Kanji Canvas not loaded');
  }
  
  // Check that strokes were recorded
  const strokes = KanjiCanvas['recordedPattern_' + canvasId];
  if (!strokes || strokes.length === 0) {
    return { isCorrect: false, recognized: '(nothing written)' };
  }
  
  // KanjiCanvas.recognize returns the top-10 candidates as space-separated string
  // when the canvas has no dataset.candidateList attribute
  const candidates = KanjiCanvas.recognize(canvasId);
  
  if (!candidates) {
    return { isCorrect: false, recognized: '(no candidates)' };
  }
  
  // candidates is like "山  川  田  ..."
  const candidateList = candidates.trim().split(/\s+/).filter(c => c.length > 0);
  
  // 認識成功判定：トップ5に正解が入っていれば正解とする（子ども向けに緩めに）
  const top5 = candidateList.slice(0, 5);
  const isCorrect = top5.includes(expected);
  
  // 認識結果は1位の候補
  const recognized = candidateList[0] || '(?)';
  
  return { isCorrect, recognized };
}

function handleApplicationAnswer(q, choice) {
  const isCorrect = choice === q.correct;
  
  // Highlight correct/wrong
  document.querySelectorAll('.choice-btn').forEach(btn => {
    if (btn.dataset.choice === q.correct) {
      btn.classList.add('correct');
    } else if (btn.dataset.choice === choice && !isCorrect) {
      btn.classList.add('wrong');
    }
    btn.disabled = true;
  });
  
  recordAnswer(q, isCorrect, choice);
  
  setTimeout(() => nextQuestion(), 1800);
}

function recordAnswer(q, correct, userAnswer) {
  DRILL_STATE.answers.push({
    qIndex: DRILL_STATE.qIndex,
    kanji: q.kanji,
    correct: correct,
    userAnswer: userAnswer,
    isRetry: DRILL_STATE.retryMode
  });
  if (!DRILL_STATE.retryMode) {
    DRILL_STATE.firstPassAnswers.push({
      kanji: q.kanji, correct: correct
    });
  }
  if (!correct && !DRILL_STATE.retryMode) {
    DRILL_STATE.wrongQueue.push(DRILL_STATE.qIndex);
  }
}

function nextQuestion() {
  DRILL_STATE.qIndex++;
  
  if (DRILL_STATE.qIndex < DRILL_STATE.questions.length) {
    renderQuestion();
  } else {
    // All questions done in this pass
    if (DRILL_STATE.retryMode) {
      // We were retrying; now check if we got everything right
      showResult();
    } else if (DRILL_STATE.wrongQueue.length > 0) {
      // Start retry mode for wrong ones
      enterRetryMode();
    } else {
      showResult();
    }
  }
}

function enterRetryMode() {
  DRILL_STATE.retryMode = true;
  // Build retry questions list from wrongQueue (referencing original questions)
  const retryQs = DRILL_STATE.wrongQueue.map(i => DRILL_STATE.originalQuestions[i]);
  DRILL_STATE.questions = retryQs;
  DRILL_STATE.qIndex = 0;
  DRILL_STATE.retryAnswers = [];
  alert(`Let's try the ${retryQs.length} question(s) you missed! 💪`);
  renderQuestion();
}

function showResult() {
  // Total based on original course (always 10)
  const totalQs = DRILL_STATE.originalQuestions.length;
  
  // For stamp eligibility: must have all original questions ultimately correct
  // (1st pass correct, OR initially wrong but corrected in retry)
  const allRetryCorrect = !DRILL_STATE.retryMode 
    ? DRILL_STATE.answers.every(a => a.correct)  // no retry was needed
    : (DRILL_STATE.answers.filter(a => a.isRetry).every(a => a.correct));
  
  const allCorrect = allRetryCorrect;
  
  // First-pass correct count for display
  const firstPassCorrect = DRILL_STATE.firstPassAnswers.filter(a => a.correct).length;
  
  const typeMap = {'読み':'Reading Drill', '書き':'Writing Drill', '応用':'Application Drill'};
  const themeName = DRILL_STATE.course.replace(/^G\d_/, '');
  document.getElementById('result-title').textContent = 
    `${typeMap[DRILL_STATE.type]} — ${themeName} ${allCorrect ? 'Complete!' : 'Finished'}`;
  
  const stampEl = document.getElementById('result-stamp');
  if (allCorrect) {
    stampEl.style.display = 'flex';
    document.getElementById('result-score').textContent = `${totalQs} / ${totalQs}`;
    // Mark course complete
    if (!APP_STATE.completedCourses) APP_STATE.completedCourses = new Set();
    APP_STATE.completedCourses.add(`${DRILL_STATE.type}_${DRILL_STATE.course}`);
    // Mark kanji as completed
    DRILL_STATE.originalQuestions.forEach(q => APP_STATE.completedKanji.add(q.kanji));
    spawnPetals();
  } else {
    stampEl.style.display = 'none';
    document.getElementById('result-score').textContent = `${firstPassCorrect} / ${totalQs}`;
  }
  
  showScreen('drill-result');
}

function spawnPetals() {
  const container = document.getElementById('result-petals');
  container.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.textContent = '🌸';
    petal.style.left = Math.random() * 100 + '%';
    petal.style.animationDelay = (Math.random() * 3) + 's';
    petal.style.animationDuration = (4 + Math.random() * 3) + 's';
    petal.style.fontSize = (12 + Math.random() * 16) + 'px';
    container.appendChild(petal);
  }
}

// Result screen buttons
document.getElementById('result-retry').addEventListener('click', () => {
  startCourse(DRILL_STATE.course);
});
document.getElementById('result-next').addEventListener('click', () => {
  showScreen('drill-select');
  renderCourses();
});

// Drill exit
document.getElementById('drill-q-exit').addEventListener('click', () => {
  if (confirm('Exit this drill? Your progress will be lost.')) {
    showScreen('drill-select');
  }
});

// ═══════════════════════════════════
// PHASE 4: Speech Synthesis (TTS)
// ═══════════════════════════════════
function speak(text, lang = 'ja-JP', btnEl = null) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.85;   // slightly slower for clarity
  utter.pitch = 1.0;
  utter.volume = 1.0;
  
  if (btnEl) {
    btnEl.classList.add('speaking');
    utter.onend = () => btnEl.classList.remove('speaking');
    utter.onerror = () => btnEl.classList.remove('speaking');
  }
  
  window.speechSynthesis.speak(utter);
}

// Attach speech to detail page buttons (called after openDetail)
function setupSpeechButtons() {
  const speakMain = document.getElementById('btn-speak');
  if (speakMain && !speakMain.dataset.bound) {
    speakMain.dataset.bound = 'true';
    speakMain.addEventListener('click', () => {
      const kanji = APP_STATE.currentKanji;
      const data = APP_STATE.master[kanji];
      // Read the kanji + its on-yomi + its meaning
      const text = `${kanji}。${data.kun_yomi || data.on_yomi}。`;
      speak(text, 'ja-JP', speakMain);
    });
  }
  
  document.querySelectorAll('.btn-speak-mini').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      const target = btn.dataset.target; // 'ex1' or 'ex2'
      const jpText = document.getElementById(`detail-${target}-jp`).textContent;
      speak(jpText, 'ja-JP', btn);
    });
  });
}

// ═══════════════════════════════════
// PHASE 4: Keyboard accessibility
// ═══════════════════════════════════
document.addEventListener('keydown', (e) => {
  const activeScreen = document.querySelector('.screen.active')?.id || '';
  
  // ESC: back to previous screen
  if (e.key === 'Escape') {
    if (activeScreen === 'screen-detail') {
      showScreen('home');
    } else if (activeScreen === 'screen-drill-select') {
      showScreen('home');
    } else if (activeScreen === 'screen-drill-question') {
      if (confirm('Exit this drill?')) showScreen('drill-select');
    } else if (activeScreen === 'screen-drill-result') {
      showScreen('drill-select');
      renderCourses();
    }
  }
  
  // Arrow keys for detail page navigation
  if (activeScreen === 'screen-detail') {
    if (e.key === 'ArrowLeft') navigateKanji(-1);
    if (e.key === 'ArrowRight') navigateKanji(1);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-animate')?.click();
    }
  }
});

// ═══════════════════════════════════
// PHASE 4: Welcome on first visit
// ═══════════════════════════════════
function showWelcomeIfFirstVisit() {
  // Use sessionStorage so it shows once per session (resets per spec)
  if (!sessionStorage.getItem('welcomed')) {
    sessionStorage.setItem('welcomed', 'true');
    // Small floating welcome - attach to home screen only
    const homeScreen = document.getElementById('screen-home');
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: absolute; top: 90px; left: 50%; transform: translateX(-50%);
      background: var(--accent); color: white; padding: 10px 20px;
      border-radius: 50px; font-weight: 700; font-size: 13px;
      box-shadow: 0 8px 24px rgba(232,118,138,0.4); z-index: 100;
      animation: welcomeSlide 0.5s ease-out;
    `;
    banner.textContent = '🌸 Welcome! Tap a kanji to learn it.';
    homeScreen.appendChild(banner);
    setTimeout(() => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 500);
    }, 3500);
  }
}

// Add welcome CSS keyframe dynamically
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes welcomeSlide {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}`;
document.head.appendChild(styleEl);
