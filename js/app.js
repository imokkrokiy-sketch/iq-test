// ===== Telegram WebApp init =====
const tg = window.Telegram ? window.Telegram.WebApp : null;
const API_URL = "https://63.250.59.63.sslip.io";
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#F4F7FE"); } catch (e) {}
}

// ===== State =====
let state = {
  questions: [],
  index: 0,
  results: [],
  timerInterval: null,
  timeLeft: 20,
  questionStartTime: 0,
};

function go(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function L(field) {
  if (typeof field === "string") return field;
  if (field && typeof field === "object") return field[currentLang] || field.kk || "";
  return "";
}

function renderCategories() {
  const grid = document.getElementById("catGrid");
  grid.innerHTML = "";
  const counts = { matrix: 0 };
  QUESTION_BANK.forEach(q => { counts[q.domain] = (counts[q.domain] || 0) + 1; });

  Object.entries(DOMAIN_INFO).forEach(([code, info]) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div class="row"><div class="ic"><svg width="18" height="18"><use href="#${info.icon}"/></svg></div></div>
      <div class="body">
        <div class="name">${L(info.name)}</div>
        <div class="meta">${counts[code] || 0} ${currentLang === "kk" ? "сұрақ" : "вопросов"}</div>
      </div>`;
    card.addEventListener("click", () => {
      state.selectedDomain = code;
      openAgeGate();
    });
    grid.appendChild(card);
  });
}

function renderGateChannels() {
  const wrap = document.getElementById("gateChannels");
  wrap.innerHTML = "";
  SPONSOR_CHANNELS.forEach(ch => {
    const row = document.createElement("div");
    row.className = "gate-channel";
    row.dataset.username = ch.username;
    row.innerHTML = `
      <div class="ch-icon"><svg width="17" height="17"><use href="#${ch.icon}"/></svg></div>
      <div class="ch-info">
        <div class="ch-name">${ch.name}</div>
        <div class="ch-meta">@${ch.username} · ${ch.members}</div>
      </div>
      <button class="ch-join" data-username="${ch.username}">${t("btn_join")}</button>`;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll(".ch-join").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/${username}`);
      } else {
        window.open(`https://t.me/${username}`, "_blank");
      }
      btn.textContent = t("joined");
      btn.classList.add("done");
    });
  });
}

let selectedAge = null;

function openAgeGate() {
  go("screen-age");
}

document.querySelectorAll(".age-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedAge = btn.dataset.age;
    startTest();
  });
});
document.getElementById("btnAgeBack")?.addEventListener("click", () => go("screen-start"));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TEST_LENGTH = 30; // сколько вопросов получает один пользователь за попытку

function pickStratifiedQuestions(bank, count) {
  // группируем по доменам
  const byDomain = {};
  bank.forEach(q => {
    const d = q.domain || "general";
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(q);
  });

  const domains = Object.keys(byDomain);
  domains.forEach(d => { byDomain[d] = shuffle(byDomain[d]); });

  // пропорциональное распределение: сколько вопросов брать из каждого домена
  const perDomain = Math.max(1, Math.floor(count / domains.length));
  let picked = [];

  domains.forEach(d => {
    picked = picked.concat(byDomain[d].slice(0, perDomain));
  });

  // если не набрали нужное количество (мало доменов/вопросов) — добираем случайно из остатка
  if (picked.length < count) {
    const pickedIds = new Set(picked.map(q => q.id));
    const remaining = shuffle(bank.filter(q => !pickedIds.has(q.id)));
    picked = picked.concat(remaining.slice(0, count - picked.length));
  }

  // если набрали больше — обрезаем
  picked = shuffle(picked).slice(0, Math.min(count, picked.length));

  // сортируем по возрастанию сложности, чтобы тест не был "рандомно скачущим"
  // но всё же не строго монотонно — лёгкая случайность внутри уровней
  return picked.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
}

const CATEGORY_TEST_LENGTH = 15;
const CATEGORY_TEST_TIME = 15 * 60;

function startTest() {
  if (state.selectedDomain) {
    const domainQuestions = shuffle(QUESTION_BANK.filter(q => q.domain === state.selectedDomain));
    state.questions = domainQuestions.slice(0, Math.min(CATEGORY_TEST_LENGTH, domainQuestions.length)).sort((a,b) => (a.difficulty||3)-(b.difficulty||3));
    state.overallTimeLeft = CATEGORY_TEST_TIME;
  } else {
    state.questions = pickStratifiedQuestions(QUESTION_BANK, TEST_LENGTH);
    state.overallTimeLeft = TOTAL_TEST_TIME;
  }
  state.index = 0;
  state.results = [];

  document.getElementById("qTotal").textContent = state.questions.length;
  go("screen-question");
  renderQuestion();
  startOverallTimer();
  saveTestProgress();
}

function renderQuestion() {
  const q = state.questions[state.index];
  document.getElementById("qCurrent").textContent = String(state.index + 1).padStart(2, "0");

  const pct = (state.index / state.questions.length) * 100;
  document.getElementById("qProgressFill").style.width = pct + "%";

  if (q.memorize) {
    startMemorizePhase(q);
  } else {
    renderQuestionBody(q);
  }
}

