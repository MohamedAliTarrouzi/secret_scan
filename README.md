# SecretScan

SecretScan is a web application for detecting exposed secrets in source code. It combines configurable regular-expression rules, allowlists, optional LLM review for ambiguous findings, a React dashboard, SQLite scan history, and GitHub App integration.

## What it scans

- Inline text
- Single-file uploads
- Multiple files or folders uploaded from the browser
- `.zip`, `.tar`, `.tar.gz`, and `.tgz` archives
- Repositories accessible through a connected GitHub App installation

The scanner reports each finding with its category, severity, confidence, entropy, code context, and, when enabled, an LLM review verdict.

## Key features

- Configurable regex patterns stored in `backend/data/regex_patterns.json`
- Path and value allowlists in `backend/data/allowlist.json`
- Archive filtering before file contents are read
- Severity summary and pipeline status (`BLOCKED`, `WARNING`, or `INFO`)
- Persistent history stored through SQLAlchemy and SQLite
- GitHub OAuth connection and GitHub App installation scanning
- Optional LiteLLM-based review of ambiguous findings
- React/Vite frontend with Tailwind CSS

## Architecture

```text
Browser (React + Vite)
        |
        v
FastAPI API (/api)
        |
        +-- scan orchestrator
        |     +-- regex engine + allowlist
        |     +-- archive scanner
        |     +-- GitHub repository scanner
        |     `-- optional LiteLLM review
        |
        `-- SQLite (scan reports, findings, GitHub users, OAuth state)
```

## Project structure

```text
backend/
  app/
    api/endpoints.py       FastAPI routes
    services/              scanning, GitHub, regex, and LLM services
    models/                SQLAlchemy models
    data/                  active regex rules, backup rules, and allowlist
  tests/                   regex-engine tests
  benchmark/               benchmark data and evaluation scripts
frontend/
  src/                     React pages, components, API clients, and styles
docker-compose.yml         local frontend, backend, and LiteLLM services
```

## Requirements

- Docker Desktop with Docker Compose, or
- Python 3.11+ and Node.js 20+

## Run with Docker Compose

Create `backend/.env` with the values needed for the integrations you plan to use. Do not commit it.

```bash
docker compose up --build
```

Services are then available at:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- LiteLLM gateway: `http://localhost:4000`

The Compose setup persists the SQLite database in the `backend_db` volume.

## Run locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On macOS or Linux, activate the environment with `source venv/bin/activate`.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` to the backend origin when it is not running at `http://localhost:8000`.

## Configuration

Keep integration credentials in `backend/.env`. Relevant settings include:

- `SQLALCHEMY_DATABASE_URL` - defaults to `sqlite:///./secret_scan.db`
- `FRONTEND_URL` - allowed browser origin; defaults to `http://localhost:5173`
- `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GITHUB_PRIVATE_KEY_PATH`
- `GITHUB_CALLBACK_URL`
- `LITELLM_GATEWAY_URL`, `LITELLM_MASTER_KEY`, `LITELLM_MODEL`
- `LLM_TIMEOUT_SECONDS`

GitHub scanning requires a configured GitHub App and an installation that grants access to the target repository. LLM review is optional; if the LiteLLM credentials are absent, the scan still completes and records the review error for ambiguous findings.

## API overview

| Endpoint | Purpose |
| --- | --- |
| `POST /api/scan` | Scan inline text or an orchestrator-supported target |
| `POST /api/scan/upload` | Scan one uploaded file or archive |
| `POST /api/scan/upload-multiple` | Scan multiple uploaded files or a folder |
| `GET /api/history` | List persisted scan reports |
| `DELETE /api/history/{scan_id}` | Delete one scan report |
| `DELETE /api/history` | Delete all scan reports |
| `GET /api/regex-patterns` | Read active regex rules |
| `POST /api/regex-patterns` | Replace active regex rules |
| `POST /api/regex-patterns/restore-backup` | Restore regex rules from the backup file |
| `GET /api/github/connect` | Start GitHub OAuth |
| `GET /api/github/repositories` | List repositories accessible to the connected user |
| `POST /api/github/scan` | Scan an accessible GitHub repository |

### Example: scan inline text

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"target":"inline","content":"password = \"mySecret_123!\""}'
```

A result includes the target, findings, a severity summary, and a pipeline message. A critical finding produces `BLOCKED`; a medium finding produces `WARNING`; otherwise the message is `INFO`.

## Rules and allowlists

- Update active patterns through the dashboard or `POST /api/regex-patterns`.
- Restore the checked-in backup through `POST /api/regex-patterns/restore-backup`.
- Edit `backend/data/allowlist.json` to exclude paths and known placeholder values.

The regex engine loads its data files at module start. Restart the backend after editing the JSON files directly.

## Tests and quality checks

```bash
cd backend
pytest tests/test_regex_engine.py

cd ../frontend
npm run lint
npm run build
```

Benchmark fixtures and evaluation utilities are in `backend/benchmark/`.

## Security notes

- Findings can contain real secret values and source context. Treat API responses, logs, and the SQLite database as sensitive data.
- Protect the API and regex-rule management endpoints before exposing the application outside a trusted environment.
- Set `FRONTEND_URL` explicitly in deployed environments; the backend enables credentialed browser requests for that origin.
- Apply archive size, file-count, and resource limits before scanning untrusted archives in production.
- Never commit `.env` files or GitHub private keys.
