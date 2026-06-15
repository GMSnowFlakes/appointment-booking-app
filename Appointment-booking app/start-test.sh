#!/usr/bin/env bash
#
# start-test.sh — One-command test runner
#
# What it does:
#   1. Checks Docker is installed + running
#   2. Starts PostgreSQL container via docker-compose (if not already running)
#   3. Waits for Postgres to accept connections
#   4. Installs server dependencies
#   5. Runs all tests (Vitest)
#   6. Reports pass/fail summary
#
# Usage:
#   cd "Appointment-booking app"
#   ./start-test.sh
#
# Or from npm:
#   cd "Appointment-booking app/server"
#   npm run test:up
#
# Options:
#   --watch    Run tests in watch mode
#   --coverage Run tests with coverage report
#   --file     Run a specific test file: ./start-test.sh --file auth.test.js

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
NC='\033[0m'

# ─── Parse args ──────────────────────────────────
WATCH=false
COVERAGE=false
FILE_FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch)     WATCH=true; shift ;;
    --coverage)  COVERAGE=true; shift ;;
    --file)      FILE_FILTER="$2"; shift 2 ;;
    *)           echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
  esac
done

# ─── Helper functions ────────────────────────────
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check prerequisites ─────────────────────────
info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
  err "Docker is not installed. Please install Docker Desktop: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &> /dev/null; then
  err "Docker is installed but not running. Please start Docker Desktop first."
  exit 1
fi
ok "Docker is running"

# ─── Navigate to project root ────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Start PostgreSQL ────────────────────────────
info "Starting PostgreSQL via Docker Compose..."
$DOCKER_COMPOSE up -d 2>&1 | tail -1

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
  warn "⚠️  Using default JWT_SECRET for tests (not suitable for production)"
fi

# ─── Install deps ─────────────────────────────────
info "Installing dependencies..."

cd server
if ! npm install --loglevel=warn; then
  err "npm install failed in server/"
  exit 1
fi
ok "Server dependencies installed"

cd "$SCRIPT_DIR/client"
if ! npm install --loglevel=warn; then
  err "npm install failed in client/"
  exit 1
fi
ok "Client dependencies installed"

cd "$SCRIPT_DIR"

# ─── Build test command ──────────────────────────
# Default: run both server and client from root via npm --prefix
# --file flag runs single server test file only

if [ -n "$FILE_FILTER" ]; then
  # Single-file mode: run just the server test file
  cd server
  TEST_CMD="npx vitest run __tests__/$FILE_FILTER"
  TEST_LABEL="Server file: $FILE_FILTER"
else
  # Workspace mode: run all tests from root
  if [ "$WATCH" = true ]; then
    TEST_CMD="npx concurrently -g \"npm run test:watch --prefix server\" \"npm run test:watch --prefix client\""
    TEST_LABEL="Server + Client (watch mode)"
  elif [ "$COVERAGE" = true ]; then
    TEST_CMD="npm test --prefix server -- --coverage"
    TEST_LABEL="Server coverage"
  else
    TEST_CMD="npm test"
    TEST_LABEL="Server + Client"
  fi
fi

# ─── Run tests ───────────────────────────────────
echo ""
info "======================================"
info " $TEST_LABEL"
info "======================================"
echo ""

set +e
eval "$TEST_CMD"
EXIT_CODE=$?
set -e

# ─── Summary ─────────────────────────────────────
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}┌─────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}│                                             │${NC}"
  echo -e "${GREEN}│   ✅  All tests passed!                      │${NC}"
  echo -e "${GREEN}│                                             │${NC}"
  echo -e "${GREEN}└─────────────────────────────────────────────┘${NC}"
else
  echo -e "${RED}┌─────────────────────────────────────────────┐${NC}"
  echo -e "${RED}│                                             │${NC}"
  echo -e "${RED}│   ❌  Some tests failed (exit code: $EXIT_CODE)      │${NC}"
  echo -e "${RED}│                                             │${NC}"
  echo -e "${RED}└─────────────────────────────────────────────┘${NC}"
fi

echo ""
info "PostgreSQL is still running for subsequent test runs."
info "Stop it with: $DOCKER_COMPOSE stop"
echo ""

exit $EXIT_CODE