function startMemorizePhase(q) {
  const overlay = document.getElementById("memorizeOverlay");
  const body = document.getElementById("qBody");
  const content = document.getElementById("memorizeContent");
  const countdownEl = document.getElementById("memorizeCountdown");

  body.style.visibility = "hidden";
  overlay.style.display = "flex";
  content.textContent = L(q.memorize);

  const itemCount = (L(q.memorize).match(/,/g) || []).length + 1;
  let secondsLeft = Math.max(4, Math.min(10, itemCount * 2));
  countdownEl.textContent = secondsLeft;

  clearInterval(state.memorizeInterval);
  state.memorizeInterval = setInterval(() => {
    secondsLeft--;
    countdownEl.textContent = secondsLeft;
    if (secondsLeft <= 0) {
      clearInterval(state.memorizeInterval);
      overlay.style.display = "none";
      body.style.visibility = "visible";
      renderQuestionBody(q);
    }
  }, 1000);
}

function renderQuestionBody(q) {
  document.getElementById("qTag").textContent = q.tag ? L(q.tag) : L(DOMAIN_INFO[q.domain].name);
  document.getElementById("qText").textContent = L(q.text);

  const visualEl = document.getElementById("qVisual");
  if (q.svg) {
    visualEl.innerHTML = q.svg;
    visualEl.style.display = "flex";
  } else {
    visualEl.innerHTML = "";
    visualEl.style.display = "none";
  }

  const optWrap = document.getElementById("qOptions");
  optWrap.innerHTML = "";
  const letters = ["A", "B", "C", "D", "E", "F"];
  const optionList = q.options[currentLang] || q.options.kk;
  optionList.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.innerHTML = `<span class="letter">${letters[i]}</span>${opt}`;
    btn.addEventListener("click", () => selectOption(i));
    optWrap.appendChild(btn);
  });

  state.questionStartTime = Date.now();
}

const TOTAL_TEST_TIME = 30 * 60; // 30 минут на весь тест

function startOverallTimer() {
  clearInterval(state.overallTimerInterval);
  updateOverallTimerDisplay();
  state.overallTimerInterval = setInterval(() => {
    state.overallTimeLeft--;
    updateOverallTimerDisplay();
    saveTestProgress();
    if (state.overallTimeLeft <= 0) {
      clearInterval(state.overallTimerInterval);
      finishTest();
    }
  }, 1000);
}

function updateOverallTimerDisplay() {
  const el = document.querySelector(".timer");
  const span = document.getElementById("qTimer");
  if (!span) return;
  const m = Math.floor(state.overallTimeLeft / 60).toString().padStart(2, "0");
  const s = (state.overallTimeLeft % 60).toString().padStart(2, "0");
  span.textContent = `${m}:${s}`;
  if (el) el.classList.toggle("warn", state.overallTimeLeft <= 60);
}

function selectOption(selectedIndex) {
  const q = state.questions[state.index];
  const opts = document.querySelectorAll(".opt");
  opts.forEach(o => o.disabled = true);

  const isCorrect = selectedIndex === q.answerIndex;
  const timeTaken = (Date.now() - state.questionStartTime) / 1000;

  const typeMap = { "АЙНАЛЫМ": "rotation", "ПОЗИЦИЯ": "position", "ДӨҢГЕЛЕК": "wheel", "ПРОГРЕССИЯ": "progression" };
  const itemType = q.tag ? (typeMap[q.tag.kk] || "pattern") : "pattern";

  state.results.push({
    domain: q.domain,
    type: itemType,
    difficulty: q.difficulty,
    correct: isCorrect,
    timeTaken: Math.min(timeTaken, q.timeLimit),
    timeLimit: q.timeLimit,
  });

  if (selectedIndex >= 0) {
    opts[selectedIndex].classList.add("selected");
  }

  setTimeout(() => {
    state.index++;
    if (state.index < state.questions.length) {
      renderQuestion();
      saveTestProgress();
    } else {
      finishTest();
    }
  }, 500);
}

// ===============================================================
// IRT Scoring Engine (2PL, EAP-оценка способности theta)
// ===============================================================
// ЧЕСТНО: параметры заданий (a, b) сейчас ПРОВИЗОРНЫЕ — выведены
// из поля difficulty (1-5), НЕ откалиброваны на реальных ответах
// пользователей. Дискриминация (a) = 1.0 для всех заданий (нейтральный
// старт). Когда накопится статистика реальных ответов — эти параметры
// можно пересчитать логистической регрессией (item calibration),
// не меняя саму IRT-архитектуру ниже.
// ===============================================================

const IRT_A_DEFAULT = 1.0; // provisional discrimination
const IRT_C_GUESS = 1/6;   // вероятность угадывания (6 вариантов ответа A-F)

