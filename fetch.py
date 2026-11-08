# Записывает в data.json сегодняшнюю дату по времени Екатеринбурга.
# Запускается заданием на GitHub (.github/workflows/update.yml).
# Источник даты — часы сервера GitHub, сторонние сайты и ключи не нужны.
# Если что-то пошло не так, старый data.json остаётся нетронутым.

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA_FILE = Path(__file__).with_name("data.json")

# В Екатеринбурге нет перехода на летнее время, сдвиг всегда +5 часов
YEKATERINBURG = timezone(timedelta(hours=5))

MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]
WEEKDAYS = [
    "понедельник", "вторник", "среда", "четверг",
    "пятница", "суббота", "воскресенье",
]


def now():
    return datetime.now(YEKATERINBURG)


def build(moment):
    month = MONTHS[moment.month - 1]
    weekday = WEEKDAYS[moment.weekday()]
    return {
        "date": moment.strftime("%Y-%m-%d"),
        "day": moment.day,
        "month": month,
        "year": moment.year,
        "weekday": weekday,
        "text": f"{weekday}, {moment.day} {month} {moment.year} года",
        "timezone": "Екатеринбург (UTC+5)",
        "updated_at": moment.isoformat(timespec="seconds"),
        "updated_text": f"{moment.day} {month} в {moment:%H:%M}",
    }


def save(data):
    # Сначала пишем во временный файл: сбой на середине не испортит data.json
    temporary = DATA_FILE.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(temporary, DATA_FILE)


def main():
    try:
        data = build(now())
        save(data)
    except Exception as error:
        # Не роняем задание: приложение спокойно работает со старым файлом
        print(f"::warning::Дату обновить не удалось, data.json не менялся: {error}")
        return 0
    print(f"data.json обновлён: {data['text']}, {data['updated_text']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
