FROM python:3.12.13-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_CREATE=true \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ pkg-config && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock ./

COPY . .

RUN pip install --upgrade pip
RUN pip install poetry
RUN apt-get update \
    && apt-get -y install libpq-dev gcc
RUN pip install psycopg2-binary
RUN pip install websockets
RUN poetry install --no-root
