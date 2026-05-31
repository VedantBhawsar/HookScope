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
check_cmd docker-compose || check_cmd docker compose

# ─── Detect compose command ───────────────────────────────────────────────────
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  error "docker-compose not found"
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

# ─── Ask for Stripe (optional) ───────────────────────────────────────────────
echo ""
echo "── Stripe (optional) ──────────────────────────────────"
read -p "Stripe secret key: " STRIPE_SECRET_KEY
read -p "Stripe webhook secret: " STRIPE_WEBHOOK_SECRET
read -p "Stripe developer monthly price ID: " STRIPE_DEVELOPER_MONTHLY_PRICE_ID
read -p "Stripe developer annual price ID: " STRIPE_DEVELOPER_ANNUAL_PRICE_ID
read -p "Stripe pro monthly price ID: " STRIPE_PRO_MONTHLY_PRICE_ID
read -p "Stripe pro annual price ID: " STRIPE_PRO_ANNUAL_PRICE_ID
read -p "Stripe enterprise monthly price ID: " STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
read -p "Stripe enterprise annual price ID: " STRIPE_ENTERPRISE_ANNUAL_PRICE_ID

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
          . "$DEPLOY_DIR/" 2>/dev/null || cp -r . "$DEPLOY_DIR/
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

# ─── Stripe (Billing & Subscriptions) ─────────────────────────────────────────
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER

# ─── Stripe Price IDs ─────────────────────────────────────────────────────────
STRIPE_DEVELOPER_MONTHLY_PRICE_ID=STRIPE_DEVELOPER_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_DEVELOPER_ANNUAL_PRICE_ID=STRIPE_DEVELOPER_ANNUAL_PRICE_ID_PLACEHOLDER
STRIPE_PRO_MONTHLY_PRICE_ID=STRIPE_PRO_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_PRO_ANNUAL_PRICE_ID=STRIPE_PRO_ANNUAL_PRICE_ID_PLACEHOLDER
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=STRIPE_ENTERPRISE_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=STRIPE_ENTERPRISE_ANNUAL_PRICE_ID_PLACEHOLDER

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
sed -i "s|STRIPE_SECRET_KEY_PLACEHOLDER|${STRIPE_SECRET_KEY}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_WEBHOOK_SECRET_PLACEHOLDER|${STRIPE_WEBHOOK_SECRET}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_DEVELOPER_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_DEVELOPER_MONTHLY_PRICE_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_DEVELOPER_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_DEVELOPER_ANNUAL_PRICE_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_PRO_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_PRO_MONTHLY_PRICE_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_PRO_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_PRO_ANNUAL_PRICE_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_ENTERPRISE_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_ENTERPRISE_MONTHLY_PRICE_ID}|g" "$DEPLOY_DIR/.env"
sed -i "s|STRIPE_ENTERPRISE_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_ENTERPRISE_ANNUAL_PRICE_ID}|g" "$DEPLOY_DIR/.env"
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
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER
STRIPE_DEVELOPER_MONTHLY_PRICE_ID=STRIPE_DEVELOPER_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_DEVELOPER_ANNUAL_PRICE_ID=STRIPE_DEVELOPER_ANNUAL_PRICE_ID_PLACEHOLDER
STRIPE_PRO_MONTHLY_PRICE_ID=STRIPE_PRO_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_PRO_ANNUAL_PRICE_ID=STRIPE_PRO_ANNUAL_PRICE_ID_PLACEHOLDER
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=STRIPE_ENTERPRISE_MONTHLY_PRICE_ID_PLACEHOLDER
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=STRIPE_ENTERPRISE_ANNUAL_PRICE_ID_PLACEHOLDER
MAINTENANCE_SECRET=MAINTENANCE_SECRET_PLACEHOLDER
ENVEOF

# Ingestion env
cat > "$DEPLOY_DIR/apps/ingestion/.env" << 'ENVEOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
REDIS_URL=REDIS_URL_PLACEHOLDER
S3_ENDPOINT=S3_ENDPOINT_PLACEHOLDER
S3_BUCKET=S3_BUCKET_PLACEHOLDER
AWS_REGION=AWS_REGION_PLACEHOLDER
AWS_ACCESS_KEY_ID=S3_ACCESS_KEY_PLACEHOLDER
AWS_SECRET_ACCESS_KEY=S3_SECRET_KEY_PLACEHOLDER
ENVEOF

