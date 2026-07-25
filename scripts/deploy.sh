#!/usr/bin/env bash
set -e

SERVICE_NAME="mbpl-app"

echo "🚀 Building frontend React assets locally..."
npm --prefix client run build

# Load local environment variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ] || [ -z "$JWT_SECRET" ]; then
  echo "❌ Error: DATABASE_URL and JWT_SECRET must be defined in your local .env file."
  exit 1
fi

echo "☁️ Deploying container to Cloud Run in asia-south1..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,CLIENT_URL=${CLIENT_URL},DATABASE_URL=${DATABASE_URL},JWT_SECRET=${JWT_SECRET}"

echo "🎉 Manual deployment complete!"
