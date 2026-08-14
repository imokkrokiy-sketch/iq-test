const I18N = {
  kk: {
    hero_title: "Ақыл-ойыңды<br><span class=\"accent\">дәл өлше</span>",
    hero_lede: "Логика, сан, кеңістік, есте сақтау және вербалды қабілеттерді тексеретін кешенді IQ тесті.",
    stat_passed: "Тапсырды", stat_cats: "Санат", stat_rating: "Баға",
    cats_label: "Тест санаттары",
    btn_start_sub: "15–20 минут · Нәтиже бірден",
    trust_line: "100% құпиялылық және қауіпсіздік",
    nav_home: "Басты бет", nav_test: "Тест", nav_rating: "Рейтинг", nav_menu: "Мәзір",
    age_step: "Дайындық", age_title: "Жасыңыз нешеде?", age_sub: "Нәтижені дәлірек есептеу үшін қажет",
    dark_title: "Нәтижеңді біл — <span>достарыңмен жарыс!</span>",
    dark_sub: "Нәтижеңді лидерлер рейтингінде көріп, достарыңды шақырып, кімнің ақылы мықты екенін дәлелде.",
    btn_leaderboard: "Рейтингті қарау →",
    btn_start: "Тесті бастау →",
    q_label: "СҰРАҚ",
    memorize_label: "Есте сақтаңыз",
    memorize_hint: "Дайын болыңыз, бірнеше секундтан кейін жасырылады",
    gate_title: "Нәтиже дайын!<br>Оны ашу үшін жазыл",
    gate_sub: "Серіктес арналарға жазылып, нәтижеңді бірден көр",
    gate_hint: "💡 Жазылғаннан кейін «Тексеру» батырмасын бас — нәтиже бірден ашылады",
    btn_check: "✅ Тексеру",
    btn_join: "Жазылу",
    joined: "Жазылды",
    score_label: "IQ ұпайы",
    avg_label: "Орташа: 100",
    btn_share: "📤 Бөлісу",
    btn_again: "Тағы тест",
    gate_error_text: "Барлық арналарға жазылмадың. Тексеріп, қайта көр.",
    checking: "Тексерілуде...",
    network_error: "Байланыс қатесі. Қайталап көріңіз.",
    locked_soon: "Жақында"
  },
  ru: {
    hero_title: "Измерь свой<br><span class=\"accent\">интеллект точно</span>",
    hero_lede: "Комплексный IQ-тест на логику, числа, пространство, память и вербальные способности.",
    stat_passed: "Прошли", stat_cats: "Категорий", stat_rating: "Оценка",
    cats_label: "Категории теста",
    btn_start_sub: "15–20 минут · Результат сразу",
    trust_line: "100% конфиденциально и безопасно",
    nav_home: "Главная", nav_test: "Тест", nav_rating: "Рейтинг", nav_menu: "Меню",
    age_step: "Подготовка", age_title: "Сколько тебе лет?", age_sub: "Нужно для точного расчёта результата",
    dark_title: "Узнай результат — <span>соревнуйся с друзьями!</span>",
    dark_sub: "Смотри свой результат в рейтинге лидеров, приглашай друзей и докажи, чей интеллект сильнее.",
    btn_leaderboard: "Смотреть рейтинг →",
    btn_start: "Начать тест →",
    q_label: "ВОПРОС",
    memorize_label: "Запомните",
    memorize_hint: "Приготовьтесь, через несколько секунд скроется",
    gate_title: "Результат готов!<br>Подпишись, чтобы открыть",
    gate_sub: "Подпишись на каналы-партнёры и сразу увидь результат",
    gate_hint: "💡 После подписки нажми «Проверить» — результат откроется сразу",
    btn_check: "✅ Проверить",
    btn_join: "Подписаться",
    joined: "Подписан",
    score_label: "IQ балл",
    avg_label: "Среднее: 100",
    btn_share: "📤 Поделиться",
    btn_again: "Ещё тест",
    gate_error_text: "Ты подписался не на все каналы. Проверь и попробуй снова.",
    checking: "Проверяем...",
    network_error: "Ошибка сети. Попробуй ещё раз.",
    locked_soon: "Скоро"
  }
};

let currentLang = "kk";

function t(key) {
  return I18N[currentLang][key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (I18N[currentLang][key] !== undefined) {
      el.innerHTML = I18N[currentLang][key];
    }
  });
}
