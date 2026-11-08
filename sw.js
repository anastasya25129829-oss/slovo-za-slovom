// Работа без интернета: при установке все файлы приложения сохраняются на устройстве.
// ПРИ КАЖДОЙ ВЫКЛАДКЕ ПОВЫШАЙ НОМЕР ВЕРСИИ, иначе телефон будет показывать старую версию.
const VERSION = 2;

const PREFIX = "slovo-za-slovom-v";
const CACHE = PREFIX + VERSION;
const FONT_CACHE = "slovo-za-slovom-fonts";

const WORDS = [
  "чашка", "ложка", "вилка", "нож", "тарелка", "чайник", "кастрюля", "сковорода", "стакан", "кувшин",
  "шапка", "куртка", "ботинки", "шарф", "платье", "брюки", "рубашка", "свитер", "перчатки", "носки",
  "хлеб", "молоко", "яблоко", "сыр", "яйцо", "колбаса", "морковь", "банан", "рыба", "помидор",
  "стол", "стул", "шкаф", "диван", "кровать", "кресло", "полка", "табурет", "зеркало", "вешалка"
];

const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
].concat(WORDS.map(function (word) { return "foto/" + word + ".jpg"; }));

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // cache: "reload" — брать свежие файлы с сайта, а не из памяти браузера
      return cache.addAll(FILES.map(function (file) {
        return new Request(file, { cache: "reload" });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (name) {
        return name.indexOf(PREFIX) === 0 && name !== CACHE;
      }).map(function (name) {
        return caches.delete(name);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Шрифт подгружается с Google: один раз скачали — дальше берём сохранённый
function fromFontCache(request) {
  return caches.open(FONT_CACHE).then(function (cache) {
    return cache.match(request).then(function (saved) {
      return saved || fetch(request).then(function (response) {
        if (response.ok) { cache.put(request, response.clone()); }
        return response;
      });
    });
  });
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") { return; }

  const url = new URL(request.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(fromFontCache(request));
    return;
  }
  if (url.origin !== self.location.origin) { return; }

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (saved) {
        if (saved) { return saved; }
        if (request.mode === "navigate") {
          return cache.match("./").then(function (page) { return page || fetch(request); });
        }
        return fetch(request);
      });
    })
  );
});
