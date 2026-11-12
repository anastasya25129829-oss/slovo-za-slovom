(function () {
  "use strict";

  // Слова первых четырёх тем — из пособия «Подбери картинку», остальные подобрал Claude. Для каждого слова есть foto/<слово>.jpg
  var THEMES = [
    { name: "Посуда", cover: "чашка", words: ["чашка", "ложка", "вилка", "нож", "тарелка", "чайник", "кастрюля", "сковорода", "стакан", "кувшин"] },
    { name: "Одежда", cover: "свитер", words: ["футболка", "куртка", "юбка", "пиджак", "платье", "брюки", "рубашка", "свитер", "пальто", "шорты"] },
    { name: "Продукты", cover: "яблоко", words: ["хлеб", "молоко", "яблоко", "сыр", "яйцо", "колбаса", "морковь", "банан", "рыба", "помидор"] },
    { name: "Мебель", cover: "стул", words: ["стол", "стул", "шкаф", "диван", "кровать", "кресло", "полка", "табурет", "зеркало", "комод"] },
    { name: "Транспорт", cover: "автобус", words: ["автобус", "машина", "трамвай", "поезд", "самолёт", "велосипед", "корабль", "вертолёт", "мотоцикл", "трактор"] },
    { name: "Музыкальные инструменты", cover: "гитара", words: ["гитара", "скрипка", "барабан", "пианино", "труба", "балалайка", "аккордеон", "саксофон", "бубен", "арфа"] },
    { name: "Школьные принадлежности", cover: "рюкзак", words: ["ручка", "карандаш", "тетрадь", "книга", "линейка", "ластик", "ножницы", "рюкзак", "клей", "кисточка"] },
    { name: "Овощи", cover: "морковь", words: ["морковь", "помидор", "огурец", "картофель", "капуста", "лук", "свёкла", "перец", "кабачок", "чеснок"] },
    { name: "Фрукты", cover: "груша", words: ["яблоко", "банан", "груша", "апельсин", "лимон", "виноград", "слива", "персик", "ананас", "киви"] },
    { name: "Дикие животные", cover: "медведь", words: ["волк", "лиса", "медведь", "заяц", "ёж", "белка", "лось", "тигр", "слон", "жираф"] },
    { name: "Домашние животные", cover: "кошка", words: ["кошка", "собака", "корова", "лошадь", "свинья", "коза", "овца", "кролик", "осёл", "хомяк"] },
    { name: "Игрушки", cover: "мишка", words: ["мяч", "кукла", "мишка", "кубики", "пирамидка", "юла", "неваляшка", "матрёшка", "погремушка", "машинка"] },
    { name: "Техника", cover: "телевизор", words: ["холодильник", "телевизор", "стиральная машина", "пылесос", "утюг", "микроволновка", "телефон", "ноутбук", "фен", "миксер"] },
    { name: "Головные уборы", cover: "кепка", words: ["шапка", "кепка", "шляпа", "панама", "берет", "платок", "ушанка", "каска", "шлем", "фуражка"] },
    { name: "Инструменты", cover: "молоток", words: ["молоток", "отвёртка", "пила", "топор", "плоскогубцы", "гаечный ключ", "дрель", "лопата", "грабли", "рулетка"] },
    { name: "Обувь", cover: "кроссовки", words: ["ботинки", "сапоги", "туфли", "кроссовки", "тапочки", "валенки", "галоши", "кеды", "шлёпанцы", "босоножки"] },
    { name: "Вещи на каждый день", cover: "ключи", words: ["ключи", "очки", "часы", "кошелёк", "сумка", "зонт", "расчёска", "телефон", "фонарик"] },
    { name: "Ванная", cover: "полотенце", words: ["зубная щётка", "фен", "мыло", "полотенце", "шампунь", "ванна", "раковина", "зеркало", "губка", "туалетная бумага"] },
    { name: "Аптека и здоровье", cover: "таблетки", words: ["таблетки", "тонометр", "пластырь", "маска", "инвалидная коляска"] },
    { name: "Действия", cover: "читает", kind: "verb", words: ["читает", "пьёт", "ест", "спит", "режет", "поливает", "моет", "звонит"] }
  ];

  var PRAISE = ["Вы хорошо поработали!", "Хорошая работа!", "Отличное занятие!"];

  var STORAGE_KEY = "slovo-za-slovom";
  var APP_ID = "slovo-za-slovom";
  var COUNTS = [2, 3, 4];
  var DEFAULT_COUNT = 3;
  // Задания: «picture» — слово сверху, выбрать картинку; «word» — картинка сверху, выбрать слово;
  // «name» — только картинка, человек называет её сам, логопед открывает подсказку
  var MODES = ["picture", "word", "name"];
  var DEFAULT_MODE = "picture";
  // Варианты: «similar» — из той же темы (труднее), «easy» — из других тем (легче)
  var LEVELS = ["easy", "similar"];
  var DEFAULT_LEVEL = "similar";
  var LOAD_WAIT_MS = 4000;
  var NEXT_DELAY_MS = 1000;

  var saved = loadSettings();
  var picturesCount = saved.picturesCount;
  var mode = saved.mode;
  var level = saved.level;
  var hintStep = 0;
  var ruVoice = null;
  var theme = null;
  var queue = [];
  var position = 0;
  var locked = false;
  var nextTimer = null;

  var el = {
    home: byId("screen-home"),
    task: byId("screen-task"),
    praiseScreen: byId("screen-praise"),
    themes: byId("themes"),
    word: byId("word"),
    picture: byId("picture"),
    pictureImg: byId("picture-img"),
    countTitle: byId("count-title"),
    countBlock: byId("count-block"),
    levelBlock: byId("level-block"),
    speak: byId("speak"),
    nameArea: byId("name-area"),
    hintText: byId("hint-text"),
    hintBtn: byId("hint-btn"),
    linkStatus: byId("home-link-status"),
    counter: byId("counter"),
    options: byId("options"),
    skip: byId("skip"),
    praise: byId("praise"),
    status: byId("backup-status"),
    file: byId("backup-file")
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function photo(word) {
    return "foto/" + word + ".jpg";
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // Длинное слово («микроволновка») на узком экране не помещается: уменьшаем шрифт, пока слово не влезет
  function fitWord() {
    var word = el.word;
    word.style.fontSize = "";
    if (word.hidden) { return; }
    var size = parseFloat(getComputedStyle(word).fontSize);
    while (word.scrollWidth > word.clientWidth + 1 && size > 20) {
      size -= 2;
      word.style.fontSize = size + "px";
    }
  }

  window.addEventListener("resize", fitWord);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitWord); }

  function isValidCount(value) {
    return COUNTS.indexOf(value) !== -1;
  }

  function isValidMode(value) {
    return MODES.indexOf(value) !== -1;
  }

  function isValidLevel(value) {
    return LEVELS.indexOf(value) !== -1;
  }

  // Браузер может запретить хранение (например, режим инкогнито) — тогда работаем без него
  function loadSettings() {
    var result = { picturesCount: DEFAULT_COUNT, mode: DEFAULT_MODE, level: DEFAULT_LEVEL };
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && isValidCount(stored.picturesCount)) { result.picturesCount = stored.picturesCount; }
      if (stored && isValidMode(stored.mode)) { result.mode = stored.mode; }
      if (stored && isValidLevel(stored.level)) { result.level = stored.level; }
    } catch (e) { /* остаются значения по умолчанию */ }
    return result;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ picturesCount: picturesCount, mode: mode, level: level }));
    } catch (e) { /* выбор действует до закрытия страницы */ }
  }

  function setCount(value) {
    picturesCount = value;
    saveSettings();
    renderCount();
  }

  function setMode(value) {
    mode = value;
    saveSettings();
    renderMode();
  }

  function setLevel(value) {
    level = value;
    saveSettings();
    renderLevel();
  }

  function modeName(value) {
    if (value === "word") { return "«Картинка — слово»"; }
    if (value === "name") { return "«Назови сам»"; }
    return "«Найди картинку»";
  }

  function levelName(value) {
    return value === "easy" ? "из разных тем" : "из одной темы";
  }

  function renderLevel() {
    document.querySelectorAll(".level__btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.level === level ? "true" : "false");
    });
  }

  function renderMode() {
    document.querySelectorAll(".mode__btn[data-mode]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
    });
    el.countTitle.textContent = mode === "word" ? "Слов на экране" : "Картинок на экране";
    // В задании «Назови сам» вариантов нет — эти настройки не нужны
    el.countBlock.hidden = mode === "name";
    el.levelBlock.hidden = mode === "name";
  }

  function renderCount() {
    document.querySelectorAll(".count__btn").forEach(function (button) {
      var selected = Number(button.dataset.count) === picturesCount;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function show(screen) {
    [el.home, el.task, el.praiseScreen].forEach(function (item) {
      item.hidden = item !== screen;
    });
    window.scrollTo(0, 0);
  }

  function clearNextTimer() {
    if (nextTimer !== null) {
      clearTimeout(nextTimer);
      nextTimer = null;
    }
    locked = false;
  }

  function goHome() {
    clearNextTimer();
    stopSpeech();
    el.status.textContent = "";
    show(el.home);
  }

  function startLesson(chosen) {
    clearNextTimer();
    theme = chosen;
    queue = shuffle(theme.words);
    position = 0;
    preload(theme.words);
    el.linkStatus.textContent = "";
    show(el.task);
    renderTask();
  }

  function preload(words) {
    words.forEach(function (word) {
      new Image().src = photo(word);
    });
  }

  // Слова других тем для лёгкого уровня. Глаголы к глаголам, предметы к предметам;
  // слово, которое есть и в этой теме (например, «телефон»), не берём
  function otherWords() {
    var kind = theme.kind || "noun";
    var collect = function (sameKind) {
      var list = [];
      THEMES.forEach(function (item) {
        if (item === theme || (sameKind && (item.kind || "noun") !== kind)) { return; }
        item.words.forEach(function (word) {
          if (theme.words.indexOf(word) === -1 && list.indexOf(word) === -1) { list.push(word); }
        });
      });
      return list;
    };
    var list = collect(true);
    return list.length >= COUNTS[COUNTS.length - 1] ? list : collect(false);
  }

  function distractors(word) {
    var pool = level === "easy"
      ? otherWords()
      : theme.words.filter(function (item) { return item !== word; });
    return shuffle(pool).slice(0, picturesCount - 1);
  }

  // Пока фото не загрузились, варианты не видны: появляются все сразу, без пустых карточек
  function revealWhenLoaded(images) {
    var box = el.options;
    var left = images.length;
    var done = false;
    var reveal = function () {
      if (done) { return; }
      done = true;
      box.classList.remove("is-loading");
    };
    box.classList.add("is-loading");
    images.forEach(function (image) {
      if (image.complete) {
        left -= 1;
        return;
      }
      var finish = function () {
        left -= 1;
        if (left <= 0) { reveal(); }
      };
      image.addEventListener("load", finish);
      image.addEventListener("error", finish);
    });
    if (left <= 0) { reveal(); }
    setTimeout(reveal, LOAD_WAIT_MS);
  }

  function renderTask() {
    var word = queue[position];
    var wordMode = mode === "word";
    var nameMode = mode === "name";
    var shown = nameMode ? [] : shuffle([word].concat(distractors(word)));

    el.task.classList.toggle("screen--name", nameMode);
    el.word.textContent = word;
    el.word.hidden = wordMode || nameMode;
    fitWord();
    el.picture.hidden = !(wordMode || nameMode);
    if (wordMode || nameMode) { el.pictureImg.src = photo(word); }
    el.counter.textContent = (position + 1) + " из " + queue.length;
    el.options.hidden = nameMode;
    el.nameArea.hidden = !nameMode;
    el.skip.hidden = nameMode;
    el.options.dataset.count = String(picturesCount);
    el.options.classList.toggle("options--words", wordMode);
    el.options.textContent = "";

    hintStep = 0;
    renderHint();

    var images = [];
    shown.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = wordMode ? "pick pick--word" : "pick";
      button.dataset.word = item;

      if (wordMode) {
        button.textContent = item;
      } else {
        button.setAttribute("aria-label", item);
        var image = document.createElement("img");
        image.src = photo(item);
        image.alt = "";
        button.appendChild(image);
        images.push(image);
      }

      button.addEventListener("click", function () { answer(button, item === word); });
      button.addEventListener("animationend", function () { button.classList.remove("is-wrong"); });
      el.options.appendChild(button);
    });
    revealWhenLoaded(images);

    // Следующее слово грузим заранее
    var upcoming = queue[position + 1];
    if (upcoming) { preload([upcoming]); }
  }

  // Подсказка для «Назови сам»: первая буква → первый слог → всё слово
  var VOWELS = "аеёиоуыэюя";

  function firstSyllable(word) {
    var lower = word.toLowerCase();
    var seen = 0;
    for (var i = 0; i < lower.length; i++) {
      if (VOWELS.indexOf(lower.charAt(i)) !== -1) {
        seen += 1;
        // Слог из одной гласной («а-на-нас») слишком мал для подсказки — берём до следующей гласной
        if (i > 0 || seen > 1) { return word.slice(0, i + 1); }
      }
    }
    return word;
  }

  function hintSteps(word) {
    var steps = [word.charAt(0) + "…"];
    var syllable = firstSyllable(word);
    if (syllable.length > 1 && syllable !== word) { steps.push(syllable + "…"); }
    steps.push(word);
    return steps;
  }

  function renderHint() {
    var word = queue[position];
    if (mode !== "name" || !word) { return; }
    var steps = hintSteps(word);
    var full = hintStep >= steps.length;
    el.hintText.textContent = hintStep === 0 ? "" : steps[hintStep - 1];
    el.hintText.classList.toggle("is-full", full);
    el.hintBtn.disabled = full;
    el.hintBtn.textContent = hintStep === 0 ? "Подсказка" : (full ? "Слово открыто" : "Ещё подсказка");
  }

  function showHint() {
    var word = queue[position];
    if (!word || hintStep >= hintSteps(word).length) { return; }
    hintStep += 1;
    renderHint();
  }

  // Озвучка: встроенный голос телефона или компьютера. Нет русского голоса — кнопки нет
  function pickVoice() {
    if (!("speechSynthesis" in window)) { return; }
    var russian = window.speechSynthesis.getVoices().filter(function (voice) {
      return /^ru/i.test(voice.lang);
    });
    ruVoice = russian.filter(function (voice) { return voice.localService; })[0] || russian[0] || null;
    el.speak.hidden = !ruVoice;
  }

  function speak() {
    var word = queue[position];
    if (!ruVoice || !word) { return; }
    window.speechSynthesis.cancel();
    var phrase = new SpeechSynthesisUtterance(word);
    phrase.voice = ruVoice;
    phrase.lang = ruVoice.lang;
    phrase.rate = 0.8;
    window.speechSynthesis.speak(phrase);
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); }
  }

  // Ссылка для дома: сразу открывает эту тему с теми же настройками
  function homeLink() {
    var params = new URLSearchParams();
    params.set("tema", theme.name);
    params.set("zadanie", mode);
    if (mode !== "name") {
      params.set("variantov", String(picturesCount));
      params.set("uroven", level);
    }
    return location.origin + location.pathname + "?" + params.toString();
  }

  function copyHomeLink() {
    var link = homeLink();
    var fallback = function () {
      el.linkStatus.textContent = "Скопируйте ссылку и отправьте близким: " + decodeURI(link);
    };
    var copy = function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { fallback(); return; }
      navigator.clipboard.writeText(link).then(function () {
        el.linkStatus.textContent = "Ссылка скопирована. Вставьте её в сообщение близким — по ней сразу откроется тема «" + theme.name + "».";
      }, fallback);
    };
    // На телефоне открываем меню «Поделиться», чтобы сразу отправить в мессенджер
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title: "Слово за словом — " + theme.name, url: link }).catch(copy);
    } else {
      copy();
    }
  }

  // Открыли по ссылке для дома: применяем настройки из неё и сразу начинаем тему
  function startFromLink() {
    var params = new URLSearchParams(location.search);
    var name = params.get("tema");
    if (!name) { return; }
    var chosen = THEMES.filter(function (item) { return item.name === name; })[0];
    if (!chosen) { return; }
    var linkMode = params.get("zadanie");
    var linkCount = Number(params.get("variantov"));
    var linkLevel = params.get("uroven");
    if (isValidMode(linkMode)) { mode = linkMode; }
    if (isValidCount(linkCount)) { picturesCount = linkCount; }
    if (isValidLevel(linkLevel)) { level = linkLevel; }
    saveSettings();
    renderMode();
    renderCount();
    renderLevel();
    startLesson(chosen);
  }

  function answer(button, isRight) {
    if (locked) { return; }
    if (isRight) {
      locked = true;
      button.classList.add("is-right");
      nextTimer = setTimeout(function () {
        clearNextTimer();
        next();
      }, NEXT_DELAY_MS);
    } else {
      // Снимаем класс и задаём заново, чтобы фото качнулось и при повторном нажатии
      button.classList.remove("is-wrong");
      void button.offsetWidth;
      button.classList.add("is-wrong");
    }
  }

  function next() {
    position += 1;
    stopSpeech();
    if (position >= queue.length) {
      el.praise.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      show(el.praiseScreen);
    } else {
      renderTask();
    }
  }

  function renderThemes() {
    THEMES.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "theme";

      var image = document.createElement("img");
      image.src = photo(item.cover);
      image.alt = "";

      var label = document.createElement("span");
      label.textContent = item.name;
      // Длинное название из двух слов: чуть мельче, чтобы не вылезало за плитку
      if (item.name.length > 12) { button.classList.add("theme--long"); }

      button.appendChild(image);
      button.appendChild(label);
      button.addEventListener("click", function () { startLesson(item); });
      // Палец коснулся темы — начинаем грузить её фото, пока он ещё не поднялся
      button.addEventListener("pointerdown", function () { preload(item.words); });
      el.themes.appendChild(button);
    });
  }

  function downloadCopy() {
    var data = JSON.stringify({ app: APP_ID, version: 3, picturesCount: picturesCount, mode: mode, level: level }, null, 2);
    var url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "slovo-za-slovom-kopiya.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    el.status.textContent = "Копия скачана.";
  }

  function loadCopy(file) {
    var wrongFile = "Этот файл не подошёл. Выберите файл, скачанный кнопкой «Скачать копию данных».";
    var reader = new FileReader();
    reader.onload = function () {
      var data = null;
      try {
        data = JSON.parse(reader.result);
      } catch (e) { /* ниже покажем сообщение */ }
      if (data && data.app === APP_ID && isValidCount(data.picturesCount)) {
        // В копиях первой версии задания нет: тогда оставляем выбранное сейчас
        if (isValidMode(data.mode)) { setMode(data.mode); }
        if (isValidLevel(data.level)) { setLevel(data.level); }
        setCount(data.picturesCount);
        el.status.textContent = "Копия загружена. Задание " + modeName(mode) + ", вариантов на экране: " + data.picturesCount + ", варианты " + levelName(level) + ".";
      } else {
        el.status.textContent = wrongFile;
      }
    };
    reader.onerror = function () { el.status.textContent = wrongFile; };
    reader.readAsText(file);
  }

  document.querySelectorAll(".mode__btn[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
  });

  document.querySelectorAll(".level__btn").forEach(function (button) {
    button.addEventListener("click", function () { setLevel(button.dataset.level); });
  });

  document.querySelectorAll(".count__btn").forEach(function (button) {
    button.addEventListener("click", function () { setCount(Number(button.dataset.count)); });
  });

  byId("to-themes").addEventListener("click", goHome);
  byId("other-theme").addEventListener("click", goHome);
  byId("again").addEventListener("click", function () { startLesson(theme); });
  el.skip.addEventListener("click", function () {
    if (!locked) { next(); }
  });
  el.speak.addEventListener("click", speak);
  el.hintBtn.addEventListener("click", showHint);
  byId("name-next").addEventListener("click", function () { next(); });
  byId("home-link").addEventListener("click", copyHomeLink);
  byId("backup-save").addEventListener("click", downloadCopy);
  byId("backup-load").addEventListener("click", function () { el.file.click(); });
  el.file.addEventListener("change", function () {
    if (el.file.files[0]) { loadCopy(el.file.files[0]); }
    el.file.value = "";
  });

  // Долгое нажатие и правый клик на картинке или кнопке не открывают меню телефона
  document.addEventListener("contextmenu", function (event) {
    if (event.target.closest && event.target.closest("img, .pick, .theme")) {
      event.preventDefault();
    }
  });

  renderThemes();
  renderMode();
  renderCount();
  renderLevel();

  pickVoice();
  if ("speechSynthesis" in window && "onvoiceschanged" in window.speechSynthesis) {
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
  }

  startFromLink();

  // Работа без интернета. Если файл открыт прямо с диска, браузер этого не умеет
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* приложение работает и без него */ });
  }
})();
