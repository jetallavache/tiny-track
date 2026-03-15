# TinyTrack Gateway Manual Test

Простой HTML/JS клиент для ручного тестирования tinytrack gateway.

## Использование

1. Запустите tinytrack gateway:
   ```bash
   ./tinytrack.bin --port 8080
   ```

2. Откройте `index.html` в браузере

3. Тестируйте:
   - **HTTP API**: нажмите "Fetch Metrics" для получения метрик через REST API
   - **WebSocket**: нажмите "Connect" для подключения к WebSocket (когда будет реализовано)

## Endpoints

- `GET /api/metrics/live` - получить последние метрики (JSON)
- `WS /ws` - WebSocket для real-time метрик (TODO)

## Примечания

- Убедитесь, что tinytd запущен и пишет данные в `/dev/shm/tinytd-live.dat`
- Проверьте CORS если запускаете с другого домена
