const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#F4F7FE"); } catch (e) {}
}

let state = {
  category: null,
  questions: [],
  index: 0,
  score: 0,
  answers: [],
  timerInterval: null,
  timeLeft: 20,
};

const QUESTION_TIME = 20;

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
  CATEGORIES.forEach(cat => {
    const card = document.createElement("button");
    card.className = "cat-card" + (cat.locked ? " locked" : "");
    card.innerHTML = `
      <div class="row"><div class="ic"><svg width="18" height="18"><use href="#${cat.icon}"/></svg></div><div class="arrow"><svg width="11" height="11"><use href="#ic-arrow"/></svg></div></div>
      <div>
        <div class="name">${L(cat.name)}</div>
        <div class="meta">${cat.locked ? t("locked_soon") : L(cat.meta)}</div>
      </div>`;
    if (!cat.locked) {
      card.addEventListener("click", () => startTest(cat.code));
    }
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

function startTest(categoryCode) {
  const bank = QUESTION_BANKS[categoryCode];
  if (!bank || bank.length === 0) return;

  state.category = categoryCode;
  state.questions = bank;
  state.index = 0;
  state.score = 0;
  state.answers = [];

  document.getElementById("qTotal").textContent = state.questions.length;
  go("screen-question");
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  document.getElementById("qCurrent").textContent = String(state.index + 1).padStart(2, "0");
  document.getElementById("qTag").textContent = L(q.tag);
  document.getElementById("qText").textContent = L(q.text);
  document.getElementById("qVisual").textContent = q.visual || "";

  const pct = (state.index / state.questions.length) * 100;
  document.getElementById("qProgressFill").style.width = pct + "%";

  const optWrap = document.getElementById("qOptions");
  optWrap.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.innerHTML = `<span class="letter">${letters[i]}</span>${L(opt)}`;
    btn.addEventListener("click", () => selectOption(i));
    optWrap.appendChild(btn);
  });

  startTimer();
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = QUESTION_TIME;
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

  const isCorrect = selectedIndex === q.correct;
  if (isCorrect) state.score++;
  state.answers.push({ q: state.index, selected: selectedIndex, correct: q.correct });

  if (selectedIndex >= 0) {
    opts[selectedIndex].classList.add(isCorrect ? "correct" : "wrong");
  }
  if (!isCorrect) {
    opts[q.correct].classList.add("correct");
  }

  setTimeout(() => {
    state.index++;
    if (state.index < state.questions.length) {
      renderQuestion();
    } else {
      finishTest();
    }
  }, 900);
}

function finishTest() {
  document.getElementById("qProgressFill").style.width = "100%";
  renderGateChannels();
  go("screen-gate");
  document.getElementById("gateError").style.display = "none";
}

function computeIqScore() {
  const total = state.questions.length;
  const pct = state.score / total;
  return Math.round(85 + pct * 60);
}

document.getElementById("btnCheckSub").addEventListener("click", () => {
  const btn = document.getElementById("btnCheckSub");
  const errBox = document.getElementById("gateError");
  btn.disabled = true;
  btn.textContent = t("checking");

  const payload = {
    type: "iq_test_result",
    category: state.category,
    score: state.score,
    total: state.questions.length,
    iq_score: computeIqScore(),
    lang: currentLang,
  };

  if (tg && tg.sendData) {
    tg.sendData(JSON.stringify(payload));
    setTimeout(() => { if (tg.close) tg.close(); }, 300);
  } else {
    errBox.style.display = "none";
    showLocalResult(payload);
    btn.disabled = false;
    btn.textContent = t("btn_check");
  }
});

function showLocalResult(payload) {
  const cat = CATEGORIES.find(c => c.code === payload.category);
  document.getElementById("resultCategory").textContent = `${t("q_label") === "СҰРАҚ" ? "Нәтиже" : "Результат"} · ${L(cat.name)}`;
  document.getElementById("resultScore").textContent = payload.iq_score;
  document.getElementById("shareScore").textContent = payload.iq_score;
  document.getElementById("shareCat").textContent = `${L(cat.name)} · #—`;
  document.getElementById("shareName").textContent = tg && tg.initDataUnsafe && tg.initDataUnsafe.user
    ? `${tg.initDataUnsafe.user.first_name} · @${tg.initDataUnsafe.user.username || ""}`
    : "Қонақ";
  document.getElementById("pctLabel").textContent = `${currentLang === "kk" ? "Сен" : "Ты"}: ${payload.iq_score}`;

  go("screen-result");
  requestAnimationFrame(() => {
    const dial = document.getElementById("resultDial");
    const pct = Math.min(payload.iq_score / 160, 1);
    setTimeout(() => { dial.style.strokeDashoffset = 502 - (502 * pct); }, 150);
    setTimeout(() => { document.getElementById("pctFill").style.width = "86%"; }, 200);
  });
}

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
