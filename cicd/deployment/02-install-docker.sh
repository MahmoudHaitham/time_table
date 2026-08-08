#!/bin/bash
set -e

echo "🐳 Installing Docker..."

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker "$USER"
rm get-docker.sh

echo "✅ Docker installed!"
echo "⚠️  Log out and back in for docker group changes to take effect."
