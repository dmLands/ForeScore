# ForeScore Starter Repo

Clean baseline for GitHub Codespaces with Node 20, Postgres 16, Redis 7 (no DevContainer Features, no Docker-in-Docker).

## What’s included
- `.devcontainer/devcontainer.json` — plain Node image, runs `setup-apt.sh`
- `.devcontainer/setup-apt.sh` — installs Postgres/Redis, creates DB/user, writes `.env.example`
- `.gitignore` — ignores node_modules, .env, build artifacts, Replit files

## Quick start
1. Commit these files to `main`.
2. Create a Codespace on `main`.
3. In Codespaces:
   ```bash
   # Upload your app (the extracted Replit ZIP contents) to the repo root, then Commit & Push.
   cp .env.example .env
   npm ci || npm install
   node -e "console.log(require('./package.json').scripts)"
   npm run db:push || npm run migrate || npx drizzle-kit push || true
   npm run dev:api || npm run dev || npm start
   # new terminal:
   npm run dev:web || npx vite
   # or: npx expo start
