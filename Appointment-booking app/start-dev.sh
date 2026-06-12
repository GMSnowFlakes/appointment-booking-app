#!/usr/bin/env bash
#
# start-dev.sh — One-command startup for local development
#
# What it does:
#   1. Checks Docker is installed
#   2. Starts PostgreSQL container via docker-compose (if not already running)
#   3. Waits for Postgres to accept connections
#   4. Starts the server (auto-runs migrations on startup)
#   5. Starts the client dev server (Vite)
#
# Usage:
#   cd "Appointment-booking app"
#   ./start-dev.sh
#
# Or from npm:
#   cd "Appointment-booking app/server"
#   npm run dev:up
#

set -e

# ─── Detect docker compose command ────────────────
DOCKER_COMPOSE="docker compose"
if ! docker compose version &>/dev/null && command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE="docker-compose"
fi

# ─── Colors ─────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ─── Helper functions ────────────────────────────

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check prerequisites ─────────────────────────

info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
  err "Docker is not installed. Please install Docker Desktop: https://docs.docker.com/get-docker/"
  exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
  err "Docker is installed but not running. Please start Docker Desktop first."
  exit 1
fi
ok "Docker is running"

# ─── Start PostgreSQL ────────────────────────────

info "Starting PostgreSQL via Docker Compose..."

# Navigate to project root (where docker-compose.yml lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

$DOCKER_COMPOSE up -d 2>&1 | tail -1

# Wait for Postgres to be healthy
info "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if $DOCKER_COMPOSE exec -T postgres pg_isready -U postgres &> /dev/null; then
    ok "PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "PostgreSQL failed to start within 30 seconds. Check '$DOCKER_COMPOSE logs postgres'"
    exit 1
  fi
  sleep 1
done

# ─── Copy .env if missing ────────────────────────

if [ ! -f "server/.env" ]; then
  warn "server/.env not found — copying from server/.env.example"
  cp server/.env.example server/.env
  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                              ║${NC}"
  echo -e "${RED}║  ⚠️  IMPORTANT: Edit server/.env and set a REAL JWT_SECRET!  ║${NC}"
  echo -e "${RED}║                                                              ║${NC}"
  echo -e "${RED}║  Generate one with:                                          ║${NC}"
  echo -e "${RED}║    node -e \"console.log(require('crypto').randomBytes(48)    ║${NC}"
  echo -e "${RED}║                     .toString('hex'))\"                      ║${NC}"
  echo -e "${RED}║                                                              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
fi

# ─── Start server ─────────────────────────────────

echo ""
info "======================================"
info " Starting dev servers..."
info "======================================"
echo ""

# Start the API server in the background
info "Starting API server (port 3001)..."
cd server
if ! npm install --loglevel=warn; then
  err "npm install failed in server/"
  exit 1
fi
node --watch index.js &
SERVER_PID=$!
cd ..

# Wait for the server to be ready
info "Waiting for API server..."
for i in $(seq 1 15); do
  if node -e "const h=require('http');h.get('http://localhost:3001/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{process.exit(d.includes('ok')?0:1)})}).on('error',()=>process.exit(1))" &> /dev/null; then
    ok "API server is running at http://localhost:3001"
    break
  fi
  if [ "$i" -eq 15 ]; then
    warn "API server may not have started. Check the logs above."
  fi
  sleep 1
done

# ─── Start client ─────────────────────────────────

info "Starting client dev server (port 5173)..."
cd client
if ! npm install --loglevel=warn; then
  err "npm install failed in client/"
  exit 1
fi
npm run dev &
CLIENT_PID=$!
cd ..

echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${GREEN}│   🚀  All services are starting up!                         │${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${GREEN}│   API:      http://localhost:3001/api                       │${NC}"
echo -e "${GREEN}│   Health:   http://localhost:3001/api/health                │${NC}"
echo -e "${GREEN}│   Client:   http://localhost:5173                           │${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${GREEN}│   Press Ctrl+C to stop all services                         │${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

# ─── Cleanup on exit ─────────────────────────────

cleanup() {
  echo ""
  info "Shutting down..."
  kill $SERVER_PID 2>/dev/null
  kill $CLIENT_PID 2>/dev/null
  # Comment out the next line if you want Postgres to keep running between sessions
  # docker compose down
  ok "Stopped. PostgreSQL is still running (use 'docker compose stop' to stop it)"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