function difficultyToB(difficulty) {
  const d = difficulty || 3;
  return (d - 3) * 1.0; // маппинг difficulty(1..5) -> b на логит-шкале (-2..+2)
}

function prob3PL(theta, a, b, c) {
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// EAP (Expected A Posteriori) — байесовская оценка theta через квадратуру, 3PL с учётом угадывания
function eapTheta(responses, quadPoints = 61, thetaRange = [-4, 4]) {
  if (!responses.length) return { theta: 0, sem: 1.8 };

  const [lo, hi] = thetaRange;
  const step = (hi - lo) / (quadPoints - 1);
  const grid = [];
  for (let i = 0; i < quadPoints; i++) grid.push(lo + i * step);

  const likelihoods = grid.map(theta => {
    let L = 1.0;
    for (const { a, b, c, correct } of responses) {
      const p = prob3PL(theta, a, b, c);
      L *= correct ? p : (1 - p);
    }
    return L * normalPdf(theta);
  });

  const total = likelihoods.reduce((s, l) => s + l, 0) * step;
  if (total <= 0) return { theta: 0, sem: 1.8 };

  let eap = 0;
  for (let i = 0; i < grid.length; i++) eap += likelihoods[i] * grid[i];
  eap = (eap * step) / total;

  let variance = 0;
  for (let i = 0; i < grid.length; i++) variance += likelihoods[i] * Math.pow(grid[i] - eap, 2);
  variance = (variance * step) / total;

  return { theta: eap, sem: Math.sqrt(Math.max(variance, 0.0001)) };
}

// Маппинг доменов -> психометрические категории.
// "Logic" отдельно не выделяем: нет отдельного пула заданий, не
// пересекающегося с verbal/matrix. matrix = классические Raven-style
// абстрактные матрицы = Abstract Reasoning.
const DOMAIN_TO_CATEGORY = {
  matrix: { kk: "Абстрактілі ойлау", ru: "Абстрактное мышление" },
  cube: { kk: "Кеңістіктік ойлау", ru: "Пространственное мышление" },
  verbal: { kk: "Вербалды пайымдау", ru: "Вербальное мышление" },
  series: { kk: "Сандық пайымдау", ru: "Числовое мышление" },
  memory: { kk: "Жедел жады", ru: "Оперативная память" },
};

function calculateIQ(results) {
  if (!results.length) {
    return {
      iq: 100, sem: 15, percentile: 50, ci: [85, 115], theta: 0,
      types: {}, categoryScores: {}, strengths: [], weaknesses: [],
      avgResponseTimeRatio: null,
    };
  }

  const overallResponses = results.map(r => ({
    a: IRT_A_DEFAULT, b: difficultyToB(r.difficulty), c: IRT_C_GUESS, correct: !!r.correct,
  }));

  const { theta, sem } = eapTheta(overallResponses);
  const iq = Math.round(100 + 15 * theta);
  const clampedIQ = Math.max(55, Math.min(160, iq));
  const semIQ = Math.round(15 * sem * 10) / 10;
  const ci = [Math.round(clampedIQ - 1.96 * semIQ), Math.round(clampedIQ + 1.96 * semIQ)];
  const percentile = Math.max(1, Math.min(99, Math.round(0.5 * (1 + erf(theta / Math.sqrt(2))) * 100)));

  const byDomain = {};
  results.forEach(r => {
    const d = r.domain || "general";
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(r);
  });

  const categoryScores = {};
  for (const domain of Object.keys(byDomain)) {
    const domainResponses = byDomain[domain].map(r => ({
      a: IRT_A_DEFAULT, b: difficultyToB(r.difficulty), c: IRT_C_GUESS, correct: !!r.correct,
    }));
    const { theta: dTheta, sem: dSem } = eapTheta(domainResponses);
    categoryScores[domain] = {
      iq: Math.max(55, Math.min(160, Math.round(100 + 15 * dTheta))),
      theta: dTheta,
      sem: Math.round(15 * dSem * 10) / 10,
      itemCount: byDomain[domain].length,
      label: DOMAIN_TO_CATEGORY[domain] || { kk: domain, ru: domain },
    };
  }

  const strengths = [];
  const weaknesses = [];
  for (const domain of Object.keys(categoryScores)) {
    const diff = categoryScores[domain].theta - theta;
    if (diff > 0.4 && categoryScores[domain].itemCount >= 2) strengths.push(domain);
    if (diff < -0.4 && categoryScores[domain].itemCount >= 2) weaknesses.push(domain);
  }

  let totalRatio = 0, countRatio = 0;
  results.forEach(r => {
    if (r.timeLimit > 0) {
      totalRatio += Math.min(1, r.timeTaken / r.timeLimit);
      countRatio++;
    }
  });
  const avgResponseTimeRatio = countRatio > 0 ? Math.round((totalRatio / countRatio) * 100) : null;

  const types = {};
  for (const domain of Object.keys(categoryScores)) {
    types[domain] = Math.max(0, Math.min(100, Math.round(50 + categoryScores[domain].theta * 20)));
  }

  return {
    iq: clampedIQ, theta, sem: semIQ, ci, percentile,
    types, categoryScores, strengths, weaknesses, avgResponseTimeRatio,
    itemCount: results.length,
  };
}

const ANALYZE_STEPS_TEXT = {
  kk: [
    { name: "Жауаптар тексерілді", doing: "Тексерілуде…", done: "Аяқталды" },
    { name: "Үлгі рейтингі", doing: "Талдауда…", done: "Аяқталды" },
    { name: "IQ бағасы", doing: "Есептелуде…", done: "Аяқталды" },
  ],
  ru: [
    { name: "Ответы проверены", doing: "Проверяем…", done: "Завершено" },
    { name: "Рейтинг шаблона", doing: "Анализируем…", done: "Завершено" },
    { name: "Оценка IQ", doing: "Анализируем…", done: "Завершено" },
  ],
};
const ANALYZE_TITLE = { kk: "Жауаптарыңызды талдап жатырмыз…", ru: "Анализируем ваши ответы…" };
const ANALYZE_SUBTITLE = { kk: "Сіздің нәтижеңіз басқа қатысушылармен салыстырылуда…", ru: "Ваш результат сравнивается с другими участниками…" };
const ANALYZE_FOOTER = { kk: "Нәтижеңізді дайындап жатырмыз. Бұл бірнеше секунд уақыт алады.", ru: "Готовим ваш результат. Это займёт несколько секунд." };
const DIAL_CIRC = 502;

function runAnalyzingAnimation(onDone) {
  go("screen-analyzing");

  document.getElementById("analyzeTitle").textContent = ANALYZE_TITLE[currentLang] || ANALYZE_TITLE.ru;
  document.getElementById("analyzeSubtitle").textContent = ANALYZE_SUBTITLE[currentLang] || ANALYZE_SUBTITLE.ru;
  document.getElementById("analyzeFooter").textContent = ANALYZE_FOOTER[currentLang] || ANALYZE_FOOTER.ru;
  const texts = ANALYZE_STEPS_TEXT[currentLang] || ANALYZE_STEPS_TEXT.ru;

  const steps = [1, 2, 3].map(n => ({
    el: document.getElementById(`astep${n}`),
    nameEl: document.getElementById(`astep${n}Name`),
    statusEl: document.getElementById(`astep${n}Status`),
  }));

  steps.forEach((s, i) => {
    s.el.classList.remove("active", "done");
    s.nameEl.textContent = texts[i].name;
    s.statusEl.textContent = texts[i].doing;
  });
  steps[0].el.classList.add("active");

  const dial = document.getElementById("analyzeDial");
  const pctLabel = document.getElementById("analyzePct");
  dial.style.strokeDasharray = String(DIAL_CIRC);
  dial.style.strokeDashoffset = String(DIAL_CIRC);

  const totalMs = 15000;
  const stepMs = totalMs / 3;
  const start = Date.now();

  const progressTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(1, elapsed / totalMs);
    dial.style.strokeDashoffset = String(DIAL_CIRC * (1 - pct));
    pctLabel.textContent = Math.round(pct * 100) + "%";
    if (pct >= 1) clearInterval(progressTimer);
  }, 100);

  steps.forEach((s, i) => {
    setTimeout(() => {
      s.el.classList.remove("active");
      s.el.classList.add("done");
      s.statusEl.textContent = texts[i].done;
      if (steps[i + 1]) steps[i + 1].el.classList.add("active");
    }, stepMs * (i + 1));
  });

  setTimeout(() => {
    clearInterval(progressTimer);
    dial.style.strokeDashoffset = "0";
    pctLabel.textContent = "100%";
    onDone();
  }, totalMs);
}

