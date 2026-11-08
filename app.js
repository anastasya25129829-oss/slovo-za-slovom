(function () {
  "use strict";

  // Слова из пособия «Подбери картинку». Для каждого слова есть foto/<слово>.jpg
  var THEMES = [
    { name: "Посуда", cover: "чашка", words: ["чашка", "ложка", "вилка", "нож", "тарелка", "чайник", "кастрюля", "сковорода", "стакан", "кувшин"] },
    { name: "Одежда", cover: "шапка", words: ["шапка", "куртка", "ботинки", "шарф", "платье", "брюки", "рубашка", "свитер", "перчатки", "носки"] },
    { name: "Продукты", cover: "яблоко", words: ["хлеб", "молоко", "яблоко", "сыр", "яйцо", "колбаса", "морковь", "банан", "рыба", "помидор"] },
    { name: "Мебель", cover: "стул", words: ["стол", "стул", "шкаф", "диван", "кровать", "кресло", "полка", "табурет", "зеркало", "вешалка"] }
  ];

  var PRAISE = ["Вы хорошо поработали!", "Хорошая работа!", "Отличное занятие!"];

  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

  var STORAGE_KEY = "slovo-za-slovom";
  var APP_ID = "slovo-za-slovom";
  var COUNTS = [2, 3, 4];
  var DEFAULT_COUNT = 3;
  var NEXT_DELAY_MS = 1000;

  var picturesCount = loadCount();
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
    counter: byId("counter"),
    options: byId("options"),
    skip: byId("skip"),
    praise: byId("praise"),
    status: byId("backup-status"),
    file: byId("backup-file"),
    today: byId("today"),
    todayNote: byId("today-note")
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

  function isValidCount(value) {
    return COUNTS.indexOf(value) !== -1;
  }

  // Браузер может запретить хранение (например, режим инкогнито) — тогда работаем без него
  function loadCount() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && isValidCount(saved.picturesCount)) {
        return saved.picturesCount;
      }
    } catch (e) { /* остаётся значение по умолчанию */ }
    return DEFAULT_COUNT;
  }

  function saveCount() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ picturesCount: picturesCount }));
    } catch (e) { /* выбор действует до закрытия страницы */ }
  }

  function setCount(value) {
    picturesCount = value;
    saveCount();
    renderCount();
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
    loadToday();
  }

  function deviceDateId(date) {
    var month = String(date.getMonth() + 1);
    var day = String(date.getDate());
    return date.getFullYear() + "-" + (month.length < 2 ? "0" : "") + month + "-" + (day.length < 2 ? "0" : "") + day;
  }

  function deviceDateText(date) {
    return WEEKDAYS[date.getDay()] + ", " + date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear() + " года";
  }

  function showToday(text, note) {
    el.today.textContent = "Сегодня " + text;
    el.todayNote.textContent = note;
  }

  function isValidToday(data) {
    return Boolean(data) && typeof data.date === "string" && typeof data.text === "string" && typeof data.updated_text === "string";
  }

  // Сначала дата по часам устройства, чтобы строка не была пустой, пока идёт загрузка.
  // Устаревшую дату из data.json не показываем: неверное число на занятии только запутает
  function loadToday() {
    var now = new Date();
    showToday(deviceDateText(now), "");
    fetch("data.json", { cache: "no-store" }).then(function (response) {
      if (!response.ok) { throw new Error("data.json не загрузился"); }
      return response.json();
    }).then(function (data) {
      if (!isValidToday(data)) { throw new Error("data.json не подошёл"); }
      if (data.date === deviceDateId(now)) {
        showToday(data.text, "Обновлено " + data.updated_text);
      } else {
        showToday(deviceDateText(now), "Дата по часам устройства. На сайте данные от " + data.updated_text + ".");
      }
    }).catch(function () {
      showToday(deviceDateText(now), "Не удалось загрузить дату с сайта, показана дата по часам устройства.");
    });
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

    el.word.textContent = word;
    el.counter.textContent = (position + 1) + " из " + queue.length;
    el.options.dataset.count = String(picturesCount);
    el.options.textContent = "";

    shown.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pick";
      button.dataset.word = item;
      button.setAttribute("aria-label", item);

      var image = document.createElement("img");
      image.src = photo(item);
      image.alt = "";
      button.appendChild(image);

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

      button.appendChild(image);
      button.appendChild(label);
      button.addEventListener("click", function () { startLesson(item); });
      el.themes.appendChild(button);
    });
  }

  function downloadCopy() {
    var data = JSON.stringify({ app: APP_ID, version: 1, picturesCount: picturesCount }, null, 2);
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
        setCount(data.picturesCount);
        el.status.textContent = "Копия загружена. Картинок на экране: " + data.picturesCount + ".";
      } else {
        el.status.textContent = wrongFile;
      }
    };
    reader.onerror = function () { el.status.textContent = wrongFile; };
    reader.readAsText(file);
  }

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

  renderThemes();
  renderCount();
  loadToday();

  // Работа без интернета. Если файл открыт прямо с диска, браузер этого не умеет
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* приложение работает и без него */ });
  }
})();
