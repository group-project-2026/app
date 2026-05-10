FROM python:3.12.13-slim-bookworm AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgeos-dev \
    libproj-dev \
    libgdal-dev \
    gcc \
    g++ \
    gfortran \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock* ./

RUN pip install --upgrade pip setuptools && \
    pip install poetry && \
    poetry install --no-root --no-dev || poetry install --no-root


FROM python:3.12.13-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgeos-c1v5 \
    libproj25 \
    libgdal32 \
    gdal-bin \
    postgresql-client \
    netcat-openbsd \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

RUN mkdir -p /app/data /app/staticfiles && \
    python manage.py collectstatic --noinput || true && \
    chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
