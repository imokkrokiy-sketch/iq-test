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
  const counts = { matrix: 0, verbal: 0, memory: 0, speed: 0 };
  QUESTION_BANK.forEach(q => counts[q.domain]++);

  Object.entries(DOMAIN_INFO).forEach(([code, info]) => {
    const card = document.createElement("div");
    card.className = "cat-card";
    card.innerHTML = `
      <div class="row"><div class="ic"><svg width="18" height="18"><use href="#${info.icon}"/></svg></div></div>
      <div class="body">
        <div class="name">${L(info.name)}</div>
        <div class="meta">${counts[code]} ${currentLang === "kk" ? "сұрақ" : "вопросов"}</div>
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
  const byDomain = { matrix: [], verbal: [], memory: [], speed: [] };
  QUESTION_BANK.forEach(q => byDomain[q.domain].push(q));
  Object.keys(byDomain).forEach(d => { byDomain[d] = shuffle(byDomain[d]); });

  const interleaved = [];
  const maxLen = Math.max(...Object.values(byDomain).map(a => a.length));
  const domainOrder = shuffle(["matrix", "verbal", "memory", "speed"]);
  for (let i = 0; i < maxLen; i++) {
    domainOrder.forEach(d => { if (byDomain[d][i]) interleaved.push(byDomain[d][i]); });
  }

  state.questions = interleaved;
  state.index = 0;
  state.results = [];

  document.getElementById("qTotal").textContent = state.questions.length;
  go("screen-question");
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  document.getElementById("qCurrent").textContent = String(state.index + 1).padStart(2, "0");
  document.getElementById("qTag").textContent = L(DOMAIN_INFO[q.domain].name);
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
  const letters = ["A", "B", "C", "D"];
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

  state.results.push({
    domain: q.domain,
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

const DOMAIN_KEYS = ["matrix", "verbal", "memory", "speed"];
const POPULATION_MEAN = 0.56;
const POPULATION_SD = 0.13;

function calculateIQ(results) {
  const domainScores = { matrix: 0, verbal: 0, memory: 0, speed: 0 };
  const domainCounts = { matrix: 0, verbal: 0, memory: 0, speed: 0 };

  for (const r of results) {
    domainCounts[r.domain]++;
    if (r.correct) {
      const difficultyScore = r.difficulty / 5;
      const timeFraction = Math.max(0, 1 - r.timeTaken / r.timeLimit);
      const timeBonus = timeFraction * 0.1;
      domainScores[r.domain] += Math.min(1, difficultyScore + timeBonus);
    }
  }

  const normalised = {};
  for (const d of DOMAIN_KEYS) {
    const count = domainCounts[d] || 1;
    normalised[d] = domainScores[d] / count;
  }

  let composite = 0;
  for (const [d, w] of Object.entries(DOMAIN_WEIGHTS)) {
    composite += (normalised[d] || 0) * w;
  }

  const z = (composite - POPULATION_MEAN) / POPULATION_SD;
  const iq = Math.round(100 + 15 * z);
  const clampedIQ = Math.max(55, Math.min(145, iq));

  const domainPercents = {};
  for (const [d, val] of Object.entries(normalised)) {
    domainPercents[d] = Math.round(val * 100);
  }

  return { iq: clampedIQ, domains: domainPercents };
}

async function finishTest() {
  document.getElementById("qProgressFill").style.width = "100%";

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
    domains: scoring.domains,
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
    const demoScoring = calculateIQ(state.results.length ? state.results : [{domain:"matrix",difficulty:3,correct:true,timeTaken:10,timeLimit:40}]);
    showLocalResult({ iq_score: demoScoring.iq, domains: demoScoring.domains });
    btn.disabled = false;
    btn.textContent = t("btn_check");
    return;
  }

  await submitAndShowResult(telegramId);
  btn.disabled = false;
  btn.textContent = t("btn_check");
});

function renderDomainBars(domains) {
  const wrap = document.getElementById("domainBars");
  if (!wrap) return;
  wrap.innerHTML = "";
  DOMAIN_KEYS.forEach(d => {
    const pct = domains[d] || 0;
    const row = document.createElement("div");
    row.className = "domain-row";
    row.innerHTML = `
      <div class="domain-label">${L(DOMAIN_INFO[d].name)}</div>
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
  renderDomainBars(payload.domains || {});

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
