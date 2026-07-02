# Checker

A web app for creating and managing checklists. Name checklists, add tasks, and mark items complete — completed tasks move to a **Completed** section at the bottom. Data is stored in PostgreSQL.

## Setup secrets

Copy the example secrets file and set your own values:

```bash
cp secrets.env.example secrets.env
```

Edit `secrets.env` with strong passwords. This file is gitignored and is never committed.

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres superuser (database admin) |
| `POSTGRES_DB` | Database name (`checker`) |
| `CHECKER_DB_USER` / `CHECKER_DB_PASSWORD` | Application user — API connects with this account |

## Run with Docker (recommended)

From this directory:

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

Services:

| Service | Port | Description |
|---------|------|-------------|
| `web` | 8080 | React frontend (nginx) |
| `api` | 3001 | REST API (Node/Express) |
| `db` | 5432 | PostgreSQL 16 |

Credentials are loaded from `secrets.env` at runtime — nothing secret is baked into the Docker images.

If you previously ran an older version of this app, reset the database volume so migrations re-run:

```bash
docker compose down -v
docker compose up --build
```

Stop with `Ctrl+C`, then remove containers and volumes:

```bash
docker compose down -v
```

## Local development

**1. Create secrets**

```bash
cp secrets.env.example secrets.env
```

**2. Start Postgres**

```bash
docker compose up db -d
```

**3. Start the API**

```bash
cd api
npm install
export $(grep -v '^#' ../secrets.env | xargs)
npm run dev
```

**4. Start the frontend**

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the API on port 3001.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/checklists` | List all checklists with tasks |
| POST | `/api/checklists` | Create checklist `{ "name": "..." }` |
| PATCH | `/api/checklists/:id` | Rename checklist |
| DELETE | `/api/checklists/:id` | Delete checklist |
| POST | `/api/checklists/:id/tasks` | Add task `{ "text": "..." }` |
| PATCH | `/api/checklists/:id/tasks/:taskId` | Update task (toggle complete) |
| DELETE | `/api/checklists/:id/tasks/:taskId` | Delete task |

Completed tasks are ordered at the bottom by completion time.
