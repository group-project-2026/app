FROM python:3.12.13-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies including PostGIS/GIS libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgeos-dev \
    libproj-dev \
    libgdal-dev \
    gdal-bin \
    postgresql-client \
    netcat-openbsd \
    ca-certificates \
    curl \
    gcc \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

# Install Poetry and Python dependencies
COPY pyproject.toml poetry.lock* ./

RUN pip install --upgrade pip setuptools && \
    pip install poetry && \
    poetry install --no-root --no-dev || poetry install --no-root

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p /app/data && \
    mkdir -p /app/staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
