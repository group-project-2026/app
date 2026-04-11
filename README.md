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

Frontend will be available on `http://localhost:3000`