# App

To start the app:

1. Copy the environment file:
```bash
   cp .env.example .env
```

2. Start the app:
```bash
   make
```
   or if you don't have `make`:
```bash
   docker compose up -d --build
```

Frontend will be available on `http://localhost:3000` and backend on `http://localhost:8000`

Admin panel is available on `http://localhost:8000/admin`. To create admin user paste `docker exec -it backend python manage.py createsuperuser` into terminal and fill out the form.