async function finishTest() {
  document.getElementById("qProgressFill").style.width = "100%";
  clearTestProgress();

  runAnalyzingAnimation(async () => {
    const telegramId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

    if (!telegramId) {
      renderGateChannels();
      go("screen-gate");
      document.getElementById("gateError").style.display = "none";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/check-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: telegramId }),
      });
      const data = await res.json();

      if (data.subscribed) {
        await submitAndShowResult(telegramId);
        return;
      }
    } catch (e) {}

    renderGateChannels();
    go("screen-gate");
    document.getElementById("gateError").style.display = "none";
  });
}

async function submitAndShowResult(telegramId) {
  const username = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.username : null;
  const firstName = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.first_name : null;

  const scoring = calculateIQ(state.results);
  const correctCount = state.results.filter(r => r.correct).length;

  const payload = {
    telegram_id: telegramId,
    username: username,
    first_name: firstName,
    category: "full",
    score: correctCount,
    total: state.results.length,
    iq_score: scoring.iq,
    types: scoring.types,
    sem: scoring.sem,
    ci: scoring.ci,
    percentile: scoring.percentile,
    theta: scoring.theta,
    categoryScores: scoring.categoryScores,
    avgResponseTimeRatio: scoring.avgResponseTimeRatio,
    strengths: scoring.strengths,
    weaknesses: scoring.weaknesses,
    age: selectedAge,
  };
  window.__lastResultPayload = payload;

  try {
    const res = await fetch(`${API_URL}/submit-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showApiResult(payload);
    } else {
      renderGateChannels();
      go("screen-gate");
    }
  } catch (e) {
    renderGateChannels();
    go("screen-gate");
  }
}

document.getElementById("btnCheckSub").addEventListener("click", async () => {
  const btn = document.getElementById("btnCheckSub");
  const errBox = document.getElementById("gateError");
  btn.disabled = true;
  btn.textContent = t("checking");
  errBox.style.display = "none";

  const telegramId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

  if (!telegramId) {
    const demoScoring = calculateIQ(state.results.length ? state.results : [{type:"pattern",difficulty:3,correct:true,timeTaken:10,timeLimit:40}]);
    showLocalResult({
      iq_score: demoScoring.iq, types: demoScoring.types,
      ci: demoScoring.ci, percentile: demoScoring.percentile,
      theta: demoScoring.theta, categoryScores: demoScoring.categoryScores,
      avgResponseTimeRatio: demoScoring.avgResponseTimeRatio,
      strengths: demoScoring.strengths, weaknesses: demoScoring.weaknesses,
    });
    btn.disabled = false;
    btn.textContent = t("btn_check");
    return;
  }

  await submitAndShowResult(telegramId);
  btn.disabled = false;
  btn.textContent = t("btn_check");
});

const TYPE_LABELS = {
  pattern: { kk: "Логика", ru: "Логика" },
  rotation: { kk: "Кеңістік", ru: "Пространство" },
  position: { kk: "Позиция", ru: "Позиция" },
  wheel: { kk: "Есте сақтау", ru: "Память" },
  progression: { kk: "Прогрессия", ru: "Прогрессия" },
};

function renderDomainBars(types) {
  const wrap = document.getElementById("domainBars");
  if (!wrap) return;
  wrap.innerHTML = "";
  Object.keys(types).forEach(t => {
    const pct = types[t] || 0;
    const label = TYPE_LABELS[t] ? L(TYPE_LABELS[t]) : t;
    const row = document.createElement("div");
    row.className = "domain-row";
    row.innerHTML = `
      <div class="domain-label">${label}</div>
      <div class="domain-track"><div class="domain-fill" style="width:${pct}%"></div></div>
      <div class="domain-pct">· ${pct}%</div>`;
    wrap.appendChild(row);
  });
}

function iqToPercentile(iq) {
  // approximate normal distribution percentile for IQ (mean 100, sd 15)
  const z = (iq - 100) / 15;
  const p = 0.5 * (1 + erf(z / Math.sqrt(2)));
  return Math.max(1, Math.min(99, Math.round(p * 100)));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign * y;
}

function iqTierLabel(iq) {
  const tiers = {
    kk: [[130,"Данышпан деңгей"],[120,"Өте жоғары нәтиже"],[110,"Жоғары нәтиже"],[90,"Орташа нәтиже"],[0,"Дамып келеді"]],
    ru: [[130,"Гениальный уровень"],[120,"Очень высокий результат"],[110,"Высокий результат"],[90,"Средний результат"],[0,"Развивается"]],
  };
  const list = tiers[currentLang] || tiers.ru;
  for (const [min, label] of list) {
    if (iq >= min) return label;
  }
  return list[list.length - 1][1];
}

async function showApiResult(payload) {
  document.getElementById("resultCategory").textContent = currentLang === "kk" ? "🧠 Сіздің IQ нәтижеңіз" : "🧠 Ваш результат IQ";
  document.getElementById("resultScore").textContent = payload.iq_score;
  document.getElementById("resultBadgeText").textContent = iqTierLabel(payload.iq_score);

  const ciEl = document.getElementById("ciText");
  if (payload.ci && payload.ci.length === 2) {
    ciEl.textContent = currentLang === "kk"
      ? `Сенімділік аралығы: ${payload.ci[0]}–${payload.ci[1]}`
      : `Доверительный интервал: ${payload.ci[0]}–${payload.ci[1]}`;
  } else if (payload.sem) {
    ciEl.textContent = currentLang === "kk"
      ? `Сенімділік аралығы: ${payload.iq_score - payload.sem}–${payload.iq_score + payload.sem}`
      : `Доверительный интервал: ${payload.iq_score - payload.sem}–${payload.iq_score + payload.sem}`;
  } else {
    ciEl.textContent = "";
  }

  const swWrap = document.getElementById("strengthsWeaknesses");
  swWrap.innerHTML = "";
  (payload.strengths || []).forEach(d => {
    const label = DOMAIN_INFO[d] ? L(DOMAIN_INFO[d].name) : d;
    const row = document.createElement("div");
    row.className = "sw-row strength";
    row.innerHTML = `💪 ${currentLang === "kk" ? "Күшті жағы" : "Сильная сторона"}: ${label}`;
    swWrap.appendChild(row);
  });
  (payload.weaknesses || []).forEach(d => {
    const label = DOMAIN_INFO[d] ? L(DOMAIN_INFO[d].name) : d;
    const row = document.createElement("div");
    row.className = "sw-row weakness";
    row.innerHTML = `📈 ${currentLang === "kk" ? "Дамыту қажет" : "Стоит развивать"}: ${label}`;
    swWrap.appendChild(row);
  });

  const percentile = (typeof payload.percentile === "number") ? payload.percentile : iqToPercentile(payload.iq_score);
  document.getElementById("percentileSentence").textContent = currentLang === "kk"
    ? `Сіз қатысушылардың ${percentile}%-ынан жоғары нәтиже көрсеттіңіз.`
    : `Вы показали результат выше, чем ${percentile}% участников.`;

  renderDomainBars(payload.types || {});

  const rankLine = document.getElementById("rankLine");
  const rankValue = document.getElementById("rankValue");
  rankLine.style.display = "none";
  if (payload.telegram_id) {
    try {
      const res = await fetch(`${API_URL}/leaderboard?scope=overall&limit=1&telegram_id=${payload.telegram_id}`);
      const data = await res.json();
      if (data.your_rank) {
        rankValue.textContent = `#${data.your_rank}`;
        rankLine.style.display = "block";
      }
    } catch (e) {}
  }

  go("screen-result");
  requestAnimationFrame(() => {
    const dial = document.getElementById("resultDial");
    const pct = Math.min(payload.iq_score / 160, 1);
    setTimeout(() => { dial.style.strokeDashoffset = 502 - (502 * pct); }, 150);
  });
}

