#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "   HookScope VPS Deployment Script"
echo "=============================================="
echo ""

# ─── Detect if running as root ────────────────────────────────────────────────
if [[ $EUID -eq 0 ]]; then
  warn "Running as root. Some commands may need sudo."
  SUDO=""
else
  SUDO="sudo"
fi

# ─── Check prerequisites ───────────────────────────────────────────────────────
check_cmd() {
  command -v "$1" >/dev/null 2>&1 || error "Required: $1 not found. Install it first."
}

check_cmd docker

# ─── Detect compose command ───────────────────────────────────────────────────
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  error "docker compose plugin not found. Install it first."
fi

# ─── Get deploy directory ─────────────────────────────────────────────────────
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/hookscope}"

if [[ ! -d "$DEPLOY_DIR" ]]; then
  read -p "Deploy directory [$DEPLOY_DIR]: " input
  DEPLOY_DIR="${input:-$DEPLOY_DIR}"
  if [[ ! -d "$DEPLOY_DIR" ]]; then
    info "Creating deploy directory: $DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR"
  fi
fi

# ─── Ask for domain/subdomain ─────────────────────────────────────────────────
read -p "API domain (e.g., api.example.com) [api.hookscope.com]: " API_DOMAIN
API_DOMAIN="${API_DOMAIN:-api.hookscope.com}"

read -p "Ingestion domain (e.g., ingestion.example.com) [ingestion.hookscope.com]: " INGESTION_DOMAIN
INGESTION_DOMAIN="${INGESTION_DOMAIN:-ingestion.hookscope.com}"

read -p "Frontend domain (e.g., example.com) [hookscope.com]: " FRONTEND_DOMAIN
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-hookscope.com}"

# ─── Ask for database ─────────────────────────────────────────────────────────
echo ""
echo "── Database ──────────────────────────────────────────"
read -p "Postgres host [localhost]: " DB_HOST
DB_HOST="${DB_HOST:-localhost}"

read -p "Postgres port [5432]: " DB_PORT
DB_PORT="${DB_PORT:-5432}"

read -p "Postgres user [postgres]: " DB_USER
DB_USER="${DB_USER:-postgres}"

read -p "Postgres password: " DB_PASS
while [[ -z "$DB_PASS" ]]; do
  read -p "Postgres password: " DB_PASS
done

read -p "Postgres database [webhook_db]: " DB_NAME
DB_NAME="${DB_NAME:-webhook_db}"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=prefer"

# ─── Ask for Redis ────────────────────────────────────────────────────────────
echo ""
echo "── Redis ──────────────────────────────────────────────"
read -p "Redis host [localhost]: " REDIS_HOST
REDIS_HOST="${REDIS_HOST:-localhost}"

read -p "Redis port [6379]: " REDIS_PORT
REDIS_PORT="${REDIS_PORT:-6379}"

read -p "Redis password (leave empty if none): " REDIS_PASS

if [[ -n "$REDIS_PASS" ]]; then
  REDIS_URL="redis://:${REDIS_PASS}@${REDIS_HOST}:${REDIS_PORT}"
else
  REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
fi

# ─── Ask for MinIO (S3) ───────────────────────────────────────────────────────
echo ""
echo "── MinIO (S3) ─────────────────────────────────────────"
read -p "MinIO endpoint [http://localhost:9000]: " S3_ENDPOINT
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"

read -p "MinIO bucket name [webhooks]: " S3_BUCKET
S3_BUCKET="${S3_BUCKET:-webhooks}"

read -p "MinIO access key [minioadmin]: " S3_ACCESS_KEY
S3_ACCESS_KEY="${S3_ACCESS_KEY:-minioadmin}"

read -p "MinIO secret key [minioadmin]: " S3_SECRET_KEY

read -p "AWS region [us-east-1]: " AWS_REGION
AWS_REGION="${AWS_REGION:-us-east-1}"

