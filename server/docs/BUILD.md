# Сборка TinyTrack из исходников

## Требования

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| gcc | ≥ 9 | компилятор C11 |
| make | любая | сборка |
| autoconf | ≥ 2.69 | генерация configure |
| automake | ≥ 1.15 | генерация Makefile.in |
| libtool | любая | поддержка autotools |
| libssl-dev | любая | TLS (OpenSSL) |
| libncurses-dev | любая | ncurses dashboard |

**Ubuntu/Debian:**
```bash
sudo apt install gcc make autoconf automake libtool libssl-dev libncurses-dev
```

**openSUSE:**
```bash
sudo zypper install gcc make autoconf automake libtool libopenssl-devel ncurses-devel
```

**Fedora/RHEL:**
```bash
sudo dnf install gcc make autoconf automake libtool openssl-devel ncurses-devel
```

---

## Сборка

```bash
# После git clone (генерирует configure и Makefile.in)
./bootstrap.sh

# Конфигурация
./configure

# Сборка (параллельная)
make -j$(nproc)
```

Бинарники появятся в:
- `tinytd/tinytd`
- `gateway/tinytrack`
- `cli/tiny-cli`

---

## Опции configure

```bash
# Отладочная сборка
./configure CFLAGS="-g -O0 -DDEBUG"

# Без systemd journal
./configure --without-systemd

# Кастомный prefix
./configure --prefix=/opt/tinytrack
```

---

## Установка

```bash
sudo make install        # установить
sudo make uninstall      # удалить
```

---

## Очистка

```bash
make clean               # удалить объектные файлы
make distclean           # удалить всё включая configure
sh scripts/clean.sh      # полная очистка включая тестовые артефакты
```

---

## Проверка дистрибутива

```bash
make distcheck           # собрать, установить, протестировать в изолированном окружении
```