function showLocalResult(payload) {
  showApiResult({ ...payload, first_name: null });
}

document.getElementById("navHome")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  document.querySelector(".scroll-area").scrollTo({ top: 0, behavior: "smooth" });
});
function renderTestListGrid() {
  const grid = document.getElementById("testListGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const counts = {};
  QUESTION_BANK.forEach(q => { counts[q.domain] = (counts[q.domain] || 0) + 1; });

  Object.entries(DOMAIN_INFO).forEach(([code, info]) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div class="row"><div class="ic"><svg width="18" height="18"><use href="#${info.icon}"/></svg></div></div>
      <div class="body">
        <div class="name">${L(info.name)}</div>
        <div class="meta">${counts[code] || 0} ${currentLang === "kk" ? "сұрақ" : "вопросов"}</div>
      </div>`;
    card.addEventListener("click", () => {
      state.selectedDomain = code;
      openAgeGate();
    });
    grid.appendChild(card);
  });
}

function openTestListScreen() {
  go("screen-test-list");
  renderTestListGrid();
}

document.getElementById("testListBack")?.addEventListener("click", () => go("screen-start"));
document.getElementById("btnStartFullTest")?.addEventListener("click", () => {
  state.selectedDomain = null;
  openAgeGate();
});
document.getElementById("navHomeTestList")?.addEventListener("click", () => go("screen-start"));
document.getElementById("navRatingTestList")?.addEventListener("click", () => openRatingScreen());
document.getElementById("navMenuTestList")?.addEventListener("click", () => openMenuScreen());

document.getElementById("navTest")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openTestListScreen();
});
document.getElementById("navRating")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openRatingScreen();
});

document.getElementById("btnStartMain")?.addEventListener("click", () => {
  state.selectedDomain = null;
  openAgeGate();
});
document.getElementById("btnLeaderboardTop")?.addEventListener("click", () => {
  openRatingScreen();
});
document.getElementById("btnLeaderboard")?.addEventListener("click", () => {
  openRatingScreen();
});

document.getElementById("btnBack").addEventListener("click", () => {
  clearInterval(state.overallTimerInterval);
  clearTestProgress();
  state.selectedDomain = null;
  go("screen-start");
});
document.getElementById("btnAgain").addEventListener("click", () => {
  state.selectedDomain = null;
  go("screen-start");
});
document.getElementById("btnViewRating")?.addEventListener("click", () => openRatingScreen());
document.getElementById("btnShare").addEventListener("click", () => {
  if (tg && tg.openTelegramLink) {
    const text = encodeURIComponent(`Менің IQ ${document.getElementById("resultScore").textContent}! Сен жеңе аласың ба? 🧠`);
    tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/meniniqbot&text=${text}`);
  }
});