# ─── Ask for JWT ──────────────────────────────────────────────────────────────
echo ""
echo "── JWT ────────────────────────────────────────────────"
read -p "JWT access secret (leave empty to generate): " JWT_ACCESS_SECRET
if [[ -z "$JWT_ACCESS_SECRET" ]]; then
  JWT_ACCESS_SECRET=$(openssl rand -base64 32)
  info "Generated JWT secret: $JWT_ACCESS_SECRET"
fi

# ─── Ask for OAuth (optional) ────────────────────────────────────────────────
echo ""
echo "── OAuth (optional) ───────────────────────────────────"
read -p "Google Client ID: " GOOGLE_CLIENT_ID
read -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
read -p "GitHub Client ID: " GITHUB_CLIENT_ID
read -p "GitHub Client Secret: " GITHUB_CLIENT_SECRET

# ─── Ask for SMTP (optional) ─────────────────────────────────────────────────
echo ""
echo "── Email/SMTP (optional) ──────────────────────────────"
read -p "SMTP host [smtp.ethereal.email]: " SMTP_HOST
SMTP_HOST="${SMTP_HOST:-smtp.ethereal.email}"

read -p "SMTP port [587]: " SMTP_PORT
SMTP_PORT="${SMTP_PORT:-587}"

read -p "SMTP user: " SMTP_USER
read -p "SMTP password: " SMTP_PASS
read -p "SMTP from address [noreply@hookscope.dev]: " SMTP_FROM
SMTP_FROM="${SMTP_FROM:-noreply@hookscope.dev}"

# ─── Ask for Dodo Payments (optional) ────────────────────────────────────────
echo ""
echo "── Dodo Payments (optional) ────────────────────────────"
read -p "Dodo Payments API key: " DODO_PAYMENTS_API_KEY
read -p "Dodo Payments webhook key: " DODO_PAYMENTS_WEBHOOK_KEY
read -p "Dodo Starter monthly product ID: " DODO_STARTER_MONTHLY_PRODUCT_ID
read -p "Dodo Starter annual product ID: " DODO_STARTER_ANNUAL_PRODUCT_ID
read -p "Dodo Pro monthly product ID: " DODO_PRO_MONTHLY_PRODUCT_ID
read -p "Dodo Pro annual product ID: " DODO_PRO_ANNUAL_PRODUCT_ID

# ─── Ask for maintenance secret ─────────────────────────────────────────────
echo ""
echo "── Maintenance ────────────────────────────────────────"
read -p "Maintenance secret (leave empty to generate): " MAINTENANCE_SECRET
if [[ -z "$MAINTENANCE_SECRET" ]]; then
  MAINTENANCE_SECRET=$(openssl rand -hex 32)
  info "Generated maintenance secret: $MAINTENANCE_SECRET"
fi

# ─── Copy project files ────────────────────────────────────────────────────────
echo ""
echo "── Copying project to $DEPLOY_DIR ────────────────────"

if [[ "$(pwd)" != "$DEPLOY_DIR" ]]; then
  info "Copying files..."
  rsync -av --exclude='.git' \
          --exclude='node_modules' \
          --exclude='.next' \
          --exclude='dist' \
          --exclude='.turbo' \
          --exclude='.env' \
          --exclude='*.log' \
          . "$DEPLOY_DIR/" 2>/dev/null || cp -r . "$DEPLOY_DIR/"
fi

# ─── Generate .env files ──────────────────────────────────────────────────────
info "Generating .env files..."

# Root .env
cat > "$DEPLOY_DIR/.env" << 'ENVEOF'
# ─── Postgres ─────────────────────────────────────────────────────────────────
DATABASE_URL=DB_URL_PLACEHOLDER

# ─── JWT ──────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=JWT_ACCESS_SECRET_PLACEHOLDER

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=REDIS_URL_PLACEHOLDER

