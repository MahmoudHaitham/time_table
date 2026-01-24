#!/bin/bash

# 🚀 Timetable Management System - Deployment Script
# Run this script on your VPS after initial setup

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/timetable-system"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_warning "Not running as root. Some commands may require sudo."
fi

# Navigate to project directory
cd "$PROJECT_DIR" || {
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
}

print_status "Project directory: $PROJECT_DIR"

# Update code from Git (if using Git)
if [ -d ".git" ]; then
    print_status "Pulling latest code from Git..."
    git pull origin main || git pull origin master
else
    print_warning "Not a Git repository. Skipping git pull."
fi

# Backend Deployment
print_status "Deploying backend..."
cd "$BACKEND_DIR"

# Install dependencies
print_status "Installing backend dependencies..."
npm install --production

# Build backend
print_status "Building backend..."
npm run build

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error "Backend .env file not found!"
    print_warning "Please create $BACKEND_DIR/.env with required variables"
    exit 1
fi

# Restart backend with PM2
print_status "Restarting backend with PM2..."
pm2 restart timetable-backend || pm2 start dist/server.js --name timetable-backend

# Frontend Deployment
print_status "Deploying frontend..."
cd "$FRONTEND_DIR"

# Install dependencies
print_status "Installing frontend dependencies..."
npm install --production

# Build frontend
print_status "Building frontend..."
npm run build

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning "Frontend .env.local file not found!"
    print_warning "Please create $FRONTEND_DIR/.env.local with NEXT_PUBLIC_API_URL"
fi

# Restart frontend with PM2
print_status "Restarting frontend with PM2..."
pm2 restart timetable-frontend || pm2 start npm --name timetable-frontend -- start

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx || print_warning "Could not reload Nginx (may require manual restart)"

# Check services status
echo ""
print_status "Checking service status..."
pm2 status

echo ""
print_status "Deployment complete! 🎉"
echo ""
echo "Next steps:"
echo "  1. Check logs: pm2 logs"
echo "  2. Test backend: curl http://localhost:5000/health"
echo "  3. Test frontend: Visit your domain"
echo "  4. Monitor: pm2 monit"
