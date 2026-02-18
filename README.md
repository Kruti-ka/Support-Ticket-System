# Support Ticket System

A full-stack support ticket management system with AI-powered ticket classification using **Groq + Llama 3.3 70B**.

![Tech](https://img.shields.io/badge/Backend-Django%204.2-092E20?style=flat-square&logo=django)
![Tech](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Tech](https://img.shields.io/badge/Database-PostgreSQL%2015-336791?style=flat-square&logo=postgresql)
![Tech](https://img.shields.io/badge/LLM-Groq%20%2F%20Llama%203.3%2070B-F55036?style=flat-square)
![Tech](https://img.shields.io/badge/Infra-Docker%20Compose-2496ED?style=flat-square&logo=docker)

---

## Features

- 📝 **Submit tickets** with title, description, category, and priority
- 🤖 **AI classification** — Groq LLM auto-suggests category & priority as you type (debounced, real-time)
- 📊 **Stats dashboard** — ticket counts by status, category, priority, and average resolution time
- 🔍 **Filter & search** — filter by category, priority, status, or keyword
- ✏️ **Status management** — update ticket status with optimistic UI updates
- 🛡️ **Graceful degradation** — app works fully even without an API key

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2 + Django REST Framework 3.14 |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Vite |
| LLM | Groq API (llama-3.3-70b-versatile) |
| Infrastructure | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A Groq API key — free at [console.groq.com](https://console.groq.com) (no credit card required)

### 1. Clone the repository

```bash
git clone https://github.com/Kruti-ka/Support-Ticket-System.git
cd "Support Ticket System"
```

### 2. Configure environment variables

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and set your Groq API key:

```env
GROQ_API_KEY=your_actual_key_here
```

> **Note:** The app works without an API key — ticket submission still works, but AI classification will be unavailable and the dropdowns won't be pre-filled.

### 3. Start with Docker Compose

```bash
docker-compose up --build
```

Docker will automatically:
1. Start PostgreSQL (with a health check before the backend starts)
2. Build and start the Django backend (runs migrations automatically)
3. Build and start the React frontend

### 4. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/ |
| pgAdmin (DB UI) | http://localhost:5050 |

> **pgAdmin credentials:** Email: `admin@admin.com` / Password: `admin`

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tickets/` | Create a new ticket (returns 201) |
| `GET` | `/api/tickets/` | List all tickets, newest first |
| `PATCH` | `/api/tickets/<id>/` | Update a ticket (e.g., change status) |
| `GET` | `/api/tickets/stats/` | Aggregated statistics |
| `POST` | `/api/tickets/classify/` | AI-powered LLM classification |

### Filter Parameters for `GET /api/tickets/`

| Param | Example | Description |
|---|---|---|
| `category` | `?category=billing` | Filter by category |
| `priority` | `?priority=high` | Filter by priority |
| `status` | `?status=open` | Filter by status |
| `search` | `?search=login` | Full-text search on title + description |

Filters can be combined: `?category=technical&priority=critical&search=crash`

---

## LLM Integration

### Why Groq + Llama 3.3 70B?

| Reason | Detail |
|---|---|
| **Free tier** | 14,400 requests/day, no billing required |
| **Speed** | ~200ms inference — fast enough for real-time UX as the user types |
| **Reliability** | Groq's LPU hardware delivers consistent low-latency responses |
| **Structured output** | Llama 3.3 70B follows JSON-only prompts cleanly |
| **Simple SDK** | `groq` Python package is OpenAI-compatible |

### Prompt Design

The classification prompt lives in `backend/tickets/llm.py` (`CLASSIFY_PROMPT`). Key decisions:

- **Zero-shot** — No examples needed; clear definitions are sufficient for this task
- **Strict JSON output** — Model is instructed to return raw JSON only (no markdown, no prose)
- **Low temperature (0.1)** — Reduces randomness for consistent, deterministic results
- **Small token budget (64)** — Only `{"category": "...", "priority": "..."}` is needed
- **Explicit definitions** — Each category and priority level has an unambiguous definition

### Graceful Degradation

If the LLM is unavailable (no API key, network error, or malformed response):

- `/api/tickets/classify/` returns `{"suggested_category": null, "suggested_priority": null, "llm_available": false}`
- The frontend shows a warning banner: *"AI classification unavailable — please select manually"*
- Ticket submission continues to work normally with user-selected values
- All errors are logged server-side and never surfaced to the user as failures

---

## Design Decisions

### Backend

- **`APIView` over ViewSets** — The endpoints don't follow standard CRUD patterns (`stats/` and `classify/` are custom actions), so plain `APIView` classes are cleaner and more explicit
- **DB-level aggregation** — The stats endpoint uses Django ORM `annotate()` + `aggregate()` with `TruncDate` for avg/day calculation — no Python loops over ticket data
- **Manual filtering** — Direct queryset filtering instead of `django-filter` for transparency and simplicity
- **Choices enforced at serializer level** — `CharField` with `choices` validates values before they reach the DB

### Frontend

- **Debounced classification** — The LLM classify call fires 800ms after the user stops typing, avoiding excessive API calls while still feeling responsive
- **Optimistic UI** — Status changes update local state immediately without waiting for a full list refresh
- **No Redux** — `useState` + `useEffect` + prop drilling is sufficient for this app's complexity
- **Vite** — Faster dev server and build than Create React App; native ESM support

### Infrastructure

- **Health check on PostgreSQL** — `depends_on: condition: service_healthy` ensures Django never starts before the DB is ready, eliminating race conditions
- **Volume mounts for hot reload** — Source code is mounted as volumes so changes reflect without rebuilding during development
- **Entrypoint script** — Waits for PostgreSQL → runs migrations → starts Gunicorn, all in one step

---

## Project Structure

```
Support Ticket System/
├── backend/
│   ├── config/
│   │   ├── settings.py       # Django settings (env-driven)
│   │   ├── urls.py           # Root URL config
│   │   └── wsgi.py
│   ├── tickets/
│   │   ├── models.py         # Ticket model
│   │   ├── serializers.py    # DRF serializers
│   │   ├── views.py          # API views (list, detail, stats, classify)
│   │   ├── urls.py           # Tickets URL patterns
│   │   ├── llm.py            # Groq LLM integration + prompt
│   │   └── migrations/
│   ├── Dockerfile
│   ├── entrypoint.sh         # Wait for DB → migrate → start Gunicorn
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── tickets.js       # Axios API client
│   │   ├── components/
│   │   │   ├── TicketForm.jsx   # Submit form with LLM integration
│   │   │   ├── TicketList.jsx   # List + filter bar
│   │   │   ├── TicketCard.jsx   # Individual ticket + status changer
│   │   │   └── StatsDashboard.jsx  # Stats + breakdowns
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.js           # Vite + proxy to backend
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## License

This project is for educational and portfolio purposes.
