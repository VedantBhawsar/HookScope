#!/usr/bin/env bash
# Runs inside the MinIO container once it is ready.
# mc (MinIO Client) is pre-installed and pre-configured.
set -euo pipefail

BUCKET="webhooks"
REGION="us-east-1"
ALIAS="myminio"

echo "[init] Waiting for MinIO to be ready..."
sleep 5

echo "[init] Configuring MinIO client alias"
mc alias set "${ALIAS}" http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "[init] Creating S3 bucket: $BUCKET"
mc mb "myminio/${BUCKET}" --region "${REGION}"

echo "[init] Applying lifecycle rule (expire objects after 90 days)"
mc ilm import "myminio/${BUCKET}" --json <<'EOF'
{
  "Rules": [{
    "ID": "expire-old-events",
    "Status": "Enabled",
    "Expiration": { "Days": 90 },
    "Filter": { "Prefix": "events/" }
  }]
}
EOF

echo "[init] MinIO S3 initialisation complete"