# Web env
cat > "$DEPLOY_DIR/apps/web/.env" << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://API_DOMAIN_PLACEHOLDER
NEXT_PUBLIC_APP_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
NEXT_PUBLIC_SITE_URL=https://FRONTEND_DOMAIN_PLACEHOLDER
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
  sed -i "s|STRIPE_SECRET_KEY_PLACEHOLDER|${STRIPE_SECRET_KEY}|g" "$env_file"
  sed -i "s|STRIPE_WEBHOOK_SECRET_PLACEHOLDER|${STRIPE_WEBHOOK_SECRET}|g" "$env_file"
  sed -i "s|STRIPE_DEVELOPER_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_DEVELOPER_MONTHLY_PRICE_ID}|g" "$env_file"
  sed -i "s|STRIPE_DEVELOPER_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_DEVELOPER_ANNUAL_PRICE_ID}|g" "$env_file"
  sed -i "s|STRIPE_PRO_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_PRO_MONTHLY_PRICE_ID}|g" "$env_file"
  sed -i "s|STRIPE_PRO_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_PRO_ANNUAL_PRICE_ID}|g" "$env_file"
  sed -i "s|STRIPE_ENTERPRISE_MONTHLY_PRICE_ID_PLACEHOLDER|${STRIPE_ENTERPRISE_MONTHLY_PRICE_ID}|g" "$env_file"
  sed -i "s|STRIPE_ENTERPRISE_ANNUAL_PRICE_ID_PLACEHOLDER|${STRIPE_ENTERPRISE_ANNUAL_PRICE_ID}|g" "$env_file"
  sed -i "s|MAINTENANCE_SECRET_PLACEHOLDER|${MAINTENANCE_SECRET}|g" "$env_file"
done

success "Environment files generated"

# ─── Update docker-compose.yml for MinIO (remove localstack references) ──────
info "Updating docker-compose.yml..."
cat > "$DEPLOY_DIR/docker-compose.yml" << 'DCEOF'
name: webhook-observability

services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: webhook_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d webhook_db"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: MINIO_ACCESS_KEY_PLACEHOLDER
      MINIO_ROOT_PASSWORD: MINIO_SECRET_KEY_PLACEHOLDER
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9000/minio/health/live || exit 1"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio-init:
    image: minio/mc:latest
    volumes:
      - ./infra/minio/init:/init
    environment:
      MINIO_ROOT_USER: MINIO_ACCESS_KEY_PLACEHOLDER
      MINIO_ROOT_PASSWORD: MINIO_SECRET_KEY_PLACEHOLDER
    entrypoint: ["/bin/sh", "/init/01-create-buckets.sh"]
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - ./apps/api/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy

  ingestion:
    build:
      context: .
      dockerfile: apps/ingestion/Dockerfile
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - ./apps/ingestion/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - ./apps/web/.env

volumes:
  postgres_data:
  redis_data:
  minio_data:
DCEOF

sed -i "s|MINIO_ACCESS_KEY_PLACEHOLDER|${S3_ACCESS_KEY}|g" "$DEPLOY_DIR/docker-compose.yml"
sed -i "s|MINIO_SECRET_KEY_PLACEHOLDER|${S3_SECRET_KEY}|g" "$DEPLOY_DIR/docker-compose.yml"

success "docker-compose.yml updated with MinIO"

# ─── Build and start services ─────────────────────────────────────────────────
cd "$DEPLOY_DIR"

info "Building and starting services..."
$COMPOSE up -d --build postgres redis minio

info "Waiting for postgres to be ready..."
sleep 10

info "Initializing MinIO buckets..."
$COMPOSE up minio-init

info "Starting API, ingestion, and web services..."
$COMPOSE up -d api ingestion web

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
echo "  - MinIO Console:    http://localhost:9001"
echo "  - MinIO API:        http://localhost:9000"
echo ""
echo "Deploy directory: $DEPLOY_DIR"
echo ""