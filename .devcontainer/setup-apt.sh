#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql postgresql-contrib redis-server

# Start services (works in Codespaces)
command -v pg_ctlcluster >/dev/null 2>&1 && pg_ctlcluster --skip-systemctl-redirect 16 main start || true
service postgresql start || true
service redis-server start || true

# DB + user (idempotent)
su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='forescore') THEN CREATE ROLE forescore LOGIN PASSWORD 'forescore'; END IF; END $$;\""
su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='forescore') THEN CREATE DATABASE forescore OWNER forescore; END IF; END $$;\""

# Env template
printf "DATABASE_URL=postgres://forescore:forescore@localhost:5432/forescore\nREDIS_URL=redis://localhost:6379\nSESSION_SECRET=devsecret\n" > /workspaces/$RepositoryName/.env.example 2>/dev/null || \
printf "DATABASE_URL=postgres://forescore:forescore@localhost:5432/forescore\nREDIS_URL=redis://localhost:6379\nSESSION_SECRET=devsecret\n" > ./.env.example
echo "Wrote .env.example"
