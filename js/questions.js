// ============================================================
// Научный банк вопросов на основе International Cognitive
// Ability Resource методологии (адаптация из открытого MIT-
// лицензированного проекта Ksound22/iq-measurer).
// 4 домена: matrix (35%), verbal (25%), memory (20%), speed (20%)
// ============================================================

const QUESTION_BANK = [
  // ---------- MATRIX (матричное мышление) ----------
  {
    id: 1, domain: "matrix", difficulty: 1, timeLimit: 40,
    text: { kk: "3×3 торды қандай фигура толықтырады?", ru: "Какая фигура дополняет сетку 3×3?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='#818cf8'><circle cx='35' cy='35' r='18'/><rect x='17' y='87' width='36' height='36' rx='3'/><polygon points='35,143 17,175 53,175'/><circle cx='105' cy='35' r='18'/><rect x='87' y='87' width='36' height='36' rx='3'/><polygon points='105,143 87,175 123,175'/><circle cx='175' cy='35' r='18'/><rect x='157' y='87' width='36' height='36' rx='3'/></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["Шеңбер", "Шаршы", "Үшбұрыш", "Ромб"], ru: ["Круг", "Квадрат", "Треугольник", "Ромб"] },
    answerIndex: 2
  },
  {
    id: 2, domain: "matrix", difficulty: 1, timeLimit: 40,
    text: { kk: "Әр қатарда бірдей үш фигура бар. Қай фигура жетіспейді?", ru: "В каждой строке одинаковые три фигуры. Какая фигура отсутствует?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='#34d399'><rect x='17' y='17' width='36' height='36' rx='3'/><circle cx='105' cy='35' r='18'/><polygon points='175,17 157,53 193,53'/><rect x='17' y='87' width='36' height='36' rx='3'/><circle cx='105' cy='105' r='18'/><polygon points='175,87 157,123 193,123'/><rect x='17' y='157' width='36' height='36' rx='3'/></g><rect x='87' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='105' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text><polygon points='175,157 157,193 193,193' fill='#34d399'/></svg>",
    options: { kk: ["Шаршы", "Шеңбер", "Үшбұрыш", "Ромб"], ru: ["Квадрат", "Круг", "Треугольник", "Ромб"] },
    answerIndex: 1
  },
  {
    id: 3, domain: "matrix", difficulty: 2, timeLimit: 40,
    text: { kk: "Фигуралар солдан оңға қарай үлкейеді. Төменгі оң жақ ұяшықты қандай өлшем толықтырады?", ru: "Фигуры увеличиваются слева направо. Какой размер дополняет нижнюю правую ячейку?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='#818cf8'><circle cx='35' cy='35' r='10'/><circle cx='105' cy='35' r='15'/><circle cx='175' cy='35' r='20'/><circle cx='35' cy='105' r='10'/><circle cx='105' cy='105' r='15'/><circle cx='175' cy='105' r='20'/><circle cx='35' cy='175' r='10'/><circle cx='105' cy='175' r='15'/></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["Кіші шеңбер", "Орта шеңбер", "Үлкен шеңбер", "Аса үлкен шеңбер"], ru: ["Маленький круг", "Средний круг", "Большой круг", "Очень большой круг"] },
    answerIndex: 2
  },
  {
    id: 4, domain: "matrix", difficulty: 2, timeLimit: 40,
    text: { kk: "Әр ұяшықтағы нүктелер саны әр бағанда 1-ге артады. Жетіспейтін ұяшыққа не сәйкес келеді?", ru: "Количество точек в каждой ячейке увеличивается на 1 в каждом столбце. Что заполняет пропущенную ячейку?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='#f472b6'><circle cx='35' cy='35' r='6'/><circle cx='99' cy='29' r='6'/><circle cx='111' cy='41' r='6'/><circle cx='163' cy='29' r='6'/><circle cx='175' cy='41' r='6'/><circle cx='187' cy='29' r='6'/><circle cx='35' cy='105' r='6'/><circle cx='47' cy='93' r='6'/><circle cx='93' cy='99' r='6'/><circle cx='105' cy='111' r='6'/><circle cx='117' cy='99' r='6'/><circle cx='163' cy='99' r='6'/><circle cx='175' cy='111' r='6'/><circle cx='187' cy='99' r='6'/><circle cx='175' cy='87' r='6'/><circle cx='35' cy='175' r='6'/><circle cx='47' cy='163' r='6'/><circle cx='23' cy='163' r='6'/><circle cx='93' cy='169' r='6'/><circle cx='105' cy='181' r='6'/><circle cx='117' cy='169' r='6'/><circle cx='105' cy='157' r='6'/></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["3 нүкте", "4 нүкте", "5 нүкте", "6 нүкте"], ru: ["3 точки", "4 точки", "5 точек", "6 точек"] },
    answerIndex: 2
  },
  {
    id: 5, domain: "matrix", difficulty: 3, timeLimit: 40,
    text: { kk: "Әр қатарда фигура сағат тілі бойымен 45°-қа бұрылады. Қай нұсқа үлгіні толықтырады?", ru: "В каждой строке фигура поворачивается на 45° по часовой стрелке. Какой вариант дополняет узор?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='none' stroke='#818cf8' stroke-width='3'><rect x='22' y='22' width='26' height='26'/><rect x='92' y='22' width='26' height='26' transform='rotate(45 105 35)'/><rect x='162' y='22' width='26' height='26' transform='rotate(90 175 35)'/><rect x='22' y='92' width='26' height='26'/><rect x='92' y='92' width='26' height='26' transform='rotate(45 105 105)'/><rect x='162' y='92' width='26' height='26' transform='rotate(90 175 105)'/><rect x='22' y='162' width='26' height='26'/><rect x='92' y='162' width='26' height='26' transform='rotate(45 105 175)'/></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["Шаршы (0°)", "Ромб (45°)", "Шаршы (90°)", "Ромб (135°)"], ru: ["Квадрат (0°)", "Ромб (45°)", "Квадрат (90°)", "Ромб (135°)"] },
    answerIndex: 2
  },
  {
    id: 6, domain: "matrix", difficulty: 3, timeLimit: 40,
    text: { kk: "Әр қатарда бір қою, бір орташа және бір ашық түсті фигура бар. Қай реңк торды толықтырады?", ru: "В каждой строке одна тёмная, одна средняя и одна светлая фигура. Какой оттенок дополняет сетку?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><circle cx='35' cy='35' r='20' fill='#312e81'/><circle cx='105' cy='35' r='20' fill='#818cf8'/><circle cx='175' cy='35' r='20' fill='#e0e7ff'/><circle cx='35' cy='105' r='20' fill='#818cf8'/><circle cx='105' cy='105' r='20' fill='#e0e7ff'/><circle cx='175' cy='105' r='20' fill='#312e81'/><circle cx='35' cy='175' r='20' fill='#e0e7ff'/><circle cx='105' cy='175' r='20' fill='#312e81'/><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["Қою", "Орташа", "Ашық", "Жолақты"], ru: ["Тёмный", "Средний", "Светлый", "Полосатый"] },
    answerIndex: 1
  },
  {
    id: 8, domain: "matrix", difficulty: 4, timeLimit: 45,
    text: { kk: "Әр қатардағы бағдаршалар әр бағанда басқа бағытты көрсетеді. Қай бағыт жетіспейді?", ru: "Стрелки в каждой строке указывают в разном направлении по столбцам. Какое направление отсутствует?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g fill='#818cf8' font-size='28' text-anchor='middle'><text x='35'  y='48'>→</text><text x='105' y='48'>↓</text><text x='175' y='48'>←</text><text x='35'  y='118'>↓</text><text x='105' y='118'>←</text><text x='175' y='118'>↑</text><text x='35'  y='188'>←</text><text x='105' y='188'>↑</text></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='188' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["→", "↓", "↑", "←"], ru: ["→", "↓", "↑", "←"] },
    answerIndex: 0
  },
  {
    id: 10, domain: "matrix", difficulty: 5, timeLimit: 50,
    text: { kk: "Әр қатарда ішкі үлгі сағат тілі бойымен бір ширекке көбірек толады. Жетіспейтін ұяшық қалай көрінеді?", ru: "В каждой строке внутренний узор заполняется на одну четверть больше по часовой стрелке. Как выглядит пропущенная ячейка?" },
    svg: "<svg viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg' style='max-width:210px;margin:0 auto;display:block'><rect width='210' height='210' rx='8' fill='#1e293b'/><g stroke='#818cf8' stroke-width='1' fill='none'><rect x='17' y='17' width='36' height='36' rx='3'/><rect x='87' y='17' width='36' height='36' rx='3'/><rect x='157' y='17' width='36' height='36' rx='3'/><rect x='17' y='87' width='36' height='36' rx='3'/><rect x='87' y='87' width='36' height='36' rx='3'/><rect x='157' y='87' width='36' height='36' rx='3'/><rect x='17' y='157' width='36' height='36' rx='3'/><rect x='87' y='157' width='36' height='36' rx='3'/></g><g fill='#818cf8'><rect x='17' y='17' width='18' height='18' rx='2'/><rect x='87' y='17' width='18' height='18' rx='2'/><rect x='105' y='17' width='18' height='18' rx='2'/><rect x='157' y='17' width='36' height='36' rx='2'/><rect x='17' y='87' width='18' height='18' rx='2'/><rect x='87' y='87' width='18' height='18' rx='2'/><rect x='105' y='87' width='18' height='18' rx='2'/><rect x='157' y='87' width='36' height='36' rx='2'/><rect x='17' y='157' width='18' height='18' rx='2'/><rect x='17' y='175' width='18' height='18' rx='2'/></g><rect x='157' y='157' width='36' height='36' rx='4' fill='none' stroke='#f59e0b' stroke-width='2' stroke-dasharray='5,3'/><text x='175' y='180' text-anchor='middle' fill='#f59e0b' font-size='22' font-weight='bold'>?</text></svg>",
    options: { kk: ["1 ширек толған", "2 ширек толған", "3 ширек толған", "Барлық 4 ширек толған"], ru: ["Заполнена 1 четверть", "Заполнены 2 четверти", "Заполнены 3 четверти", "Заполнены все 4 четверти"] },
    answerIndex: 3
  },

  // ---------- VERBAL (вербальное мышление) ----------
  {
    id: 11, domain: "verbal", difficulty: 1, timeLimit: 25,
    text: { kk: "«Ыстық» — «Суыққа» қалай қатысты болса, «Күн» — солай ___ қатысты.", ru: "«Горячий» относится к «Холодному», как «День» относится к ___." },
    options: { kk: ["Күн (аспандағы)", "Түн", "Жылы", "Аспан"], ru: ["Солнце", "Ночь", "Тепло", "Небо"] },
    answerIndex: 1
  },
  {
    id: 12, domain: "verbal", difficulty: 1, timeLimit: 25,
    text: { kk: "«Үлкен» — «Кішіге» қалай қатысты болса, «Жылдам» — солай ___ қатысты.", ru: "«Большой» относится к «Маленькому», как «Быстрый» относится к ___." },
    options: { kk: ["Тез", "Баяу", "Жылдамдық", "Жүгіру"], ru: ["Скорый", "Медленный", "Скорость", "Бег"] },
    answerIndex: 1
  },
  {
    id: 13, domain: "verbal", difficulty: 2, timeLimit: 25,
    text: { kk: "«Құс» — «Топқа» қалай қатысты болса, «Балық» — солай ___ қатысты.", ru: "«Птица» относится к «Стае», как «Рыба» относится к ___." },
    options: { kk: ["Мұхит", "Топ (балық)", "Отар", "Табын"], ru: ["Океан", "Косяк", "Стая", "Стадо"] },
    answerIndex: 1
  },
  {
    id: 14, domain: "verbal", difficulty: 2, timeLimit: 25,
    text: { kk: "«Суретші» — «Кенепке» қалай қатысты болса, «Мүсінші» — солай ___ қатысты.", ru: "«Художник» относится к «Холсту», как «Скульптор» относится к ___." },
    options: { kk: ["Мұражай", "Балшық", "Қылқалам", "Галерея"], ru: ["Музей", "Глина", "Кисть", "Галерея"] },
    answerIndex: 1
  },
  {
    id: 15, domain: "verbal", difficulty: 3, timeLimit: 25,
    text: { kk: "Қай сөз артық? Меланхолия, Эйфория, Ностальгия, Термометр.", ru: "Какое слово лишнее? Меланхолия, Эйфория, Ностальгия, Термометр." },
    options: { kk: ["Меланхолия", "Эйфория", "Ностальгия", "Термометр"], ru: ["Меланхолия", "Эйфория", "Ностальгия", "Термометр"] },
    answerIndex: 3
  },
  {
    id: 16, domain: "verbal", difficulty: 3, timeLimit: 25,
    text: { kk: "Қай сөз артық? Пианино, Гитара, Скрипка, Труба, Барабан, Микротолқынды пеш.", ru: "Какое слово лишнее? Пианино, Гитара, Скрипка, Труба, Барабан, Микроволновка." },
    options: { kk: ["Пианино", "Труба", "Барабан", "Микротолқынды пеш"], ru: ["Пианино", "Труба", "Барабан", "Микроволновка"] },
    answerIndex: 3
  },
  {
    id: 66, domain: "verbal", difficulty: 5, timeLimit: 35,
    text: { kk: "Барлық логиктер — ойшыл. Кейбір ойшылдар — жазушы. Демек:", ru: "Все логики — мыслители. Некоторые мыслители — писатели. Следовательно:" },
    options: {
      kk: ["Барлық логиктер жазушы", "Кейбір логиктер жазушы", "Ешбір логик жазушы емес", "Жоғарыдағылардың ешқайсысын қорытындылауға болмайды"],
      ru: ["Все логики — писатели", "Некоторые логики — писатели", "Ни один логик не писатель", "Ничего из вышеперечисленного нельзя заключить"]
    },
    answerIndex: 3
  },
  {
    id: 70, domain: "verbal", difficulty: 5, timeLimit: 35,
    text: { kk: "Кейбір A — B. Ешбір B — C емес. Демек:", ru: "Некоторые A — это B. Ни одно B не является C. Следовательно:" },
    options: {
      kk: ["Кейбір A — C емес", "Барлық A — C", "Ешбір A — C емес", "Кейбір C — A"],
      ru: ["Некоторые A не являются C", "Все A являются C", "Ни одно A не является C", "Некоторые C являются A"]
    },
    answerIndex: 0
  },

  // ---------- MEMORY (есте сақтау) ----------
  {
    id: 21, domain: "memory", difficulty: 1, timeLimit: 20,
    text: { kk: "Мына тізбекті есте сақтап, таңдаңыз: 3, 7, 2", ru: "Запомни эту последовательность и выбери её: 3, 7, 2" },
    options: { kk: ["3, 7, 2", "7, 3, 2", "2, 7, 3", "3, 2, 7"], ru: ["3, 7, 2", "7, 3, 2", "2, 7, 3", "3, 2, 7"] },
    answerIndex: 0
  },
  {
    id: 22, domain: "memory", difficulty: 1, timeLimit: 20,
    text: { kk: "Мына тізбекті есте сақтап, таңдаңыз: 5, 9, 1", ru: "Запомни эту последовательность и выбери её: 5, 9, 1" },
    options: { kk: ["9, 5, 1", "5, 1, 9", "1, 9, 5", "5, 9, 1"], ru: ["9, 5, 1", "5, 1, 9", "1, 9, 5", "5, 9, 1"] },
    answerIndex: 3
  },
  {
    id: 23, domain: "memory", difficulty: 2, timeLimit: 20,
    text: { kk: "Мына тізбекті есте сақтап, таңдаңыз: 8, 1, 5, 4", ru: "Запомни эту последовательность и выбери её: 8, 1, 5, 4" },
    options: { kk: ["8, 1, 5, 4", "1, 8, 5, 4", "8, 5, 1, 4", "4, 5, 1, 8"], ru: ["8, 1, 5, 4", "1, 8, 5, 4", "8, 5, 1, 4", "4, 5, 1, 8"] },
    answerIndex: 0
  },
  {
    id: 24, domain: "memory", difficulty: 2, timeLimit: 20,
    text: { kk: "Мына тізбекті есте сақтап, таңдаңыз: 3, 6, 2, 9", ru: "Запомни эту последовательность и выбери её: 3, 6, 2, 9" },
    options: { kk: ["6, 3, 2, 9", "3, 2, 6, 9", "3, 6, 2, 9", "9, 2, 6, 3"], ru: ["6, 3, 2, 9", "3, 2, 6, 9", "3, 6, 2, 9", "9, 2, 6, 3"] },
    answerIndex: 2
  },
  {
    id: 25, domain: "memory", difficulty: 3, timeLimit: 25,
    text: { kk: "Мына тізбекті есте сақтап, таңдаңыз: 6, 3, 9, 1, 7", ru: "Запомни эту последовательность и выбери её: 6, 3, 9, 1, 7" },
    options: { kk: ["6, 3, 9, 1, 7", "3, 6, 9, 7, 1", "6, 9, 3, 1, 7", "7, 1, 9, 3, 6"], ru: ["6, 3, 9, 1, 7", "3, 6, 9, 7, 1", "6, 9, 3, 1, 7", "7, 1, 9, 3, 6"] },
    answerIndex: 0
  },
  {
    id: 27, domain: "memory", difficulty: 4, timeLimit: 30,
    text: { kk: "Тізбекті КЕРІ ретпен таңдаңыз: 2, 6, 4, 8", ru: "Выбери эту последовательность в ОБРАТНОМ порядке: 2, 6, 4, 8" },
    options: { kk: ["8, 4, 6, 2", "2, 6, 4, 8", "4, 6, 8, 2", "8, 6, 4, 2"], ru: ["8, 4, 6, 2", "2, 6, 4, 8", "4, 6, 8, 2", "8, 6, 4, 2"] },
    answerIndex: 0
  },
  {
    id: 28, domain: "memory", difficulty: 4, timeLimit: 30,
    text: { kk: "Тізбекті КЕРІ ретпен таңдаңыз: 1, 7, 3, 5", ru: "Выбери эту последовательность в ОБРАТНОМ порядке: 1, 7, 3, 5" },
    options: { kk: ["5, 3, 7, 1", "1, 7, 3, 5", "5, 7, 3, 1", "3, 5, 7, 1"], ru: ["5, 3, 7, 1", "1, 7, 3, 5", "5, 7, 3, 1", "3, 5, 7, 1"] },
    answerIndex: 0
  },
  {
    id: 29, domain: "memory", difficulty: 5, timeLimit: 35,
    text: { kk: "Тізбекті КЕРІ ретпен таңдаңыз: 5, 3, 8, 1, 9, 2", ru: "Выбери эту последовательность в ОБРАТНОМ порядке: 5, 3, 8, 1, 9, 2" },
    options: { kk: ["2, 9, 1, 8, 3, 5", "5, 3, 8, 1, 9, 2", "2, 1, 9, 8, 3, 5", "9, 2, 1, 8, 3, 5"], ru: ["2, 9, 1, 8, 3, 5", "5, 3, 8, 1, 9, 2", "2, 1, 9, 8, 3, 5", "9, 2, 1, 8, 3, 5"] },
    answerIndex: 0
  },

  // ---------- SPEED (өңдеу жылдамдығы) ----------
  {
    id: 31, domain: "speed", difficulty: 1, timeLimit: 20,
    text: { kk: "Мына жолда неше 'E' әрпі бар? EABECEDEFE", ru: "Сколько букв 'E' в этой строке? EABECEDEFE" },
    options: { kk: ["3", "4", "5", "6"], ru: ["3", "4", "5", "6"] },
    answerIndex: 2
  },
  {
    id: 32, domain: "speed", difficulty: 1, timeLimit: 20,
    text: { kk: "Қай сан ең үлкен? 47, 74, 44, 77, 71", ru: "Какое число наибольшее? 47, 74, 44, 77, 71" },
    options: { kk: ["74", "47", "77", "71"], ru: ["74", "47", "77", "71"] },
    answerIndex: 2
  },
  {
    id: 33, domain: "speed", difficulty: 2, timeLimit: 20,
    text: { kk: "Қай сан жетіспейді? 10, 20, ?, 40, 50", ru: "Какое число пропущено? 10, 20, ?, 40, 50" },
    options: { kk: ["25", "30", "35", "28"], ru: ["25", "30", "35", "28"] },
    answerIndex: 1
  },
  {
    id: 34, domain: "speed", difficulty: 2, timeLimit: 20,
    text: { kk: "Мына тізбекте неше жұп сан бар: 3, 8, 15, 22, 7, 4, 11, 16?", ru: "Сколько чётных чисел в: 3, 8, 15, 22, 7, 4, 11, 16?" },
    options: { kk: ["2", "3", "4", "5"], ru: ["2", "3", "4", "5"] },
    answerIndex: 2
  },
  {
    id: 35, domain: "speed", difficulty: 3, timeLimit: 25,
    text: { kk: "Мына тізбекте неше тақ сан бар: 4, 7, 11, 14, 19, 22, 23?", ru: "Сколько нечётных чисел в: 4, 7, 11, 14, 19, 22, 23?" },
    options: { kk: ["2", "3", "4", "5"], ru: ["2", "3", "4", "5"] },
    answerIndex: 2
  },
  {
    id: 36, domain: "speed", difficulty: 3, timeLimit: 25,
    text: { kk: "25×4 нешеге тең?", ru: "Чему равно 25×4?" },
    options: { kk: ["90", "95", "100", "105"], ru: ["90", "95", "100", "105"] },
    answerIndex: 2
  },
  {
    id: 37, domain: "speed", difficulty: 4, timeLimit: 30,
    text: { kk: "17×8 нешеге тең?", ru: "Чему равно 17×8?" },
    options: { kk: ["126", "134", "136", "144"], ru: ["126", "134", "136", "144"] },
    answerIndex: 2
  },
  {
    id: 39, domain: "speed", difficulty: 5, timeLimit: 35,
    text: { kk: "Пойыз сағатына 60 км жылдамдықпен жүреді. 40 минутта қанша км жол жүреді?", ru: "Поезд едет со скоростью 60 км/ч. Сколько км он проедет за 40 минут?" },
    options: { kk: ["35 км", "40 км", "45 км", "50 км"], ru: ["35 км", "40 км", "45 км", "50 км"] },
    answerIndex: 1
  },

  // ---------- Дополнительные сложные задания (уровень 5) ----------
  {
    id: 201, domain: "matrix", difficulty: 5, timeLimit: 55,
    text: { kk: "Әр ұяшықтың мәні = (жол нөмірі × баған нөмірі) mod 5. Жол 3, баған 3 ұяшығында қандай мән бар?", ru: "Значение каждой ячейки = (номер строки × номер столбца) mod 5. Какое значение в строке 3, столбце 3?" },
    options: { kk: ["1", "3", "4", "0"], ru: ["1", "3", "4", "0"] },
    answerIndex: 2
  },
  {
    id: 202, domain: "matrix", difficulty: 5, timeLimit: 55,
    text: { kk: "Тор сиқырлы шаршыны кодтайды (әр жол, баған және диагональ қосындысы 15-ке тең). Жоғарғы жол: 2, 7, 6. Сол жақ баған жалғасады: 9, ?, 4. Жетіспейтін мән қандай?", ru: "Сетка кодирует магический квадрат (все строки, столбцы и диагонали дают сумму 15). Верхняя строка: 2, 7, 6. Левый столбец продолжается: 9, ?, 4. Какое значение пропущено?" },
    options: { kk: ["5", "3", "8", "1"], ru: ["5", "3", "8", "1"] },
    answerIndex: 0
  },
  {
    id: 203, domain: "verbal", difficulty: 5, timeLimit: 35,
    text: { kk: "«Оспадарсыздық» сөзінің мағынасы неге жақын?", ru: "«Эфемерный» ближе всего по значению к:" },
    options: {
      kk: ["Мызғымас, тұрақты", "Қысқа өмірлі, өткінші", "Ашық, айқын", "Қатал, қатаң"],
      ru: ["Прочный, устойчивый", "Кратковременный, мимолётный", "Явный, очевидный", "Суровый, строгий"]
    },
    answerIndex: 1
  },
  {
    id: 204, domain: "verbal", difficulty: 5, timeLimit: 40,
    text: { kk: "Барлық P — Q. Кейбір Q — R. Ешбір R — S емес. Мыналардың қайсысы міндетті түрде дұрыс?", ru: "Все P — это Q. Некоторые Q — это R. Ни одно R не является S. Что из этого определённо верно?" },
    options: {
      kk: ["Барлық P — S", "Кейбір P — S емес болуы мүмкін", "Ешбір P — Q емес", "Барлық S — P"],
      ru: ["Все P — это S", "Некоторые P могут не быть S", "Ни одно P не является Q", "Все S — это P"]
    },
    answerIndex: 1
  },
  {
    id: 205, domain: "memory", difficulty: 5, timeLimit: 40,
    text: { kk: "Мына 7 таңбалы тізбекті есте сақтап, таңдаңыз: 3, 1, 4, 1, 5, 9, 2", ru: "Запомни эту 7-значную последовательность и выбери её: 3, 1, 4, 1, 5, 9, 2" },
    options: {
      kk: ["3, 1, 4, 1, 5, 9, 2", "3, 1, 4, 5, 1, 9, 2", "1, 3, 4, 1, 5, 9, 2", "3, 1, 4, 1, 5, 2, 9"],
      ru: ["3, 1, 4, 1, 5, 9, 2", "3, 1, 4, 5, 1, 9, 2", "1, 3, 4, 1, 5, 9, 2", "3, 1, 4, 1, 5, 2, 9"]
    },
    answerIndex: 0
  },
  {
    id: 206, domain: "memory", difficulty: 5, timeLimit: 40,
    text: { kk: "Есте сақта: 7, 2, 9, 4, 6, 1, 3. Тізбектегі 2-ші және 5-ші сандардың қосындысы қандай?", ru: "Запомни: 7, 2, 9, 4, 6, 1, 3. Какова сумма 2-го и 5-го чисел в последовательности?" },
    options: { kk: ["8", "11", "6", "10"], ru: ["8", "11", "6", "10"] },
    answerIndex: 1
  },
  {
    id: 207, domain: "speed", difficulty: 5, timeLimit: 40,
    text: { kk: "23×47 нешеге тең?", ru: "Чему равно 23×47?" },
    options: { kk: ["1081", "1071", "1091", "1061"], ru: ["1081", "1071", "1091", "1061"] },
    answerIndex: 0
  },
  {
    id: 208, domain: "speed", difficulty: 5, timeLimit: 40,
    text: { kk: "Егер x + y = 10 және x × y = 21 болса, x² + y² нешеге тең?", ru: "Если x + y = 10 и x × y = 21, чему равно x² + y²?" },
    options: { kk: ["58", "52", "64", "46"], ru: ["58", "52", "64", "46"] },
    answerIndex: 0
  }
];

// Веса доменов для композитного IQ (по методологии Condon & Revelle, 2014 / ICAR)
const DOMAIN_WEIGHTS = { matrix: 0.35, verbal: 0.25, memory: 0.20, speed: 0.20 };
const DOMAIN_INFO = {
  matrix: { icon: "ic-cube", name: { kk: "Матрицалар", ru: "Матрицы" } },
  verbal: { icon: "ic-book", name: { kk: "Вербалды", ru: "Вербальный" } },
  memory: { icon: "ic-phone", name: { kk: "Есте сақтау", ru: "Память" } },
  speed: { icon: "ic-sigma", name: { kk: "Жылдамдық", ru: "Скорость" } }
};

// Каналы-спонсоры для гейта подписки
const SPONSOR_CHANNELS = [
  { username: "estesakta_mus", name: "ESTE SAKTA", icon: "ic-megaphone", members: "21K" }
];