# ─── MinIO (S3) ────────────────────────────────────────────────────────────────
S3_ENDPOINT=S3_ENDPOINT_PLACEHOLDER
S3_BUCKET=S3_BUCKET_PLACEHOLDER
AWS_REGION=AWS_REGION_PLACEHOLDER
AWS_ACCESS_KEY_ID=S3_ACCESS_KEY_PLACEHOLDER
AWS_SECRET_ACCESS_KEY=S3_SECRET_KEY_PLACEHOLDER

# ─── Ingestion server ─────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

# ─── API server ───────────────────────────────────────────────────────────────
API_BASE_URL=https://API_DOMAIN_PLACEHOLDER
FRONTEND_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
INGESTION_BASE_URL=https://INGESTION_DOMAIN_PLACEHOLDER

# ─── OAuth — Google ───────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID_PLACEHOLDER
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET_PLACEHOLDER

# ─── OAuth — GitHub ───────────────────────────────────────────────────────────
GITHUB_CLIENT_ID=GITHUB_CLIENT_ID_PLACEHOLDER
GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET_PLACEHOLDER

# ─── Email (password reset) ───────────────────────────────────────────────────
SMTP_HOST=SMTP_HOST_PLACEHOLDER
SMTP_PORT=SMTP_PORT_PLACEHOLDER
SMTP_SECURE=false
SMTP_USER=SMTP_USER_PLACEHOLDER
SMTP_PASS=SMTP_PASS_PLACEHOLDER
SMTP_FROM=SMTP_FROM_PLACEHOLDER
APP_NAME=HookScope

# ─── Dodo Payments (Billing & Subscriptions) ─────────────────────────────────
DODO_PAYMENTS_API_KEY=DODO_PAYMENTS_API_KEY_PLACEHOLDER
DODO_PAYMENTS_WEBHOOK_KEY=DODO_PAYMENTS_WEBHOOK_KEY_PLACEHOLDER

# ─── Dodo Product IDs ─────────────────────────────────────────────────────────
DODO_STARTER_MONTHLY_PRODUCT_ID=DODO_STARTER_MONTHLY_PRODUCT_ID_PLACEHOLDER
DODO_STARTER_ANNUAL_PRODUCT_ID=DODO_STARTER_ANNUAL_PRODUCT_ID_PLACEHOLDER
DODO_PRO_MONTHLY_PRODUCT_ID=DODO_PRO_MONTHLY_PRODUCT_ID_PLACEHOLDER
DODO_PRO_ANNUAL_PRODUCT_ID=DODO_PRO_ANNUAL_PRODUCT_ID_PLACEHOLDER

# ─── Maintenance ──────────────────────────────────────────────────────────────
MAINTENANCE_SECRET=MAINTENANCE_SECRET_PLACEHOLDER
ENVEOF

