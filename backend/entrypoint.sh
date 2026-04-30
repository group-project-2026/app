#!/bin/bash
set -e

echo "Starting Django application..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=1
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" 2>/dev/null || [ $ATTEMPT -eq $MAX_ATTEMPTS ]; do
  echo "Waiting for PostgreSQL... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "PostgreSQL failed to start"
  exit 1
fi

echo "PostgreSQL is ready!"

# Enable PostGIS extension (BEFORE migrations)
echo "Ensuring PostGIS extension is enabled..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS postgis;" || echo "PostGIS extension already exists or error during creation"

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Load Fermi catalog if it hasn't been loaded yet
echo "Loading Fermi-LAT catalog data..."
python manage.py ingest_catalogs --catalogs FERMI || echo "Warning: Could not load Fermi data (may already be loaded)"

echo "Starting Django development server on 0.0.0.0:8000..."
python manage.py runserver 0.0.0.0:8000

