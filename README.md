# Support Ticket System

A full-stack support ticket management system with AI-powered ticket classification using Google Gemini.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Vite |
| LLM | Groq (llama-3.3-70b-versatile) |
| Infrastructure | Docker + Docker Compose |

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone / unzip the project

```bash
cd "Support Ticket System"
```

### 2. Set your API key

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and set your Gemini API key
GROQ_API_KEY=your_actual_key_here
```

> **Note:** The app works without an API key — ticket submission still works, but AI classification will be unavailable and the dropdowns won't be pre-filled.

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

That's it. Docker will:
1. Start PostgreSQL
2. Build and start the Django backend (runs migrations automatically)
3. Build and start the React frontend

### 4. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/ |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tickets/` | Create a ticket (returns 201) |
| `GET` | `/api/tickets/` | List tickets, newest first |
| `PATCH` | `/api/tickets/<id>/` | Update a ticket |
| `GET` | `/api/tickets/stats/` | Aggregated statistics |
| `POST` | `/api/tickets/classify/` | LLM classification |

### Filter parameters for `GET /api/tickets/`

| Param | Example | Description |
|---|---|---|
| `category` | `?category=billing` | Filter by category |
| `priority` | `?priority=high` | Filter by priority |
| `status` | `?status=open` | Filter by status |
| `search` | `?search=login` | Search title + description |

All filters can be combined: `?category=technical&priority=critical&search=crash`

---

## LLM Integration

### Why Groq + Llama 3.3 70B?

1. **Free tier** — 14,400 requests/day, no billing or credit card required
2. **Speed** — Fastest LLM inference available (~200ms), ideal for real-time UX as the user types
3. **Reliability** — Groq's LPU hardware delivers consistent low-latency responses
4. **Structured output** — Llama 3.3 70B follows JSON-only prompts cleanly without extra parsing
5. **Simple SDK** — `groq` Python package is OpenAI-compatible and easy to integrate

### Prompt Design

The prompt is located in `backend/tickets/llm.py` (`CLASSIFY_PROMPT`). Key design decisions:

- **Zero-shot classification** — No examples needed; clear definitions are sufficient for this task
- **Strict output format** — Instructs the model to return raw JSON only (no markdown, no prose)
- **Low temperature (0.1)** — Reduces randomness for consistent, deterministic classification
- **Small token budget (64)** — We only need `{"category": "...", "priority": "..."}`, so we cap output to avoid waste
- **Explicit definitions** — Each category and priority level has a clear, unambiguous definition to minimize misclassification

### Graceful Degradation

If the LLM is unavailable (no API key, network error, invalid response):
- The `/api/tickets/classify/` endpoint returns `{"suggested_category": null, "suggested_priority": null, "llm_available": false}`
- The frontend shows a warning banner: "AI classification unavailable — please select manually"
- Ticket submission continues to work normally with user-selected values
- All errors are logged server-side but never surfaced to the user as failures

---

## Design Decisions

### Backend

- **APIView over ViewSets** — The endpoints don't follow standard CRUD patterns (e.g., `stats/` and `classify/` are custom actions), so plain `APIView` classes are cleaner and more explicit than ViewSets with custom actions
- **DB-level aggregation** — The stats endpoint uses Django ORM `annotate()` + `aggregate()` with `TruncDate` for the avg/day calculation. No Python loops iterate over ticket data
- **Manual filtering** — Used direct queryset filtering instead of `django-filter` for transparency and simplicity; the filter logic is easy to read and extend
- **Choices enforced at DB level** — `CharField` with `choices` enforces valid values at the serializer level; the migration stores the constraint in the schema

### Frontend

- **Debounced classification** — The LLM classify call fires 800ms after the user stops typing in the description field, avoiding excessive API calls while still feeling responsive
- **Optimistic UI** — Status changes update the local state immediately without waiting for a full list refresh
- **No Redux** — `useState` + `useEffect` + prop drilling is sufficient for this app's complexity; adding Redux would be over-engineering
- **Vite** — Faster dev server and build than Create React App; native ESM support

### Infrastructure

- **Health check on PostgreSQL** — The backend `depends_on` uses `condition: service_healthy` so Django never starts before the DB is ready, eliminating race conditions
- **Volume mount for hot reload** — Both backend and frontend mount source code as volumes so changes reflect without rebuilding during development
- **Entrypoint script** — The backend entrypoint waits for PostgreSQL, runs migrations, then starts Gunicorn — all in one step, no manual intervention needed

---

## Project Structure

```
support-ticket-system/
├── backend/
│   ├── config/
│   │   ├── settings.py       # Django settings (env-driven)
│   │   ├── urls.py           # Root URL config
│   │   └── wsgi.py
│   ├── tickets/
│   │   ├── models.py         # Ticket model
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # API views (list, detail, stats, classify)
│   │   ├── urls.py           # tickets URL patterns
│   │   ├── llm.py            # Gemini integration + prompt
│   │   └── migrations/
│   ├── Dockerfile
│   ├── entrypoint.sh         # Wait for DB → migrate → start server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── tickets.js    # Axios API client
│   │   ├── components/
│   │   │   ├── TicketForm.jsx    # Submit form with LLM integration
│   │   │   ├── TicketList.jsx    # List + filter bar
│   │   │   ├── TicketCard.jsx    # Individual ticket + status changer
│   │   │   └── StatsDashboard.jsx # Stats + breakdowns
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.js        # Vite + proxy to backend
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```
