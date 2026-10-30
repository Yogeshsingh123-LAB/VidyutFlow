#!/usr/bin/env bash
# Reset the local SQLite demo DB (PostgreSQL/compose: `docker compose down -v` instead)
rm -f backend/vidyutflow.db vidyutflow.db backend/vidyutos.db vidyutos.db
echo "Demo DB removed. It will be re-created + seeded on next backend start."
