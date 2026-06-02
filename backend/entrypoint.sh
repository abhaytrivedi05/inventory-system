#!/bin/sh
# Wait for Postgres to be ready
echo "Waiting for database..."
while ! python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.getenv('DATABASE_URL'))
    sys.exit(0)
except:
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "Database is ready!"
exec uvicorn main:app --host 0.0.0.0 --port 8000
