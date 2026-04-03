# TinyTrack Gateway — Manual Test Client

Простой HTML/JS клиент для ручного тестирования `tinytrack` gateway.

## Использование

1. Соберите проект и запустите `tinytd` + `tinytrack`:

   ```bash
   # в server/
   ./bootstrap.sh && ./configure && make

   ./tinytd/tinytd --no-daemon --config tests/tinytrack.conf-test &
   ./gateway/tinytrack --no-daemon --config tests/tinytrack.conf-test --port 4026 &
   ```

2. Запустите локальный HTTP-сервер и откройте клиент в браузере:

   ```bash
   cd tests/gateway/manual-test-client
   python3 -m http.server 8000
   # Откройте http://localhost:8000
   ```

3. В интерфейсе:
   - **Fetch Metrics** — получить последние метрики через HTTP API
   - **Connect** — подключиться к WebSocket и получать метрики в реальном времени
   - **Get Snapshot** — запросить текущий снимок метрик
   - **Get History** — запросить историю из кольцевого буфера (L1/L2/L3)

## Endpoints

- `GET /api/metrics/live` — последние метрики (JSON)
- `WS /websocket` — WebSocket для real-time метрик (proto v1/v2)

## Примечания

- `tinytd` должен быть запущен и писать данные в live-файл (путь из конфига)
- По умолчанию gateway слушает на `ws://0.0.0.0:4026`
- Для TLS используйте `wss://` в конфиге и передайте `tls_cert`/`tls_key`

## Очистка

```bash
pkill tinytd tinytrack
sh scripts/clean.sh
```
