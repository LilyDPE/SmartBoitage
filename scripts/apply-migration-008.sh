#!/bin/bash
# Apply migration 008: Add route columns to zones_boitage

# This script adds the route_geom and route_instructions columns to zones_boitage table
# Run this on your production database

echo "Applying migration 008: Add route columns to zones_boitage..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  echo "Please set it with: export DATABASE_URL='your_postgres_connection_string'"
  exit 1
fi

# Apply the migration
psql "$DATABASE_URL" -f migrations/008_add_route_columns_to_zones_boitage.sql

if [ $? -eq 0 ]; then
  echo "✅ Migration 008 applied successfully!"
else
  echo "❌ Migration 008 failed!"
  exit 1
fi
