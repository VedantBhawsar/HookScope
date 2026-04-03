#!/usr/bin/env bash
# Runs inside the LocalStack container once it is ready.
# awslocal is pre-installed and pre-configured to target localhost:4566.
set -euo pipefail

BUCKET="webhooks"
REGION="us-east-1"

echo "[init] Creating S3 bucket: $BUCKET"
awslocal s3 mb "s3://${BUCKET}" --region "${REGION}"

echo "[init] Applying lifecycle rule (expire objects after 90 days)"
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket "${BUCKET}" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-old-events",
      "Status": "Enabled",
      "Expiration": { "Days": 90 },
      "Filter": { "Prefix": "events/" }
    }]
  }'

echo "[init] LocalStack S3 initialisation complete"