# Replace placeholders with actual values
sed -i "s|DB_URL_PLACEHOLDER|${DATABASE_URL}|g" "$DEPLOY_DIR/.env"
sed -i "s|JWT_ACCESS_SECRET_PLACEHOLDER|${JWT_ACCESS_SECRET}|g" "$DEPLOY_DIR/.env"
sed -i "s|REDIS_URL_PLACEHOLDER|${REDIS_URL}|g" "$DEPLOY_DIR/.env"
sed -i "s|S3_ENDPOINT_PLACEHOLDER|${S3_ENDPOINT}|g" "$DEPLOY_DIR/.env"
sed -i "s|S3_BUCKET_PLACEHOLDER|${S3_BUCKET}|g" "$DEPLOY_DIR/.env"
sed -i "s|AWS_REGION_PLACEHOLDER|${AWS_REGION}|g" "$DEPLOY_DIR/.env"
sed -i "s|S3_ACCESS_KEY_PLACEHOLDER|${S3_ACCESS_KEY}|g" "$DEPLOY_DIR/.env"
sed -i "s|S3_SECRET_KEY_PLACEHOLDER|${S3_SECRET_KEY}|g" "$DEPLOY_DIR/.env"
sed -i "s|API_DOMAIN_PLACEHOLDER|${API_DOMAIN}|g" "$DEPLOY_DIR/.env"
sed -i "s|FRONTEND_DOMAIN_PLACEHOLDER|${FRONTEND_DOMAIN}|g" "$DEPLOY_DIR/.env"
sed -i "s|INGESTION_DOMAIN_PLACEHOLDER|${INGESTION_DOMAIN}|g" "$DEPLOY_DIR/.env"
sed -i "s|GOOGLE_CLIENT_ID_PLACEHOLDER|${GOOGLE_CLIENT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|GOOGLE_CLIENT_SECRET_PLACEHOLDER|${GOOGLE_CLIENT_SECRET}|g" "$DEPLOY_DIR/.env"
sed -i "s|GITHUB_CLIENT_ID_PLACEHOLDER|${GITHUB_CLIENT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|GITHUB_CLIENT_SECRET_PLACEHOLDER|${GITHUB_CLIENT_SECRET}|g" "$DEPLOY_DIR/.env"
sed -i "s|SMTP_HOST_PLACEHOLDER|${SMTP_HOST}|g" "$DEPLOY_DIR/.env"
sed -i "s|SMTP_PORT_PLACEHOLDER|${SMTP_PORT}|g" "$DEPLOY_DIR/.env"
sed -i "s|SMTP_USER_PLACEHOLDER|${SMTP_USER}|g" "$DEPLOY_DIR/.env"
sed -i "s|SMTP_PASS_PLACEHOLDER|${SMTP_PASS}|g" "$DEPLOY_DIR/.env"
sed -i "s|SMTP_FROM_PLACEHOLDER|${SMTP_FROM}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_PAYMENTS_API_KEY_PLACEHOLDER|${DODO_PAYMENTS_API_KEY}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_PAYMENTS_WEBHOOK_KEY_PLACEHOLDER|${DODO_PAYMENTS_WEBHOOK_KEY}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_STARTER_MONTHLY_PRODUCT_ID_PLACEHOLDER|${DODO_STARTER_MONTHLY_PRODUCT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_STARTER_ANNUAL_PRODUCT_ID_PLACEHOLDER|${DODO_STARTER_ANNUAL_PRODUCT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_PRO_MONTHLY_PRODUCT_ID_PLACEHOLDER|${DODO_PRO_MONTHLY_PRODUCT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|DODO_PRO_ANNUAL_PRODUCT_ID_PLACEHOLDER|${DODO_PRO_ANNUAL_PRODUCT_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|MAINTENANCE_SECRET_PLACEHOLDER|${MAINTENANCE_SECRET}|g" "$DEPLOY_DIR/.env"

# App-specific env files
mkdir -p "$DEPLOY_DIR/apps/api" "$DEPLOY_DIR/apps/ingestion" "$DEPLOY_DIR/apps/web" "$DEPLOY_DIR/packages/db"

# API env
cat > "$DEPLOY_DIR/apps/api/.env" << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=DATABASE_URL_PLACEHOLDER
JWT_ACCESS_SECRET=JWT_ACCESS_SECRET_PLACEHOLDER
REDIS_URL=REDIS_URL_PLACEHOLDER
API_BASE_URL=https://API_DOMAIN_PLACEHOLDER
FRONTEND_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
INGESTION_BASE_URL=https://INGESTION_DOMAIN_PLACEHOLDER
APP_NAME=HookScope
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID_PLACEHOLDER
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET_PLACEHOLDER
GITHUB_CLIENT_ID=GITHUB_CLIENT_ID_PLACEHOLDER
GITHUB_CLIENT_SECRET=GITHUB_CLIENT_SECRET_PLACEHOLDER
SMTP_HOST=SMTP_HOST_PLACEHOLDER
SMTP_PORT=SMTP_PORT_PLACEHOLDER
SMTP_SECURE=false
SMTP_USER=SMTP_USER_PLACEHOLDER
SMTP_PASS=SMTP_PASS_PLACEHOLDER
SMTP_FROM=SMTP_FROM_PLACEHOLDER
DODO_PAYMENTS_API_KEY=DODO_PAYMENTS_API_KEY_PLACEHOLDER
DODO_PAYMENTS_WEBHOOK_KEY=DODO_PAYMENTS_WEBHOOK_KEY_PLACEHOLDER
DODO_STARTER_MONTHLY_PRODUCT_ID=DODO_STARTER_MONTHLY_PRODUCT_ID_PLACEHOLDER
DODO_STARTER_ANNUAL_PRODUCT_ID=DODO_STARTER_ANNUAL_PRODUCT_ID_PLACEHOLDER
DODO_PRO_MONTHLY_PRODUCT_ID=DODO_PRO_MONTHLY_PRODUCT_ID_PLACEHOLDER
DODO_PRO_ANNUAL_PRODUCT_ID=DODO_PRO_ANNUAL_PRODUCT_ID_PLACEHOLDER
MAINTENANCE_SECRET=MAINTENANCE_SECRET_PLACEHOLDER
ENVEOF

