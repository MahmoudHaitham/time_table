#!/bin/bash
set -e

echo "🔧 Setting up VPS server..."

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw

sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

echo "✅ Server ready!"
echo "Next: bash cicd/deployment/02-install-docker.sh"
