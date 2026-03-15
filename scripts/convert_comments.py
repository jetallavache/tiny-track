#!/usr/bin/env python3
"""Convert // comments to /* */ and translate Russian comments to English."""

import os, re, sys

TRANSLATIONS = {
    "Можно продолжить показывать старые данные или выйти": "Can continue showing stale data or exit",
    "Прочитать значение из INI в буфер": "Read a value from INI into a buffer",
    "Возвращает 0 при успехе, -1 при ошибке": "Returns 0 on success, -1 on error",
    "Получить путь к live mmap файлу": "Get path to the live mmap file",
    "Приоритет: env -> config -> default": "Priority: env -> config -> default",
    "Получить путь к shadow mmap файлу": "Get path to the shadow mmap file",
    "Получить путь к конфигу": "Get path to the config file",
    "Убрать пробелы в начале и конце": "Trim leading and trailing whitespace",
    "Разбить ключ на section.key": "Split key into section.key",
    "Пропустить пустые строки и комментарии": "Skip empty lines and comments",
    "Секция [name]": "Section [name]",
    "Ключ = значение": "Key = value",
    "Проверка совпадения": "Check for match",
    "Копировать в буфер пользователя": "Copy into user buffer",
    "Успех": "Success",
    "Не найдено": "Not found",
    "Дефолтные пути": "Default paths",
    "Кэш для путей (чтобы не читать конфиг каждый раз)": "Path cache (to avoid reading config on every call)",
    "Если уже кэшировано": "If already cached",
    "1. Переменная окружения": "1. Environment variable",
    "2. Конфиг файл": "2. Config file",
    "3. Дефолт": "3. Default",
    "Приоритет: env -> ~/.tinytrack.conf -> /etc/tinytrack/tinytrack.conf": "Priority: env -> ~/.tinytrack.conf -> /etc/tinytrack/tinytrack.conf",
    "Проверить домашнюю директорию": "Check home directory",
    "Прочитать целое число из конфига": "Read an integer from config",
    "Прочитать булево значение из конфига": "Read a boolean value from config",
    "Прочитать строку в буфер": "Read a string into a buffer",
    "Преобразовать строку уровня лога в tt_log_level_t": "Convert log level string to tt_log_level_t",
    "Поддержка различных форматов": "Support various formats",
    "Попробовать как число": "Try as a number",
    "Таймер": "Timer",
    "Период таймера в миллисекундах": "Timer period in milliseconds",
    "Истечение срока действия в миллисекундах": "Expiration time in milliseconds",
    "Список установленных флагов": "Set of active flags",
    "Вызвать функцию один раз": "Call function once",
    "Периодический вызов": "Periodic call",
    "Вызов функции сразу после установки таймера": "Call function immediately after timer is set",
    "Функция таймера была вызвана хотя бы один раз": "Timer function has been called at least once",
    "Вызвать s_free() в конце выполнения": "Call s_free() at the end of execution",
    "Функция обратного вызова": "Callback function",
    "Её аргументы": "Its arguments",
    "Указатель на следующий экземпляр таймера": "Pointer to the next timer instance",
    "Seqlock: начало записи": "Seqlock: begin write",
    "Seqlock: конец записи": "Seqlock: end write",
    "Magic number для валидации": "Magic number for validation",
    "Размеры блоков": "Block sizes",
    "Главный заголовок файла - 256 bytes": "Main file header - 256 bytes",
    "CRC32 всего файла": "CRC32 of the entire file",
    "Timestamp последнего обновления (heartbeat)": "Timestamp of last update (heartbeat)",
    "Timestamp последней синхронизации": "Timestamp of last shadow sync",
    "PID writer процесса": "PID of the writer process",
    "Количество активных consumers": "Number of active consumers",
    "Выравнивание до 256 байт": "Padding to 256 bytes",
    "Запись о consumer - 64 bytes": "Consumer record - 64 bytes",
    "PID процесса": "Process PID",
    "Позиция чтения в L1": "Read position in L1",
    "Позиция чтения в L2": "Read position in L2",
    "Позиция чтения в L3": "Read position in L3",
    "Последняя активность": "Last activity timestamp",
    "Флаги": "Flags",
    "Выравнивание до 64 байт": "Padding to 64 bytes",
    "Таблица consumers": "Consumer table",
    "Метаданные кольцевого буфера - 64 bytes": "Ring buffer metadata - 64 bytes",
    "Sequence counter для seqlock": "Sequence counter for seqlock",
    "Позиция записи": "Write position",
    "Позиция чтения (для single consumer)": "Read position (for single consumer)",
    "Размер в элементах": "Capacity in elements",
    "Размер одного элемента": "Size of one element",
    "Timestamp первого элемента": "Timestamp of the first element",
    "Timestamp последнего элемента": "Timestamp of the last element",
    "Полный layout mmap файла": "Full mmap file layout",
    "Динамический размер": "Dynamic size",
    "L2 и L3 идут после L1_data": "L2 and L3 follow L1_data",
    "Вычисление смещений": "Offset calculation",
    "Seqlock: читаем с retry": "Seqlock: read with retry",
    "Writer: начать запись": "Writer: begin write",
    "Writer: завершить запись": "Writer: end write",
    "Reader: начать чтение": "Reader: begin read",
    "Ждем четное значение": "Wait for even value",
    "Reader: проверить консистентность": "Reader: check consistency",
    "Внутреннее состояние логирования": "Internal logging state",
    "Специфичные данные backend": "Backend-specific data",
    "Уровни логирования (совместимы с syslog/systemd)": "Log levels (compatible with syslog/systemd)",
    "Backend типы": "Backend types",
    "Вывод в stderr (для CLI)": "Output to stderr (for CLI)",
    "Вывод в stdout (для Docker)": "Output to stdout (for Docker)",
    "Традиционный syslog": "Traditional syslog",
    "systemd journal (приоритет для демона)": "systemd journal (preferred for daemon)",
    "Автовыбор: journal → syslog → stderr": "Auto-select: journal -> syslog -> stderr",
    "Конфигурация логирования": "Logging configuration",
    "Минимальный уровень для вывода": "Minimum level for output",
    "Идентификатор приложения": "Application identifier",
    "Асинхронная запись (буферизация)": "Async write (buffering)",
    "Инициализация системы логирования": "Initialize logging system",
    "Основная функция логирования": "Main logging function",
    "Логирование с метаданными (file, line, func)": "Logging with metadata (file, line, func)",
    "Структурированное логирование (для journal)": "Structured logging (for journal)",
    "Завершение работы (flush буферов)": "Shutdown (flush buffers)",
    "Макросы для удобства": "Convenience macros",
    "Автовыбор backend": "Auto-select backend",
    "Инициализация выбранного backend": "Initialize selected backend",
    "Метаданные для DEBUG": "Metadata for DEBUG",
    "Проверяем доступность journal через наличие /run/systemd/journal": "Check journal availability via /run/systemd/journal",
    "Для journal не требуется специальная инициализация": "No special initialization required for journal",
    "Прямая запись в journal с метаданными": "Direct write to journal with metadata",
    "Нет необходимости в cleanup для journal": "No cleanup needed for journal",
    "syslog всегда доступен на POSIX": "syslog is always available on POSIX",
    "tt_log_level_t совместим с syslog priority": "tt_log_level_t is compatible with syslog priority",
    "Данные сообщения WebSocket": "WebSocket message data",
    "Флаги сообщения WebSocket": "WebSocket message flags",
    "Ошибка                           char *error_message": "Error                              char *error_message",
    "Соединение открыто               NULL": "Connection opened                  NULL",
    "Цикл mg_mgr_poll запущен         uint64_t *uptime_millis": "mg_mgr_poll loop running           uint64_t *uptime_millis",
    "Имя хоста разрешено              NULL": "Hostname resolved                  NULL",
    "Соединение установлено           NULL": "Connection established             NULL",
    "Соединение принято               NULL": "Connection accepted                NULL",
    "TLS handshake успешно            NULL": "TLS handshake complete             NULL",
    "Данные, полученные от сокета     long *bytes_read": "Data received from socket          long *bytes_read",
    "Данные, записанные в сокет       long *bytes_written": "Data written to socket             long *bytes_written",
    "Соединение закрыто               NULL": "Connection closed                  NULL",
    "Websocket handshake выполнено    struct mg_http_message": "WebSocket handshake complete       struct mg_http_message",
    "Websocket msg, text или bin      struct mg_ws_message *": "WebSocket msg, text or bin         struct mg_ws_message *",
    "Начальный идентификатор для событий пользователей": "Starting identifier for user events",
    "Указатель на сохраненные данные": "Pointer to stored data",
    "Доступный размер": "Available size",
    "Текущее количество байт": "Current byte count",
    "Выравнивание во время распределения": "Alignment during allocation",
    "Выходная функция": "Output function",
    "Автоматически удалять таймер": "Automatically delete timer",
    "Важно. Следующий звонок на опрос не будет касаться таймеров": "Important. Next poll call will not touch timers",
    "Адрес": "Address",
    "Менеджер": "Manager",
    "Следующий идентификатор подключения": "Next connection identifier",
    "Список активных соединений": "List of active connections",
    "Произвольный указатель пользовательских данных": "Arbitrary user data pointer",
    "Активные таймеры": "Active timers",
    "Соедниение": "Connection",
    "Указанная пользователем функция обработчика событий": "User-provided event handler function",
    "Указанный пользователем параметр этой функци": "User-provided parameter for this function",
    "Протокол-специфическая функция обработчика событий": "Protocol-specific event handler function",
    "Протокол-специфический параметр этой функции": "Protocol-specific parameter for this function",
    "Входящие данные": "Incoming data",
    "Исходящие данные": "Outgoing data",
    "Персональный интервал (1000, 5000, 10000)": "Per-connection interval (1000, 5000, 10000)",
    "Время последнего обновления": "Last update time",
    "Прослушиваем соединение": "Listening for connections",
    "Исходящее (клиентское) соединение": "Outgoing (client) connection",
    "Входящее (серверное) соединение": "Incoming (server) connection",
    "Выполнение неблокирующего соединения DNS разрешо": "Non-blocking DNS resolution in progress",
    "Неблокирующее соединение в процессе": "Non-blocking connect in progress",
    "Подключение с поддержкой TLS": "TLS-enabled connection",
    "TLS handshake в процессе": "TLS handshake in progress",
    "WebSocket-соединение": "WebSocket connection",
    "Закрыть и принудительно удалить соединение": "Close and forcibly remove connection",
    "Останавить чтение до тех пор, пока оно не будет очищено": "Stop reading until cleared",
    "Ответ все еще генерируется": "Response is still being generated",
    "Соединение готово к чтению": "Connection ready for reading",
    "Соединение готово к записи  ": "Connection ready for writing",
    "Соединение готово к записи": "Connection ready for writing",
    "Длина фрейма": "Frame length",
    "Последний бит -это бит маск": "Last bit is the mask bit",
    "Сначала обработчик протокола, затем пользовательский обработчик": "Protocol handler first, then user handler",
    "Установите is_closing перед отправкой TTG_EVENT_ERROR": "Set is_closing before sending TTG_EVENT_ERROR",
    "Пусть обработчик пользователя переопределяет это": "Let user handler override this",
    "Существует ли реализация xprintf в стандартных библиотеках?": "Does xprintf implementation exist in standard libraries?",
    "Использовать пути из config system": "Use paths from config system",
    "Установить дефолты": "Set defaults",
    "Если файл не указан, использовать системный": "If no path given, use system default",
    "Попробовать открыть файл": "Try to open the file",
    "Файл не найден - использовать дефолты": "File not found - use defaults",
    "Writer thread: пишет монотонно возрастающие значения": "Writer thread: writes monotonically increasing values",
    "Reader thread: проверяет консистентность данных": "Reader thread: checks data consistency",
    "Проверка консистентности: все поля должны быть из одного sample": "Consistency check: all fields must come from the same sample",
    "Запуск writer": "Start writer",
    "Запуск readers": "Start readers",
    "Ждем": "Wait",
    "Завершение": "Shutdown",
    "Результаты": "Results",
    "Заполняем данными": "Fill with data",
    "Reader с подсчетом retry": "Reader with retry counting",
    "Эмуляция retry подсчета через повторные чтения": "Emulate retry counting via repeated reads",
    "[deamon]": "[daemon]",
    "[collection]": "[collection]",
    "[storage]": "[storage]",
    "[ringbuffer]": "[ringbuffer]",
    "[recovery]": "[recovery]",
    "[gateway]": "[gateway]",
    "rw-r--r-- - readable by all": "rw-r--r-- - readable by all",
    "Отправить оставшиеся данные, затем закрыть и": "Send remaining data, then close and",
    "освободить память": "free memory",
    "данные клиента: интервал, алерты": "client data: interval, alerts",
    "стейт клиента": "client state",
}


