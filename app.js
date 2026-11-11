(function () {
  "use strict";

  // Слова из пособия «Подбери картинку»; «Транспорт», «Музыкальные инструменты» и «Школьные принадлежности» подобрал Claude. Для каждого слова есть foto/<слово>.jpg
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
    { name: "Действия", cover: "читает", words: ["читает", "пьёт", "ест", "спит", "режет", "поливает", "моет", "звонит"] }
  ];

  var PRAISE = ["Вы хорошо поработали!", "Хорошая работа!", "Отличное занятие!"];

  var STORAGE_KEY = "slovo-za-slovom";
  var APP_ID = "slovo-za-slovom";
  var COUNTS = [2, 3, 4];
  var DEFAULT_COUNT = 3;
  // Задания: «picture» — слово сверху, выбрать картинку; «word» — картинка сверху, выбрать слово
  var MODES = ["picture", "word"];
  var DEFAULT_MODE = "picture";
  var NEXT_DELAY_MS = 1000;

  var saved = loadSettings();
  var picturesCount = saved.picturesCount;
  var mode = saved.mode;
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

  // Браузер может запретить хранение (например, режим инкогнито) — тогда работаем без него
  function loadSettings() {
    var result = { picturesCount: DEFAULT_COUNT, mode: DEFAULT_MODE };
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && isValidCount(stored.picturesCount)) { result.picturesCount = stored.picturesCount; }
      if (stored && isValidMode(stored.mode)) { result.mode = stored.mode; }
    } catch (e) { /* остаются значения по умолчанию */ }
    return result;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ picturesCount: picturesCount, mode: mode }));
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

  function modeName(value) {
    return value === "word" ? "«Картинка — слово»" : "«Найди картинку»";
  }

  function renderMode() {
    document.querySelectorAll(".mode__btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
    });
    el.countTitle.textContent = mode === "word" ? "Слов на экране" : "Картинок на экране";
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
    el.status.textContent = "";
    show(el.home);
  }

  function startLesson(chosen) {
    clearNextTimer();
    theme = chosen;
    queue = shuffle(theme.words);
    position = 0;
    theme.words.forEach(function (word) {
      new Image().src = photo(word);
    });
    show(el.task);
    renderTask();
  }

  function renderTask() {
    var word = queue[position];
    var others = shuffle(theme.words.filter(function (item) { return item !== word; }));
    var shown = shuffle([word].concat(others.slice(0, picturesCount - 1)));

    var wordMode = mode === "word";

    el.word.textContent = word;
    el.word.hidden = wordMode;
    fitWord();
    el.picture.hidden = !wordMode;
    if (wordMode) { el.pictureImg.src = photo(word); }
    el.counter.textContent = (position + 1) + " из " + queue.length;
    el.options.dataset.count = String(picturesCount);
    el.options.classList.toggle("options--words", wordMode);
    el.options.textContent = "";

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
      }

      button.addEventListener("click", function () { answer(button, item === word); });
      button.addEventListener("animationend", function () { button.classList.remove("is-wrong"); });
      el.options.appendChild(button);
    });
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
      el.themes.appendChild(button);
    });
  }

  function downloadCopy() {
    var data = JSON.stringify({ app: APP_ID, version: 2, picturesCount: picturesCount, mode: mode }, null, 2);
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
        setCount(data.picturesCount);
        el.status.textContent = "Копия загружена. Задание " + modeName(mode) + ", вариантов на экране: " + data.picturesCount + ".";
      } else {
        el.status.textContent = wrongFile;
      }
    };
    reader.onerror = function () { el.status.textContent = wrongFile; };
    reader.readAsText(file);
  }

  document.querySelectorAll(".mode__btn").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
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

  // Работа без интернета. Если файл открыт прямо с диска, браузер этого не умеет
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* приложение работает и без него */ });
  }
})();
