# App

Frontend will be available on `http://localhost:3000` and backend on `http://localhost:8000`.

Admin panel is available on `http://localhost:8000/admin`. To create an admin user run:
```bash
docker exec -it backend python manage.py createsuperuser
```

## Development

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Start the app:
```bash
make
```
or without `make`:
```bash
docker compose up -d --build
```

## Production

Pulls pre-built images from GitHub Container Registry and starts all services.

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Start the app:
```bash
make prod
```
or without `make`:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The app will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Admin panel: `http://localhost:8000/admin`

To pin a specific version instead of `latest`:
```bash
BACKEND_TAG=<git-sha> FRONTEND_TAG=<git-sha> docker compose -f docker-compose.prod.yml up -d
```