def translate(text):
    for ru, en in TRANSLATIONS.items():
        text = text.replace(ru, en)
    return text


def convert_line_comments(line):
    stripped = line.rstrip('\n')
    # Pure // comment line
    m = re.match(r'^(\s*)//\s?(.*)', stripped)
    if m:
        indent, text = m.group(1), m.group(2).rstrip()
        return f"{indent}/* {text} */\n" if text else f"{indent}/* */\n"
    # Inline // comment after code
    in_str = in_chr = False
    i = 0
    while i < len(stripped):
        c = stripped[i]
        if c == '\\' and (in_str or in_chr):
            i += 2; continue
        if c == '"' and not in_chr: in_str = not in_str
        elif c == "'" and not in_str: in_chr = not in_chr
        elif c == '/' and not in_str and not in_chr:
            if i + 1 < len(stripped) and stripped[i+1] == '/':
                code = stripped[:i].rstrip()
                text = stripped[i+2:].strip()
                return f"{code}  /* {text} */\n" if text else stripped + '\n'
        i += 1
    return line


def process(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    # Translate Russian text anywhere (inside /* */ or // or plain)
    new = translate(content)
    # Convert remaining // comments to /* */
    lines = new.split('\n')
    result = [convert_line_comments(l + '\n').rstrip('\n') if '//' in l else l for l in lines]
    new = '\n'.join(result)
    if new != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
        return True
    return False


root = sys.argv[1] if len(sys.argv) > 1 else '.'
changed = []
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if not d.startswith('.') and d != '.deps']
    for fn in fns:
        if fn.endswith(('.c', '.h')):
            fp = os.path.join(dp, fn)
            if process(fp):
                changed.append(fp)

for f in changed:
    print(f"  updated: {f}")
print(f"\nTotal: {len(changed)} files updated")
