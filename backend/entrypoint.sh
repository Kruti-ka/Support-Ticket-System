#!/bin/sh

echo "Waiting for PostgreSQL..."
while ! python -c "import psycopg2; psycopg2.connect(host='$DB_HOST', port='$DB_PORT', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting server..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
