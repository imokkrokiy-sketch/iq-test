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

const TEST_LENGTH = 18; // сколько вопросов получает один пользователь за попытку

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

function startTest() {
  alert("DEBUG: bank=" + QUESTION_BANK.length + " testlen=" + TEST_LENGTH);
  state.questions = pickStratifiedQuestions(QUESTION_BANK, TEST_LENGTH);
  alert("DEBUG: picked=" + state.questions.length);
  state.index = 0;
  state.results = [];

  document.getElementById("qTotal").textContent = state.questions.length;
  go("screen-question");
  renderQuestion();
  saveTestProgress();
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
      saveTestProgress();
    } else {
      finishTest();
    }
  }, 500);
}

const POPULATION_MEAN = 0.5;
const POPULATION_SD = 0.16;

// ===== Scoring engine v2 =====
// Каждый вопрос имеет difficulty (1-5), используем упрощённую взвешенную
// модель в духе 2PL IRT: способность оценивается через сумму
// (сложность_решённого - сложность_нерешённого), нормализуется в z-score.
// Итоговый IQ = 100 + 15*z, с доверительным интервалом на основе SEM теста.

function calculateIQ(results) {
  if (!results.length) {
    return { iq: 100, sem: 15, types: {}, domainZ: {}, strengths: [], weaknesses: [] };
  }

  // 1. Общая способность (theta) через взвешенную сумму сложности с поправкой на скорость
  let weightedSum = 0;
  let maxPossible = 0;

  const domainScores = {};   // domain -> { earned, possible, count }

  for (const r of results) {
    const domain = r.domain || r.type || "general";
    const diff = r.difficulty || 3;
    const timeFraction = Math.max(0, Math.min(1, 1 - (r.timeTaken / r.timeLimit)));
    const speedBonus = timeFraction * 0.15; // до 15% бонуса за скорость правильного ответа

    if (!domainScores[domain]) domainScores[domain] = { earned: 0, possible: 0, count: 0 };
    domainScores[domain].count++;
    domainScores[domain].possible += diff;

    if (r.correct) {
      const itemWeight = diff * (1 + speedBonus);
      weightedSum += itemWeight;
      domainScores[domain].earned += diff * (1 + speedBonus);
    } else {
      // штраф за неверный ответ на лёгкий вопрос ощутимее, чем на сложный —
      // это приближение к IRT-логике (лёгкий вопрос должен решаться почти всегда)
      weightedSum -= diff * 0.3;
    }
    maxPossible += diff;
  }

  const composite = maxPossible > 0 ? weightedSum / maxPossible : 0;
  const z = (composite - POPULATION_MEAN) / POPULATION_SD;
  const iq = Math.round(100 + 15 * z);
  const clampedIQ = Math.max(55, Math.min(145, iq));

  // 2. SEM (стандартная ошибка измерения) — зависит от количества вопросов.
  // Чем больше вопросов, тем уже доверительный интервал (упрощённая аппроксимация reliability).
  const n = results.length;
  const reliability = Math.min(0.95, 0.5 + n * 0.02); // растёт с числом заданий, макс 0.95
  const sem = Math.round(15 * Math.sqrt(1 - reliability));

  // 3. По доменам — процент "заработанной" сложности от возможной + z-score домена
  const typePercents = {};
  const domainZ = {};
  for (const domain of Object.keys(domainScores)) {
    const d = domainScores[domain];
    const pct = d.possible > 0 ? Math.round((d.earned / d.possible) * 100) : 0;
    typePercents[domain] = Math.max(0, Math.min(100, pct));
    domainZ[domain] = ((pct / 100) - POPULATION_MEAN) / POPULATION_SD;
  }

  // 4. Сильные / слабые стороны — домены с z заметно выше/ниже общего z
  const strengths = [];
  const weaknesses = [];
  for (const domain of Object.keys(domainZ)) {
    if (domainScores[domain].count < 1) continue;
    const diff = domainZ[domain] - z;
    if (diff > 0.4) strengths.push(domain);
    if (diff < -0.4) weaknesses.push(domain);
  }

  return { iq: clampedIQ, sem, types: typePercents, domainZ, strengths, weaknesses };
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
  if (payload.sem) {
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

  const percentile = iqToPercentile(payload.iq_score);
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
document.getElementById("navTest")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openAgeGate();
});
document.getElementById("navRating")?.addEventListener("click", (e) => {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
  openRatingScreen();
});

document.getElementById("btnStartMain")?.addEventListener("click", () => {
  openAgeGate();
});
document.getElementById("btnLeaderboardTop")?.addEventListener("click", () => {
  openRatingScreen();
});
document.getElementById("btnLeaderboard")?.addEventListener("click", () => {
  openRatingScreen();
});

document.getElementById("btnBack").addEventListener("click", () => {
  clearInterval(state.timerInterval);
  clearTestProgress();
  go("screen-start");
});
document.getElementById("btnAgain").addEventListener("click", () => go("screen-start"));
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
document.getElementById("navTestRating")?.addEventListener("click", () => openAgeGate());

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
document.getElementById("navTestMenu")?.addEventListener("click", () => openAgeGate());
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

function saveTestProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      questionIds: state.questions.map(q => q.id),
      index: state.index,
      results: state.results,
      selectedAge: selectedAge,
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

      if (restoredQuestions.length === data.questionIds.length && data.index < restoredQuestions.length) {
        state.questions = restoredQuestions;
        state.index = data.index;
        state.results = data.results || [];
        selectedAge = data.selectedAge;
        document.getElementById("qTotal").textContent = state.questions.length;
        go("screen-question");
        renderQuestion();
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
