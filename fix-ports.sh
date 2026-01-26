#!/bin/bash

echo "=========================================="
echo "Port Configuration Diagnostic & Fix"
echo "=========================================="

cd ~/portfolio || exit 1

echo ""
echo "Step 1: Stopping containers..."
docker compose down

echo ""
echo "Step 2: Checking for port conflicts..."
if lsof -i :5002 >/dev/null 2>&1; then
    echo "⚠️  Port 5002 is in use:"
    lsof -i :5002
    echo "Please stop the service using port 5002 or change the port in docker-compose.yml"
fi

if lsof -i :8001 >/dev/null 2>&1; then
    echo "⚠️  Port 8001 is in use:"
    lsof -i :8001
    echo "Please stop the service using port 8001 or change the port in docker-compose.yml"
fi

echo ""
echo "Step 3: Starting containers..."
docker compose up -d

echo ""
echo "Step 4: Waiting for containers to start..."
sleep 5

echo ""
echo "Step 5: Checking container status..."
docker compose ps

echo ""
echo "Step 6: Checking port bindings..."
echo "Backend ports:"
docker port portfolio-backend 2>/dev/null || echo "  ❌ Backend container not running"
echo "Frontend ports:"
docker port portfolio-frontend 2>/dev/null || echo "  ❌ Frontend container not running"

echo ""
echo "Step 7: Testing direct connections..."
echo "Testing backend (port 5002):"
if curl -s http://localhost:5002/health >/dev/null 2>&1; then
    echo "  ✅ Backend is accessible on port 5002"
else
    echo "  ❌ Backend is NOT accessible on port 5002"
fi

echo "Testing frontend (port 8001):"
if curl -s http://localhost:8001 >/dev/null 2>&1; then
    echo "  ✅ Frontend is accessible on port 8001"
else
    echo "  ❌ Frontend is NOT accessible on port 8001"
fi

echo ""
echo "Step 8: Reloading Caddy..."
if systemctl is-active --quiet caddy; then
    echo "Reloading Caddy service..."
    sudo systemctl reload caddy
    echo "  ✅ Caddy reloaded"
else
    echo "  ⚠️  Caddy service not found or not running"
fi

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check container logs: docker logs portfolio-backend"
echo "2. Check container logs: docker logs portfolio-frontend"
echo "3. Test via Caddy: curl https://www.mahmoudhaisam.com/api/health"
echo "4. Check Caddy logs: sudo journalctl -u caddy -n 50"
