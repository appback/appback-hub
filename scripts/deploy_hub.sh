#!/bin/bash
set -e

# Appback Hub deployment script
# Usage: ./scripts/deploy_hub.sh

EC2_HOST="appback"
REMOTE_DIR="/home/ubuntu/appback-hub"

echo "=== Building Docker images ==="
docker build -t hub-api:latest -f ./apps/api/Dockerfile .
docker build -t hub-client:latest ./client

echo "=== Saving Docker images ==="
docker save hub-api:latest | gzip > /tmp/hub-api.tar.gz
docker save hub-client:latest | gzip > /tmp/hub-client.tar.gz

echo "=== Uploading to EC2 ==="
scp /tmp/hub-api.tar.gz /tmp/hub-client.tar.gz $EC2_HOST:/tmp/
scp docker/docker-compose.prod.yml $EC2_HOST:$REMOTE_DIR/docker-compose.prod.yml

echo "=== Loading images on EC2 ==="
ssh $EC2_HOST "docker load < /tmp/hub-api.tar.gz && docker load < /tmp/hub-client.tar.gz"

echo "=== Restarting services ==="
ssh $EC2_HOST "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d"

echo "=== Cleanup ==="
rm -f /tmp/hub-api.tar.gz /tmp/hub-client.tar.gz
ssh $EC2_HOST "rm -f /tmp/hub-api.tar.gz /tmp/hub-client.tar.gz"

echo "=== Done ==="
