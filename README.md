<div align="center">

<img src="docs/assets/logo.svg" alt="TinyTrack" width="480" />

<br/>

![Version](https://img.shields.io/badge/version-0.1.6-4A90D9?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-27AE60?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Linux-E67E22?style=flat-square)
![Language](https://img.shields.io/badge/language-C11-8E44AD?style=flat-square)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![WebSocket](https://img.shields.io/badge/protocol-WebSocket%20%2B%20TLS-16A085?style=flat-square)

**Lightweight Linux system metrics daemon with WebSocket streaming**

[Документация (RU)](docs/ru/) · [Documentation (EN)](docs/en/) · [Quick Start](#quick-start)

</div>

---

## Quick Start

```bash
# On host
./bootstrap.sh && ./configure && make
sudo make install
sudo systemctl start tinytd tinytrack

# In Docker
docker compose up -d
```

Connect to `ws://localhost:25015/websocket`

```bash
# CLI
tiny-cli status
tiny-cli metrics
tiny-cli history l1
tiny-cli dashboard

# Inside Docker container
docker compose exec tinytrack tiny-cli dashboard
```

---

## Documentation

| | Русский | English |
|---|---|---|
| Обзор / Overview | [docs/ru/overview.md](docs/ru/overview.md) | [docs/en/overview.md](docs/en/overview.md) |
| Установка / Install | [docs/ru/install.md](docs/ru/install.md) | [docs/en/install.md](docs/en/install.md) |
| Docker | [docs/ru/docker.md](docs/ru/docker.md) | [docs/en/docker.md](docs/en/docker.md) |
| Конфигурация / Configuration | [docs/ru/configuration.md](docs/ru/configuration.md) | [docs/en/configuration.md](docs/en/configuration.md) |
| Архитектура / Architecture | [docs/ru/architecture.md](docs/ru/architecture.md) | [docs/en/architecture.md](docs/en/architecture.md) |
| Устранение неполадок / Troubleshooting | [docs/ru/troubleshooting.md](docs/ru/troubleshooting.md) | [docs/en/troubleshooting.md](docs/en/troubleshooting.md) |

---

## License

MIT License — see [LICENSE](LICENSE)
