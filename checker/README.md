# Checker

A multi-user web app for creating and managing checklists. Sign in with email and password, share checklists with others, and archive checklists instead of deleting them.

## Setup secrets

```bash
cp secrets.env.example secrets.env
```

Edit `secrets.env` with strong passwords and a unique `JWT_SECRET`. This file is gitignored.

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres superuser |
| `CHECKER_DB_*` | Application database user |
| `JWT_SECRET` | Signs user session tokens |

## Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

After schema changes, reset the database volume:

```bash
docker compose down -v
docker compose up --build
```

## Features

- **Sign in / sign up** — email as username, password (min 8 characters)
- **Checklists** — create, rename, add tasks, mark complete
- **Sharing** — owners share checklists by entering another user's email (they must have an account)
- **Archive** — replaces delete; archived checklists appear in the sidebar under **Archived**
- **Restore** — owners can restore archived checklists to add tasks again; archived checklists are read-only for new tasks

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user (auth required) |
| GET | `/api/checklists?archived=false\|true` | List checklists |
| POST | `/api/checklists/:id/archive` | Archive (owner) |
| POST | `/api/checklists/:id/restore` | Restore (owner) |
| POST | `/api/checklists/:id/share` | Share by email (owner) |

All checklist routes require `Authorization: Bearer <token>`.
