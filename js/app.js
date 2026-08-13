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
    card.innerHTML = `
      <div class="row"><div class="ic"><svg width="18" height="18"><use href="#${info.icon}"/></svg></div></div>
      <div class="body">
        <div class="name">${L(info.name)}</div>
        <div class="meta">${counts[code] || 0} ${currentLang === "kk" ? "сұрақ" : "вопросов"}</div>
      </div>`;
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

function startTest() {
  state.questions = shuffle(QUESTION_BANK);
  state.index = 0;
  state.results = [];

  document.getElementById("qTotal").textContent = state.questions.length;
  go("screen-question");
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  document.getElementById("qCurrent").textContent = String(state.index + 1).padStart(2, "0");
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

  const pct = (state.index / state.questions.length) * 100;
  document.getElementById("qProgressFill").style.width = pct + "%";

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

  state.timeLeft = q.timeLimit;
  state.questionStartTime = Date.now();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerInterval);
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      selectOption(-1);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.querySelector(".timer");
  const span = document.getElementById("qTimer");
  const m = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
  const s = (state.timeLeft % 60).toString().padStart(2, "0");
  span.textContent = `${m}:${s}`;
  el.classList.toggle("warn", state.timeLeft <= 5);
}

function selectOption(selectedIndex) {
  clearInterval(state.timerInterval);
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
    } else {
      finishTest();
    }
  }, 500);
}

const POPULATION_MEAN = 0.5;
const POPULATION_SD = 0.16;

function calculateIQ(results) {
  let totalScore = 0;
  const typeScores = {};
  const typeCounts = {};

  for (const r of results) {
    const type = r.type || "pattern";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    if (r.correct) {
      const difficultyScore = r.difficulty / 5;
      const timeFraction = Math.max(0, 1 - r.timeTaken / r.timeLimit);
      const timeBonus = timeFraction * 0.1;
      const itemScore = Math.min(1, difficultyScore + timeBonus);
      totalScore += itemScore;
      typeScores[type] = (typeScores[type] || 0) + itemScore;
    }
  }

  const composite = results.length > 0 ? totalScore / results.length : 0;
  const z = (composite - POPULATION_MEAN) / POPULATION_SD;
  const iq = Math.round(100 + 15 * z);
  const clampedIQ = Math.max(55, Math.min(145, iq));

  const typePercents = {};
  for (const type of Object.keys(typeCounts)) {
    const count = typeCounts[type] || 1;
    typePercents[type] = Math.round(((typeScores[type] || 0) / count) * 100);
  }

  return { iq: clampedIQ, types: typePercents };
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
    age: selectedAge,
  };

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
    showLocalResult({ iq_score: demoScoring.iq, types: demoScoring.types });
    btn.disabled = false;
    btn.textContent = t("btn_check");
    return;
  }

  await submitAndShowResult(telegramId);
  btn.disabled = false;
  btn.textContent = t("btn_check");
});

const TYPE_LABELS = {
  pattern: { kk: "Үлгі", ru: "Узор" },
  rotation: { kk: "Айналым", ru: "Вращение" },
  position: { kk: "Позиция", ru: "Позиция" },
  wheel: { kk: "Дөңгелек", ru: "Колесо" },
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
      <div class="domain-pct">${pct}%</div>`;
    wrap.appendChild(row);
  });
}

function showApiResult(payload) {
  document.getElementById("resultCategory").textContent = currentLang === "kk" ? "Толық нәтиже" : "Полный результат";
  document.getElementById("resultScore").textContent = payload.iq_score;
  document.getElementById("shareScore").textContent = payload.iq_score;
  document.getElementById("shareCat").textContent = currentLang === "kk" ? "Ғылыми IQ тест" : "Научный IQ тест";
  document.getElementById("shareName").textContent = payload.first_name
    ? `${payload.first_name} · @${payload.username || ""}`
    : "Қонақ";
  document.getElementById("pctLabel").textContent = `${currentLang === "kk" ? "Сен" : "Ты"}: ${payload.iq_score}`;
  renderDomainBars(payload.types || {});

  go("screen-result");
  requestAnimationFrame(() => {
    const dial = document.getElementById("resultDial");
    const pct = Math.min(payload.iq_score / 160, 1);
    setTimeout(() => { dial.style.strokeDashoffset = 502 - (502 * pct); }, 150);
    setTimeout(() => { document.getElementById("pctFill").style.width = "86%"; }, 200);
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
document.getElementById("navTest")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openAgeGate();
});
document.getElementById("navRating")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  document.querySelector(".dark-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("btnStartMain")?.addEventListener("click", () => {
  openAgeGate();
});
document.getElementById("btnLeaderboardTop")?.addEventListener("click", () => {
  document.querySelector(".dark-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("btnLeaderboard")?.addEventListener("click", () => {
  document.querySelector(".dark-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("btnBack").addEventListener("click", () => {
  clearInterval(state.timerInterval);
  go("screen-start");
});
document.getElementById("btnAgain").addEventListener("click", () => go("screen-start"));
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
