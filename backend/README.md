# Backend (FastAPI)

## Quick Start (SQLite Default)

```bash
# from backend/
pip install -r requirements.txt
copy .env.example .env
.\start-backend.ps1
```

This project now defaults to SQLite, so a fresh clone runs without MySQL setup.

## Optional MySQL

If you want MySQL later, update `backend/.env`:

```env
DATABASE_BACKEND=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_CORE_DATABASE=database_core
MYSQL_TRACKING_DATABASE=database_tracking
```

## Main API Prefixes

- `/api/auth/*`
- `/api/plans/*`
- `/api/aqi/*`
- `/api/risk/*`
- `/api/restaurant/*`
