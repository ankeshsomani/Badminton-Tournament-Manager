#!/usr/bin/env bash
set -e

echo "🚀 Starting manual deployment to GCP Cloud Run (asia-south1 - Mumbai)..."

# Load local environment variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ] || [ -z "$JWT_SECRET" ]; then
  echo "❌ Error: DATABASE_URL and JWT_SECRET must be defined in your local .env file."
  exit 1
fi

# Ensure gcloud is configured
gcloud config set account ankeshsomani@gmail.com >/dev/null 2>&1 || true
gcloud config set project badminton-cloudrun >/dev/null 2>&1 || true

echo "☁️ Deploying container to Cloud Run in asia-south1..."
gcloud run deploy badminton-tournament-app \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,CLIENT_URL=${CLIENT_URL},DATABASE_URL=${DATABASE_URL},JWT_SECRET=${JWT_SECRET}"

echo "🎉 Manual deployment complete!"