# Ingestion env
cat > "$DEPLOY_DIR/apps/ingestion/.env" << 'ENVEOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_URL=DATABASE_URL_PLACEHOLDER
REDIS_URL=REDIS_URL_PLACEHOLDER
S3_ENDPOINT=S3_ENDPOINT_PLACEHOLDER
S3_BUCKET=S3_BUCKET_PLACEHOLDER
AWS_REGION=AWS_REGION_PLACEHOLDER
AWS_ACCESS_KEY_ID=S3_ACCESS_KEY_PLACEHOLDER
AWS_SECRET_ACCESS_KEY=S3_SECRET_KEY_PLACEHOLDER
ENVEOF

# Web env
cat > "$DEPLOY_DIR/apps/web/.env" << 'ENVEOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://API_DOMAIN_PLACEHOLDER
NEXT_PUBLIC_APP_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
NEXT_PUBLIC_SITE_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
NEXT_PUBLIC_INGESTION_URL=https://INGESTION_DOMAIN_PLACEHOLDER
ENVEOF

# DB env
cat > "$DEPLOY_DIR/packages/db/.env" << 'ENVEOF'
DATABASE_URL=DATABASE_URL_PLACEHOLDER
NODE_ENV=production
ENVEOF

# Replace placeholders in app envs
for env_file in "$DEPLOY_DIR/apps/api/.env" "$DEPLOY_DIR/apps/ingestion/.env" "$DEPLOY_DIR/apps/web/.env" "$DEPLOY_DIR/packages/db/.env"; do
  sed -i "s|DATABASE_URL_PLACEHOLDER|${DATABASE_URL}|g" "$env_file"
  sed -i "s|JWT_ACCESS_SECRET_PLACEHOLDER|${JWT_ACCESS_SECRET}|g" "$env_file"
  sed -i "s|REDIS_URL_PLACEHOLDER|${REDIS_URL}|g" "$env_file"
  sed -i "s|S3_ENDPOINT_PLACEHOLDER|${S3_ENDPOINT}|g" "$env_file"
  sed -i "s|S3_BUCKET_PLACEHOLDER|${S3_BUCKET}|g" "$env_file"
  sed -i "s|AWS_REGION_PLACEHOLDER|${AWS_REGION}|g" "$env_file"
  sed -i "s|S3_ACCESS_KEY_PLACEHOLDER|${S3_ACCESS_KEY}|g" "$env_file"
  sed -i "s|S3_SECRET_KEY_PLACEHOLDER|${S3_SECRET_KEY}|g" "$env_file"
  sed -i "s|API_DOMAIN_PLACEHOLDER|${API_DOMAIN}|g" "$env_file"
  sed -i "s|FRONTEND_DOMAIN_PLACEHOLDER|${FRONTEND_DOMAIN}|g" "$env_file"
  sed -i "s|INGESTION_DOMAIN_PLACEHOLDER|${INGESTION_DOMAIN}|g" "$env_file"
  sed -i "s|GOOGLE_CLIENT_ID_PLACEHOLDER|${GOOGLE_CLIENT_ID}|g" "$env_file"
  sed -i "s|GOOGLE_CLIENT_SECRET_PLACEHOLDER|${GOOGLE_CLIENT_SECRET}|g" "$env_file"
  sed -i "s|GITHUB_CLIENT_ID_PLACEHOLDER|${GITHUB_CLIENT_ID}|g" "$env_file"
  sed -i "s|GITHUB_CLIENT_SECRET_PLACEHOLDER|${GITHUB_CLIENT_SECRET}|g" "$env_file"
  sed -i "s|SMTP_HOST_PLACEHOLDER|${SMTP_HOST}|g" "$env_file"
  sed -i "s|SMTP_PORT_PLACEHOLDER|${SMTP_PORT}|g" "$env_file"
  sed -i "s|SMTP_USER_PLACEHOLDER|${SMTP_USER}|g" "$env_file"
  sed -i "s|SMTP_PASS_PLACEHOLDER|${SMTP_PASS}|g" "$env_file"
  sed -i "s|SMTP_FROM_PLACEHOLDER|${SMTP_FROM}|g" "$env_file"
  sed -i "s|DODO_PAYMENTS_API_KEY_PLACEHOLDER|${DODO_PAYMENTS_API_KEY}|g" "$env_file"
  sed -i "s|DODO_PAYMENTS_WEBHOOK_KEY_PLACEHOLDER|${DODO_PAYMENTS_WEBHOOK_KEY}|g" "$env_file"
  sed -i "s|DODO_STARTER_MONTHLY_PRODUCT_ID_PLACEHOLDER|${DODO_STARTER_MONTHLY_PRODUCT_ID}|g" "$env_file"
  sed -i "s|DODO_STARTER_ANNUAL_PRODUCT_ID_PLACEHOLDER|${DODO_STARTER_ANNUAL_PRODUCT_ID}|g" "$env_file"
  sed -i "s|DODO_PRO_MONTHLY_PRODUCT_ID_PLACEHOLDER|${DODO_PRO_MONTHLY_PRODUCT_ID}|g" "$env_file"
  sed -i "s|DODO_PRO_ANNUAL_PRODUCT_ID_PLACEHOLDER|${DODO_PRO_ANNUAL_PRODUCT_ID}|g" "$env_file"
  sed -i "s|MAINTENANCE_SECRET_PLACEHOLDER|${MAINTENANCE_SECRET}|g" "$env_file"
