// ===== Принудительная проверка версии (защита от устаревшего кэша Telegram WebView) =====
(function checkBuildVersion() {
  const CURRENT_BUILD_VERSION = "90";
  const metaTag = document.querySelector('meta[name="build-version"]');
  const htmlVersion = metaTag ? metaTag.getAttribute("content") : null;

  if (htmlVersion && htmlVersion !== CURRENT_BUILD_VERSION) {
    // HTML новее, чем этот JS — значит JS закэширован устаревшим. Форсируем reload.
    const alreadyReloaded = sessionStorage.getItem("forcedReloadFor");
    if (alreadyReloaded !== htmlVersion) {
      sessionStorage.setItem("forcedReloadFor", htmlVersion);
      window.location.reload(true);
    }
  }
})();

// ===== Telegram WebApp init =====
const tg = window.Telegram ? window.Telegram.WebApp : null;
const API_URL = "https://api.meniniq.online";

function logEvent(eventType) {
  const telegramId = getTelegramId();
  fetch(`${API_URL}/log-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_id: telegramId, event_type: eventType }),
  }).catch(() => {});
}
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#F4F7FE"); } catch (e) {}
}

function getTelegramId() {
  return (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user.id : null;
}

// На некоторых устройствах/версиях Telegram initDataUnsafe.user заполняется
// с небольшой задержкой после tg.ready(). Пробуем несколько раз перед тем,
// как считать telegramId недоступным.
async function getTelegramIdWithRetry(maxAttempts = 5, delayMs = 300) {
  for (let i = 0; i < maxAttempts; i++) {
    const id = getTelegramId();
    if (id) return id;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
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
  const scrollArea = document.getElementById(id).querySelector(".scroll-area");
  if (scrollArea) scrollArea.scrollTop = 0;
  window.scrollTo(0, 0);
  setTimeout(updateScrollHint, 80);
}

// ===== Плавающая кнопка "прокрутить вниз" =====
function getActiveScrollEl() {
  const active = document.querySelector(".screen.active");
  if (!active) return null;
  const candidates = [active, ...active.querySelectorAll("*")];
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight - el.clientHeight > 30) {
      return el;
    }
  }
  return null;
}

function updateScrollHint() {
  const btn = document.getElementById("scrollHintBtn");
  if (!btn) return;
  const el = getActiveScrollEl();
  if (!el) {
    btn.classList.remove("visible");
    return;
  }
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (distanceToBottom > 40) {
    btn.classList.add("visible");
  } else {
    btn.classList.remove("visible");
  }
}

document.addEventListener("scroll", updateScrollHint, true);
window.addEventListener("resize", updateScrollHint);
setInterval(updateScrollHint, 700);

document.getElementById("scrollHintBtn").addEventListener("click", () => {
  const el = getActiveScrollEl();
  if (el) {
    el.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" });
  }
});

function L(field) {
  if (typeof field === "string") return field;
  if (field && typeof field === "object") return field[currentLang] || field.kk || "";
  return "";
}

async function loadHomePodium() {
  const el = document.getElementById("homePodium");
  if (!el) return;
  try {
    const res = await fetch(`${API_URL}/leaderboard?scope=overall&limit=3`);
    const data = await res.json();
    const entries = (data.entries || []).slice(0, 3);
    if (entries.length < 3) return; // недостаточно данных — оставляем пусто, не ломаем вёрстку
    const order = [1, 0, 2]; // 2 место слева, 1 в центре, 3 справа
    el.innerHTML = order.map(idx => {
      const person = entries[idx];
      const place = idx + 1;
      const isFirst = place === 1;
      const rankHtml = isFirst
        ? `<svg width="11" height="11"><use href="#ic-crown"/></svg>`
        : place;
      return `
        <div class="p${isFirst ? " first" : ""}">
          <div class="avatar"><span>${personInitial(person.first_name)}</span><span class="rank">${rankHtml}</span></div>
          <span class="pname">${person.first_name || "Аноним"}</span>
          <span class="piq">IQ ${person.iq_score}</span>
        </div>`;
    }).join("");
  } catch (e) {
    // тихо оставляем блок пустым при ошибке сети
  }
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

async function renderGateChannels() {
  const wrap = document.getElementById("gateChannels");
  wrap.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:14px 0;">...</div>`;

  let channels = [];
  try {
    const res = await fetch(`${API_URL}/channels`);
    const data = await res.json();
    channels = data.channels || [];
  } catch (e) {
    channels = [];
  }

  wrap.innerHTML = "";
  channels.forEach(ch => {
    const link = ch.invite_link || (ch.username ? `https://t.me/${ch.username}` : null);
    if (!link) return;
    const key = ch.username || (ch.chat_id != null ? String(ch.chat_id) : link);
    const row = document.createElement("div");
    row.className = "gate-channel";
    row.dataset.link = link;
    row.dataset.key = key;
    const metaText = ch.username ? `@${ch.username}` : "";
    row.innerHTML = `
      <div class="ch-icon"><svg width="17" height="17"><use href="#ic-megaphone"/></svg></div>
      <div class="ch-info">
        <div class="ch-name">${ch.display_name || ch.username || ""}</div>
        <div class="ch-meta">${metaText}</div>
      </div>
      <button class="ch-join" data-link="${link}" data-key="${key}">${t("btn_join")}</button>`;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll(".ch-join").forEach(btn => {
    btn.addEventListener("click", () => {
      const link = btn.dataset.link;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(link);
      } else {
        window.open(link, "_blank");
      }
      btn.textContent = t("joined");
      btn.classList.add("done");
    });
  });
}

function syncGateChannelsStatus(missingList) {
  const missingSet = new Set((missingList || []).map(String));
  document.querySelectorAll("#gateChannels .ch-join").forEach(btn => {
    const key = btn.dataset.key;
    if (missingSet.has(key)) {
      btn.classList.remove("done");
      btn.textContent = t("btn_join");
    } else {
      btn.classList.add("done");
      btn.textContent = t("joined");
    }
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

// Фиксированные квоты по доменам для основного теста (сумма = TEST_LENGTH = 30)
const DOMAIN_QUOTAS = {
  matrix: 10,  // абстрактное мышление
  cube: 3,     // пространственное
  verbal: 5,   // вербальное
  memory: 4,   // память
  series: 8,   // числовое
};

function pickStratifiedQuestions(bank, count, quotas) {
  const byDomain = {};
  bank.forEach(q => {
    const d = q.domain || "general";
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(q);
  });

  Object.keys(byDomain).forEach(d => { byDomain[d] = shuffle(byDomain[d]); });

  let picked = [];

  if (quotas) {
    Object.keys(quotas).forEach(d => {
      const available = byDomain[d] || [];
      picked = picked.concat(available.slice(0, quotas[d]));
    });
  } else {
    // fallback: равное распределение по доменам (старое поведение)
    const domains = Object.keys(byDomain);
    const perDomain = Math.max(1, Math.floor(count / domains.length));
    domains.forEach(d => {
      picked = picked.concat(byDomain[d].slice(0, perDomain));
    });
  }

  // если не набрали нужное количество — добираем случайно из остатка
  if (picked.length < count) {
    const pickedIds = new Set(picked.map(q => q.id));
    const remaining = shuffle(bank.filter(q => !pickedIds.has(q.id)));
    picked = picked.concat(remaining.slice(0, count - picked.length));
  }

  // если набрали больше — обрезаем
  picked = picked.slice(0, Math.min(count, picked.length));

  // хорошо перемешиваем вопросы разных доменов между собой
  return shuffle(picked);
}

const CATEGORY_TEST_LENGTH = 15;
const CATEGORY_TEST_TIME = 15 * 60;

function startTest() {
  logEvent("test_start");
  if (state.selectedDomain) {
    const domainQuestions = shuffle(QUESTION_BANK.filter(q => q.domain === state.selectedDomain));
    state.questions = domainQuestions.slice(0, Math.min(CATEGORY_TEST_LENGTH, domainQuestions.length)).sort((a,b) => (a.difficulty||3)-(b.difficulty||3));
    state.overallTimeLeft = CATEGORY_TEST_TIME;
  } else {
    state.questions = pickStratifiedQuestions(QUESTION_BANK, TEST_LENGTH, DOMAIN_QUOTAS);
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

const TOTAL_TEST_TIME = 15 * 60; // 15 минут на весь тест

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
const IRT_C_GUESS = 1/6;   // v1.0: оригинальные параметры
const SCORING_MODEL_VERSION = "1.0";

function difficultyToB(difficulty) {
  const d = difficulty || 3;
  return (d - 3) * 1.0; // v1.0: оригинальный множитель
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
  const iq = Math.round(100 + 15 * theta) - 10; // v1.4: сдвиг -10 для соответствия реальному среднему ~100
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
    const telegramId = await getTelegramIdWithRetry();

    if (!telegramId) {
      logEvent("gate_seen");
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

    logEvent("gate_seen");
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
    modelVersion: SCORING_MODEL_VERSION,
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
      logEvent("gate_subscribed");
      showApiResult(payload);
    } else {
      syncGateChannelsStatus(data.missing);
      go("screen-gate");
      const errBox = document.getElementById("gateError");
      if (errBox) {
        errBox.textContent = t("gate_error_text");
        errBox.style.display = "block";
      }
    }
  } catch (e) {
    renderGateChannels();
    go("screen-gate");
    const errBox = document.getElementById("gateError");
    if (errBox) {
      errBox.textContent = t("network_error") + " [DEBUG: " + (e && e.stack ? e.stack : String(e)) + "]";
      errBox.style.display = "block";
    }
  }
}

document.getElementById("btnCheckSub").addEventListener("click", async () => {
  logEvent("gate_click_subscribe");
  const btn = document.getElementById("btnCheckSub");
  const errBox = document.getElementById("gateError");
  btn.disabled = true;
  btn.textContent = t("checking");
  errBox.style.display = "none";

  const telegramId = await getTelegramIdWithRetry();

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

// Нормальная плотность вероятности (mean=100, sd=15) -> SVG path колокола
function normalPdfIQ(iq) {
  const mean = 100, sd = 15;
  const z = (iq - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

function drawBellCurve(iqScore, percentile) {
  const pathEl = document.getElementById("bellCurvePath");
  const fillEl = document.getElementById("bellCurveFill");
  const dot = document.getElementById("bellCurveDot");
  const dotLine = document.getElementById("bellCurveDotLine");
  const dotLabel = document.getElementById("bellCurveDotLabel");
  const pctText = document.getElementById("bellPercentileText");
  if (!pathEl) return;

  const W = 320, H = 140, padX = 20, baseY = 115, topY = 15;
  const iqMin = 55, iqMax = 145;
  const maxDensity = normalPdfIQ(100);

  const xForIQ = iq => padX + ((iq - iqMin) / (iqMax - iqMin)) * (W - padX * 2);
  const yForDensity = d => baseY - (d / maxDensity) * (baseY - topY);

  let points = [];
  for (let iq = iqMin; iq <= iqMax; iq += 2) {
    points.push([xForIQ(iq), yForDensity(normalPdfIQ(iq))]);
  }

  let pathD = `M ${points[0][0]},${baseY} `;
  points.forEach(p => { pathD += `L ${p[0]},${p[1]} `; });
  pathD += `L ${points[points.length - 1][0]},${baseY} Z`;

  let strokeD = `M ${points[0][0]},${points[0][1]} `;
  points.slice(1).forEach(p => { strokeD += `L ${p[0]},${p[1]} `; });

  pathEl.setAttribute("d", strokeD);
  fillEl.setAttribute("d", pathD);

  const clampedIQ = Math.max(iqMin, Math.min(iqMax, iqScore));
  const dotX = xForIQ(clampedIQ);
  const dotY = yForDensity(normalPdfIQ(clampedIQ));

  dot.setAttribute("cx", dotX);
  dot.setAttribute("cy", dotY);
  dotLine.setAttribute("x1", dotX);
  dotLine.setAttribute("x2", dotX);
  dotLine.setAttribute("y1", dotY + 5);
  dotLabel.setAttribute("x", dotX);
  dotLabel.textContent = String(iqScore);

  if (pctText) {
    pctText.textContent = currentLang === "kk"
      ? `${percentile}-процентиль`
      : `${percentile}-й процентиль`;
  }
}

const IQ_EXPLANATIONS = {
  kk: [
    [130, "Бұл нәтиже сіздің абстрактілі заңдылықтарды анықтау, логикалық байланыстарды табу және күрделі тапсырмаларды шешу қабілетіңіз өте жоғары екенін көрсетеді."],
    [115, "Бұл нәтиже сіздің логикалық ойлау мен күрделі есептерді шешу қабілетіңіз орташадан жоғары екенін көрсетеді."],
    [85, "Бұл нәтиже сіздің логикалық және аналитикалық қабілетіңіз орташа деңгейде екенін көрсетеді — бұл қатысушылардың басым бөлігіне тән деңгей."],
    [70, "Бұл нәтиже кейбір тапсырма түрлерінде қиындықтар туындауы мүмкін екенін көрсетеді. Нәтиже бір реттік тестке негізделген, сондықтан оны абсолютты баға ретінде қабылдамаңыз."],
    [0, "Нәтиже күтілгеннен төмен шықты — бұл шаршау, назардың бөлінуі немесе тест шарттарына байланысты болуы мүмкін. Қайта тапсырып көруге болады."],
  ],
  ru: [
    [130, "Этот результат говорит о высокой способности выявлять абстрактные закономерности, находить логические связи и решать сложные задачи."],
    [115, "Этот результат говорит о способности к логическому мышлению и решению сложных задач выше среднего уровня."],
    [85, "Этот результат говорит о среднем уровне логических и аналитических способностей — таком, какой характерен для большинства участников."],
    [70, "Этот результат говорит о том, что некоторые типы заданий могли вызвать затруднения. Результат основан на одном прохождении теста, не стоит воспринимать его как абсолютную оценку."],
    [0, "Результат оказался ниже ожидаемого — это может быть связано с усталостью, рассеянным вниманием или условиями прохождения теста. Можно попробовать пройти тест ещё раз."],
  ],
};

function renderIQExplanation(iqScore) {
  const titleEl = document.getElementById("iqExplainTitle");
  const textEl = document.getElementById("iqExplainText");
  if (!titleEl || !textEl) return;

  titleEl.textContent = currentLang === "kk"
    ? `${iqScore} IQ нені білдіреді?`
    : `Что означает IQ ${iqScore}?`;

  const list = IQ_EXPLANATIONS[currentLang] || IQ_EXPLANATIONS.ru;
  for (const [min, text] of list) {
    if (iqScore >= min) {
      textEl.textContent = text;
      return;
    }
  }
  textEl.textContent = list[list.length - 1][1];
}

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
  logEvent("result_opened");
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

  const percentile = (typeof payload.percentile === "number") ? payload.percentile : iqToPercentile(payload.iq_score);
  document.getElementById("percentileSentence").textContent = currentLang === "kk"
    ? `Сіз қатысушылардың ${percentile}%-ынан жоғары нәтиже көрсеттіңіз.`
    : `Вы показали результат выше, чем ${percentile}% участников.`;

  drawBellCurve(payload.iq_score, percentile);
  renderIQExplanation(payload.iq_score);

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
    try { localStorage.setItem("iqbot_lang", currentLang); } catch (e) {}
    applyI18n();
    renderCategories();
    if (document.getElementById("screen-gate").classList.contains("active")) {
      renderGateChannels();
    }
  });
});

document.querySelectorAll(".lang-toggle button").forEach(b => b.classList.toggle("on", b.dataset.lang === currentLang));
const menuLangValueEl = document.getElementById("menuLangValue");
if (menuLangValueEl) menuLangValueEl.textContent = currentLang === "kk" ? "Қазақша" : "Русский";

applyI18n();
renderCategories();
loadHomePodium();

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
function getCurrentTelegramId() {
  return tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;
}

async function fetchProfileData() {
  const telegramId = getCurrentTelegramId();
  if (!telegramId) return null;
  try {
    const res = await fetch(`${API_URL}/profile?telegram_id=${telegramId}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function loadMenuData() {
  const menuNameEl = document.getElementById("menuName");
  const menuIqBadgeEl = document.getElementById("menuIqBadge");
  const menuPointsEl = document.getElementById("menuPoints");

  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  menuNameEl.textContent = tgUser && tgUser.first_name ? tgUser.first_name : (currentLang === "kk" ? "Аноним" : "Аноним");

  const data = await fetchProfileData();
  if (!data) {
    menuIqBadgeEl.textContent = "IQ —";
    menuPointsEl.textContent = "0";
    return;
  }

  menuIqBadgeEl.textContent = data.best_iq ? `IQ ${data.best_iq}` : "IQ —";
  menuPointsEl.textContent = String(data.points || 0);
}

function formatHistoryDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(currentLang === "kk" ? "kk-KZ" : "ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (e) {
    return "";
  }
}

async function loadProfileScreen() {
  const nameEl = document.getElementById("profileName");
  const usernameEl = document.getElementById("profileUsername");
  const bestIqEl = document.getElementById("profileBestIq");
  const testCountEl = document.getElementById("profileTestCount");
  const pointsEl = document.getElementById("profilePoints");
  const rankEl = document.getElementById("profileRank");
  const historyEmptyEl = document.getElementById("profileHistoryEmpty");
  const historyListEl = document.getElementById("profileHistoryList");

  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  nameEl.textContent = tgUser && tgUser.first_name ? tgUser.first_name : "Аноним";
  usernameEl.textContent = tgUser && tgUser.username ? `@${tgUser.username}` : "";

  const data = await fetchProfileData();
  if (!data) {
    bestIqEl.textContent = "—";
    testCountEl.textContent = "0";
    pointsEl.textContent = "0";
    rankEl.textContent = "—";
    historyEmptyEl.style.display = "block";
    historyListEl.innerHTML = "";
    return;
  }

  bestIqEl.textContent = data.best_iq || "—";
  testCountEl.textContent = data.test_count || 0;
  pointsEl.textContent = data.points || 0;
  rankEl.textContent = data.rank ? `#${data.rank}` : "—";

  if (!data.history || data.history.length === 0) {
    historyEmptyEl.style.display = "block";
    historyListEl.innerHTML = "";
  } else {
    historyEmptyEl.style.display = "none";
    historyListEl.innerHTML = data.history.map(h => `
      <div class="profile-history-row">
        <div>
          <div class="profile-history-score">IQ ${h.iq_score ?? "—"}</div>
          <div class="profile-history-date">${formatHistoryDate(h.completed_at)}</div>
        </div>
        <div class="profile-history-pct">${h.percentile != null ? h.percentile + "-процентиль" : ""}</div>
      </div>
    `).join("");
  }
}

function openProfileScreen() {
  go("screen-profile");
  loadProfileScreen();
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
  try { localStorage.setItem("iqbot_lang", currentLang); } catch (e) {}
  document.getElementById("menuLangValue").textContent = currentLang === "kk" ? "Қазақша" : "Русский";
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle("on", b.dataset.lang === currentLang));
  applyI18n();
  renderCategories();
  if (document.getElementById("screen-gate")?.classList.contains("active")) {
    renderGateChannels();
  }
  if (document.getElementById("screen-rating")?.classList.contains("active") && typeof currentRatingScope !== "undefined") {
    loadLeaderboard(currentRatingScope);
  }
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

logEvent("visit");
tryResumeOnLoad();

// ===== Экран профиля: навигация =====
document.getElementById("menuProfileCard")?.addEventListener("click", () => openProfileScreen());
document.getElementById("menuProfileRow")?.addEventListener("click", () => openProfileScreen());
document.getElementById("profileBack")?.addEventListener("click", () => { go("screen-menu"); loadMenuData(); });
document.getElementById("navHomeProfile")?.addEventListener("click", () => go("screen-start"));
document.getElementById("navTestProfile")?.addEventListener("click", () => openTestListScreen());
document.getElementById("navRatingProfile")?.addEventListener("click", () => openRatingScreen());
document.getElementById("navMenuProfile")?.addEventListener("click", () => openMenuScreen());

// ===== Экран статистики v2 =====
const STATS_DOMAIN_META = {
  matrix: { icon: "ic-bulb", color: "#F5A623" },
  cube: { icon: "ic-cube", color: "#3B6FF0" },
  verbal: { icon: "ic-chat", color: "#9B6FF0" },
  series: { icon: "ic-sigma", color: "#2ECC71" },
  memory: { icon: "ic-grid", color: "#F5B429" },
};

function formatShortDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(currentLang === "kk" ? "kk-KZ" : "ru-RU", { day: "2-digit", month: "2-digit" });
  } catch (e) {
    return "";
  }
}

function renderStatsSummary(data, chrono) {
  const grid = document.getElementById("statsSummaryGrid");
  const testCount = data.test_count || 0;
  const latestIq = chrono.length ? chrono[chrono.length - 1].iq_score : null;
  const bestIq = data.best_iq || null;
  const avgIq = chrono.length ? Math.round(chrono.reduce((s, h) => s + h.iq_score, 0) / chrono.length) : null;

  const cards = [
    { icon: "ic-doc", label: "Барлық тест", value: testCount },
    { icon: "ic-chart", label: "Соңғы IQ", value: latestIq ?? "—" },
    { icon: "ic-trophy", label: "Ең жоғары IQ", value: bestIq ?? "—" },
    { icon: "ic-sigma", label: "Орташа IQ", value: avgIq ?? "—" },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="stats-summary-card">
      <div class="stats-summary-icon"><svg width="16" height="16"><use href="#${c.icon}"/></svg></div>
      <div class="stats-summary-label">${c.label}</div>
      <div class="stats-summary-value">${c.value}</div>
    </div>
  `).join("");
}

function drawProgressChart(history) {
  const svg = document.getElementById("statsProgressChart");
  const emptyEl = document.getElementById("statsProgressEmpty");
  const minMaxEl = document.getElementById("statsMinAvgMax");

  const chrono = (history || []).slice().reverse().filter(h => h.iq_score != null);

  if (chrono.length === 0) {
    svg.style.display = "none";
    emptyEl.style.display = "block";
    minMaxEl.innerHTML = "";
    return chrono;
  }
  svg.style.display = "block";
  emptyEl.style.display = "none";

  const W = 340, H = 200, PAD_X = 20, PAD_TOP = 26, PAD_BOTTOM = 30;
  const scores = chrono.map(h => h.iq_score);
  const minIq = Math.min(...scores, 85);
  const maxIq = Math.max(...scores, 115);
  const range = Math.max(1, maxIq - minIq);
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const points = chrono.map((h, i) => {
    const x = chrono.length === 1 ? W / 2 : PAD_X + (i / (chrono.length - 1)) * (W - PAD_X * 2);
    const y = PAD_TOP + chartH - ((h.iq_score - minIq) / range) * chartH;
    return { x, y, iq: h.iq_score, date: h.completed_at };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${PAD_TOP + chartH} L ${points[0].x} ${PAD_TOP + chartH} Z`;

  const dots = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#3B6FF0" stroke="#fff" stroke-width="1.5"/>`).join("");
  const valueLabels = points.map(p => `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" class="stats-point-label">${p.iq}</text>`).join("");
  const dateLabels = points.map(p => `<text x="${p.x}" y="${H - 8}" text-anchor="middle" class="stats-axis-label">${formatShortDate(p.date)}</text>`).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="progressFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3B6FF0" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#3B6FF0" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#progressFillGrad)"/>
    <path d="${pathD}" fill="none" stroke="#3B6FF0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    ${valueLabels}
    ${dateLabels}
  `;

  const minEntry = chrono.reduce((a, b) => (a.iq_score <= b.iq_score ? a : b));
  const maxEntry = chrono.reduce((a, b) => (a.iq_score >= b.iq_score ? a : b));
  const avgIq = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);

  minMaxEl.innerHTML = `
    <div class="stats-minmax-card">
      <div class="stats-minmax-label">Ең төменгі IQ</div>
      <div class="stats-minmax-value">${minEntry.iq_score}</div>
      <div class="stats-minmax-date">${formatShortDate(minEntry.completed_at)}</div>
    </div>
    <div class="stats-minmax-card mid">
      <div class="stats-minmax-label">Орташа IQ</div>
      <div class="stats-minmax-value">${avgIq}</div>
    </div>
    <div class="stats-minmax-card">
      <div class="stats-minmax-label">Ең жоғары IQ</div>
      <div class="stats-minmax-value">${maxEntry.iq_score}</div>
      <div class="stats-minmax-date">${formatShortDate(maxEntry.completed_at)}</div>
    </div>
  `;

  return chrono;
}

function drawCategoryDonut(latestCategoryScores) {
  const wrap = document.getElementById("statsDonutWrap");
  const emptyEl = document.getElementById("statsCategoryEmpty");
  if (!latestCategoryScores) {
    wrap.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  const domains = Object.keys(latestCategoryScores);
  if (domains.length === 0) {
    wrap.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  const total = domains.reduce((s, d) => s + (latestCategoryScores[d].iq || 0), 0) || 1;
  const R = 45, CX = 60, CY = 60, STROKE = 18;
  const circumference = 2 * Math.PI * R;

  let offsetAcc = 0;
  const segments = domains.map(d => {
    const cat = latestCategoryScores[d];
    const iq = cat.iq || 0;
    const frac = iq / total;
    const segLen = frac * circumference;
    const meta = STATS_DOMAIN_META[d] || { color: "#3B6FF0" };
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${meta.color}" stroke-width="${STROKE}"
      stroke-dasharray="${segLen} ${circumference - segLen}" stroke-dashoffset="${-offsetAcc}"
      transform="rotate(-90 ${CX} ${CY})" stroke-linecap="butt"/>`;
    offsetAcc += segLen;
    return seg;
  }).join("");

  const donutSvg = `
    <svg class="stats-donut-svg" width="120" height="120" viewBox="0 0 120 120">
      ${segments}
      <text x="${CX}" y="${CY - 3}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-family="IBM Plex Mono, monospace">барлығы</text>
      <text x="${CX}" y="${CY + 14}" text-anchor="middle" font-size="16" font-weight="800" fill="var(--navy)" font-family="IBM Plex Mono, monospace">${total}</text>
    </svg>
  `;

  const legend = domains.map(d => {
    const cat = latestCategoryScores[d];
    const iq = cat.iq || 0;
    const pct = Math.round((iq / total) * 100);
    const meta = STATS_DOMAIN_META[d] || { icon: "ic-star", color: "#3B6FF0" };
    const label = cat.label ? L(cat.label) : d;
    return `
      <div class="stats-donut-row">
        <div class="stats-donut-dot" style="background:${meta.color}"><svg width="9" height="9"><use href="#${meta.icon}"/></svg></div>
        <div class="stats-donut-label">${label}</div>
        <div class="stats-donut-value">${pct}% · ${iq}</div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `${donutSvg}<div class="stats-donut-legend">${legend}</div>`;
}

async function loadStatsScreen() {
  const data = await fetchProfileData();
  if (!data || !data.history) {
    renderStatsSummary({ test_count: 0, best_iq: null }, []);
    drawProgressChart([]);
    drawCategoryDonut(null);
    return;
  }
  const chrono = drawProgressChart(data.history);
  renderStatsSummary(data, chrono);
  const latest = data.history[0];
  drawCategoryDonut(latest ? latest.categoryScores : null);
}

function openStatsScreen() {
  go("screen-stats");
  loadStatsScreen();
}

document.getElementById("menuStatsRow")?.addEventListener("click", () => openStatsScreen());
document.getElementById("statsBack")?.addEventListener("click", () => { go("screen-menu"); loadMenuData(); });
document.getElementById("navHomeStats")?.addEventListener("click", () => go("screen-start"));
document.getElementById("navTestStats")?.addEventListener("click", () => openTestListScreen());
document.getElementById("navRatingStats")?.addEventListener("click", () => openRatingScreen());
document.getElementById("navMenuStats")?.addEventListener("click", () => openMenuScreen());

// ===== Инфо-экраны: Құпиялылық / Қосымша туралы =====
const PRIVACY_TEXT = {
  kk: `
    <h4>Қандай деректер жиналады</h4>
    <p>Telegram ID, пайдаланушы аты, аты-жөні және тест нәтижелері (жауаптар, IQ ұпайы, санаттар бойынша көрсеткіштер).</p>
    <h4>Деректер қалай пайдаланылады</h4>
    <p>IQ ұпайын есептеу, рейтингте көрсету, жеке тарихты сақтау және қолданбаны жақсарту үшін пайдаланылады.</p>
    <h4>Үшінші тұлғалар</h4>
    <p>Деректеріңіз үшінші тұлғаларға сатылмайды және берілмейді. Деректер тек «Менің IQ» серверінде сақталады.</p>
    <h4>Байланыс</h4>
    <p class="info-muted">Сұрақтарыңыз болса, боттағы әкімшіге хабарласыңыз.</p>
  `,
  ru: `
    <h4>Какие данные собираются</h4>
    <p>Telegram ID, имя пользователя, имя и результаты тестов (ответы, IQ-балл, показатели по категориям).</p>
    <h4>Как используются данные</h4>
    <p>Для расчёта IQ-балла, отображения в рейтинге, сохранения личной истории и улучшения приложения.</p>
    <h4>Третьи лица</h4>
    <p>Ваши данные не продаются и не передаются третьим лицам. Данные хранятся только на сервере «Менің IQ».</p>
    <h4>Контакты</h4>
    <p class="info-muted">По вопросам обращайтесь к администратору бота.</p>
  `,
};

const ABOUT_TEXT = {
  kk: `
    <h4>🧠 Менің IQ</h4>
    <p>«Менің IQ» — логика, кеңістіктік ойлау, есте сақтау және вербалды қабілеттерді тексеретін кешенді тест. Есептеу заманауи психометриялық IRT (Item Response Theory) моделіне негізделген.</p>
    <h4>Санаттар</h4>
    <p>Абстрактілі ойлау, кеңістіктік ойлау, вербалды пайымдау, сандық пайымдау және жедел жады.</p>
    <h4>Маңызды ескерту</h4>
    <p>Бұл тест ойын-сауық және өзіндік бағалау мақсатында жасалған, клиникалық диагностика құралы емес.</p>
  `,
  ru: `
    <h4>🧠 Менің IQ</h4>
    <p>«Менің IQ» — комплексный тест на логику, пространственное мышление, память и вербальные способности. Расчёт основан на современной психометрической модели IRT (Item Response Theory).</p>
    <h4>Категории</h4>
    <p>Абстрактное мышление, пространственное мышление, вербальное мышление, числовое мышление и оперативная память.</p>
    <h4>Важное примечание</h4>
    <p>Этот тест создан в развлекательных и ознакомительных целях и не является инструментом клинической диагностики.</p>
  `,
};

function openPrivacyScreen() {
  go("screen-privacy");
  document.getElementById("privacyText").innerHTML = PRIVACY_TEXT[currentLang] || PRIVACY_TEXT.ru;
}

function openAboutScreen() {
  go("screen-about");
  document.getElementById("aboutText").innerHTML = ABOUT_TEXT[currentLang] || ABOUT_TEXT.ru;
}

document.getElementById("menuPrivacyRow")?.addEventListener("click", () => openPrivacyScreen());
document.getElementById("menuAboutRow")?.addEventListener("click", () => openAboutScreen());
document.getElementById("privacyBack")?.addEventListener("click", () => go("screen-menu"));
document.getElementById("aboutBack")?.addEventListener("click", () => go("screen-menu"));