document.querySelectorAll(".lang-toggle button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-toggle button").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    currentLang = btn.dataset.lang;
    applyI18n();
    renderCategories();
    if (document.getElementById("screen-gate").classList.contains("active")) {
      renderGateChannels();
    }
  });
});

applyI18n();
renderCategories();

// ===== Rating screen =====
let currentRatingScope = "overall";

function medalColor(place) {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return place;
}

function personInitial(name) {
  const clean = (name || "").replace(/[#.\s]/g, "");
  const match = clean.match(/[a-zA-Zа-яА-ЯәғқңөұүhіӘҒҚҢӨҰҮІ]/);
  return match ? match[0].toUpperCase() : "★";
}

async function loadLeaderboard(scope) {
  currentRatingScope = scope;
  const podiumEl = document.getElementById("ratingPodium");
  const listEl = document.getElementById("ratingList");
  const youEl = document.getElementById("ratingYou");
  const emptyEl = document.getElementById("ratingEmpty");

  podiumEl.innerHTML = "";
  listEl.innerHTML = "";
  youEl.style.display = "none";
  emptyEl.style.display = "none";

  const telegramId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

  let data;
  try {
    const url = `${API_URL}/leaderboard?scope=${scope}&limit=50${telegramId ? `&telegram_id=${telegramId}` : ""}`;
    const res = await fetch(url);
    data = await res.json();
  } catch (e) {
    emptyEl.style.display = "block";
    return;
  }

  const entries = data.entries || [];
  if (entries.length === 0) {
    emptyEl.style.display = "block";
    return;
  }

  const top3 = entries.slice(0, 3);
  const order = [1, 0, 2]; // визуально: 2 место слева, 1 в центре, 3 справа
  const slotClass = { 0: "first", 1: "second", 2: "third" };

  order.forEach(idx => {
    const person = top3[idx];
    if (!person) return;
    const place = idx + 1;
    const slot = document.createElement("div");
    slot.className = `podium-slot ${slotClass[idx]}`;
    slot.innerHTML = `
      <div class="p-card">
        <div class="p-medal-badge">${place === 1 ? "👑" : place}</div>
        <div class="p-avatar"><span>${personInitial(person.first_name)}</span></div>
        <div class="p-name">${person.first_name || "Аноним"}</div>
        <div class="p-iq">IQ ${person.iq_score}</div>
      </div>
    `;
    podiumEl.appendChild(slot);
  });

  const rest = entries.slice(3);
  rest.forEach((person, i) => {
    const row = document.createElement("div");
    row.className = "rating-row";
    row.innerHTML = `
      <div class="r-place">${i + 4}</div>
      <div class="r-avatar"><span>${personInitial(person.first_name)}</span></div>
      <div class="r-name">${person.first_name || "Аноним"}</div>
      <div class="r-iq">IQ <b>${person.iq_score}</b></div>
    `;
    listEl.appendChild(row);
  });

  if (data.your_rank && data.your_score) {
    youEl.style.display = "flex";
    youEl.innerHTML = `
      <div class="ry-rank">
        <span class="ry-rank-label">${currentLang === "kk" ? "Орныңыз" : "Ваше место"}</span>
        <span class="ry-rank-num">${data.your_rank} <span class="ry-total">/ ${data.total}</span></span>
      </div>
      <div class="ry-avatar">${personInitial(tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.first_name : "?")}</div>
      <div class="ry-name"><span class="ry-you-tag">${currentLang === "kk" ? "Сіз" : "Вы"}</span></div>
      <div class="ry-iq">IQ ${data.your_score}</div>
    `;
  } else if (!telegramId) {
    youEl.style.display = "flex";
    youEl.innerHTML = `
      <div class="ry-rank">
        <span class="ry-rank-label">${currentLang === "kk" ? "Орныңыз" : "Ваше место"}</span>
        <span class="ry-rank-num">—</span>
      </div>
      <div class="ry-avatar">?</div>
      <div class="ry-name"><span class="ry-you-tag">${currentLang === "kk" ? "Telegram арқылы кіріңіз" : "Войдите через Telegram"}</span></div>
      <div class="ry-iq">—</div>
    `;
  }
}

function openRatingScreen() {
  go("screen-rating");
  loadLeaderboard("overall");
  document.querySelectorAll(".rating-tab").forEach(t => t.classList.remove("active"));
  document.querySelector('.rating-tab[data-scope="overall"]')?.classList.add("active");
}

document.getElementById("ratingBack")?.addEventListener("click", () => {
  go("screen-start");
});

document.querySelectorAll(".rating-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".rating-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    loadLeaderboard(tab.dataset.scope);
  });
});