done

success "Environment files generated"

# ─── Update docker-compose.yml for MinIO (remove localstack references) ──────
info "Writing docker-compose.yml (app services only — infra expected to be already running)..."
cat > "$DEPLOY_DIR/docker-compose.yml" << 'DCEOF'
name: webhook-observability

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - ./apps/api/.env

  ingestion:
    build:
      context: .
      dockerfile: apps/ingestion/Dockerfile
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - ./apps/ingestion/.env

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - ./apps/web/.env
DCEOF

success "docker-compose.yml written (api, ingestion, web only)"

# ─── Build and start services ─────────────────────────────────────────────────
cd "$DEPLOY_DIR"

info "Building and starting app services..."
$COMPOSE up -d --build api ingestion web

success "All services started!"
echo ""
echo "=============================================="
echo "   Deployment Complete!"
echo "=============================================="
echo ""
echo "Services:"
echo "  - API Server:       http://localhost:5000"
echo "  - Ingestion Server: http://localhost:3001"
echo "  - Web Frontend:     http://localhost:3000"
echo ""
echo "  Infra expected to be running externally:"
echo "  - Postgres:  ${DB_HOST}:${DB_PORT}"
echo "  - Redis:     ${REDIS_HOST}:${REDIS_PORT}"
echo "  - MinIO/S3:  ${S3_ENDPOINT}"
echo ""
echo "Deploy directory: $DEPLOY_DIR"
echo ""