document.getElementById("navHomeRating")?.addEventListener("click", () => go("screen-start"));
document.getElementById("navTestRating")?.addEventListener("click", () => openTestListScreen());

// ===== Menu screen =====
async function loadMenuData() {
  const menuNameEl = document.getElementById("menuName");
  const menuIqBadgeEl = document.getElementById("menuIqBadge");
  const menuPointsEl = document.getElementById("menuPoints");

  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  menuNameEl.textContent = tgUser && tgUser.first_name ? tgUser.first_name : (currentLang === "kk" ? "Аноним" : "Аноним");

  const telegramId = tgUser ? tgUser.id : null;
  if (!telegramId) {
    menuIqBadgeEl.textContent = "IQ —";
    menuPointsEl.textContent = "0";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/leaderboard?scope=overall&limit=1&telegram_id=${telegramId}`);
    const data = await res.json();
    menuIqBadgeEl.textContent = data.your_score ? `IQ ${data.your_score}` : "IQ —";
    menuPointsEl.textContent = "0"; // очки за баллы — будущая фича
  } catch (e) {
    menuIqBadgeEl.textContent = "IQ —";
    menuPointsEl.textContent = "0";
  }
}

function openMenuScreen() {
  go("screen-menu");
  loadMenuData();
  document.getElementById("menuLangValue").textContent = currentLang === "kk" ? "Қазақша" : "Русский";
}

document.getElementById("navMenu")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openMenuScreen();
});
document.getElementById("navMenuRating")?.addEventListener("click", () => openMenuScreen());
document.getElementById("navHomeMenu")?.addEventListener("click", () => go("screen-start"));
document.getElementById("navTestMenu")?.addEventListener("click", () => openTestListScreen());
document.getElementById("navRatingMenu")?.addEventListener("click", () => openRatingScreen());

document.querySelectorAll('.menu-row[data-stub="1"]').forEach(row => {
  row.addEventListener("click", () => {
    row.style.opacity = "0.5";
    setTimeout(() => { row.style.opacity = "1"; }, 200);
  });
});

document.getElementById("menuLangRow")?.addEventListener("click", () => {
  currentLang = currentLang === "kk" ? "ru" : "kk";
  document.getElementById("menuLangValue").textContent = currentLang === "kk" ? "Қазақша" : "Русский";
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle("on", b.dataset.lang === currentLang));
  if (typeof applyTranslations === "function") applyTranslations();
});

document.getElementById("menuLogoutBtn")?.addEventListener("click", () => {
  go("screen-start");
});

// ===== Dark mode =====
function applyDarkMode(enabled) {
  document.body.classList.toggle("dark", enabled);
  const toggle = document.getElementById("menuDarkToggle");
  if (toggle) toggle.checked = enabled;
  try { localStorage.setItem("iqbot_dark", enabled ? "1" : "0"); } catch (e) {}
}

(function initDarkMode() {
  let saved = "0";
  try { saved = localStorage.getItem("iqbot_dark") || "0"; } catch (e) {}
  applyDarkMode(saved === "1");
})();

document.getElementById("menuDarkToggle")?.addEventListener("change", (e) => {
  applyDarkMode(e.target.checked);
});

// ===== Persistence: resume test progress + last screen =====
const PROGRESS_KEY = "iqbot_test_progress";
const LAST_SCREEN_KEY = "iqbot_last_screen";
const SIMPLE_RESUMABLE_SCREENS = ["screen-start", "screen-rating", "screen-menu"];

const PROGRESS_EXPIRY_MS = 10 * 60 * 1000; // 10 минут

function saveTestProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      questionIds: state.questions.map(q => q.id),
      index: state.index,
      results: state.results,
      selectedAge: selectedAge,
      selectedDomain: state.selectedDomain || null,
      bankLen: QUESTION_BANK.length,
      testLen: TEST_LENGTH,
      overallTimeLeft: state.overallTimeLeft,
      savedAt: Date.now(),
    }));
  } catch (e) {}
}

function clearTestProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
}

function saveLastScreen(id) {
  if (SIMPLE_RESUMABLE_SCREENS.includes(id)) {
    try { localStorage.setItem(LAST_SCREEN_KEY, id); } catch (e) {}
  }
}

const _origGo = go;
go = function(id) {
  _origGo(id);
  saveLastScreen(id);
};

function tryResumeOnLoad() {
  let saved = null;
  try { saved = localStorage.getItem(PROGRESS_KEY); } catch (e) {}

  if (saved) {
    try {
      const data = JSON.parse(saved);
      const restoredQuestions = data.questionIds
        .map(id => QUESTION_BANK.find(q => q.id === id))
        .filter(Boolean);

      const bankMatches = data.bankLen === QUESTION_BANK.length && data.testLen === TEST_LENGTH;
      const notExpired = typeof data.savedAt === "number" && (Date.now() - data.savedAt) < PROGRESS_EXPIRY_MS;

      if (bankMatches && notExpired && restoredQuestions.length === data.questionIds.length && data.index < restoredQuestions.length) {
        state.questions = restoredQuestions;
        state.index = data.index;
        state.results = data.results || [];
        selectedAge = data.selectedAge;
        state.selectedDomain = data.selectedDomain || null;
        state.overallTimeLeft = (typeof data.overallTimeLeft === "number" && data.overallTimeLeft > 0) ? data.overallTimeLeft : TOTAL_TEST_TIME;
        document.getElementById("qTotal").textContent = state.questions.length;
        go("screen-question");
        renderQuestion();
        startOverallTimer();
        return;
      }
    } catch (e) {}
    clearTestProgress();
  }

  let lastScreen = null;
  try { lastScreen = localStorage.getItem(LAST_SCREEN_KEY); } catch (e) {}

  if (lastScreen && SIMPLE_RESUMABLE_SCREENS.includes(lastScreen) && lastScreen !== "screen-start") {
    go(lastScreen);
    if (lastScreen === "screen-rating") openRatingScreen();
    if (lastScreen === "screen-menu") { loadMenuData(); document.getElementById("menuLangValue").textContent = currentLang === "kk" ? "Қазақша" : "Русский"; }
  }
}

tryResumeOnLoad();
