#!/bin/bash

echo "=========================================="
echo "Fixing Backend CORS Configuration"
echo "=========================================="

cd ~/portfolio || exit 1

echo ""
echo "Step 1: Updating backend .env file..."

# Check if CORS_ORIGIN exists and replace it
if grep -q "^CORS_ORIGIN=" backend/.env 2>/dev/null; then
    sed -i 's/^CORS_ORIGIN=/ALLOWED_ORIGINS=/' backend/.env
    echo "✅ Replaced CORS_ORIGIN with ALLOWED_ORIGINS"
fi

# Check if ALLOWED_ORIGINS exists, if not add it
if ! grep -q "^ALLOWED_ORIGINS=" backend/.env 2>/dev/null; then
    echo "" >> backend/.env
    echo "# CORS Configuration" >> backend/.env
    echo "ALLOWED_ORIGINS=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com" >> backend/.env
    echo "✅ Added ALLOWED_ORIGINS to backend/.env"
else
    # Update existing ALLOWED_ORIGINS if it doesn't have the production domains
    if ! grep -q "mahmoudhaisam.com" backend/.env; then
        sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com|' backend/.env
        echo "✅ Updated ALLOWED_ORIGINS with production domains"
    else
        echo "✅ ALLOWED_ORIGINS already configured correctly"
    fi
fi

echo ""
echo "Step 2: Restarting backend container..."
docker compose restart backend

echo ""
echo "Step 3: Waiting for backend to start..."
sleep 5

echo ""
echo "Step 4: Checking CORS configuration in logs..."
docker logs portfolio-backend 2>&1 | grep -A 1 "CORS Configuration" | tail -2

echo ""
echo "=========================================="
echo "Backend CORS Fix Complete"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Frontend still needs to be rebuilt!"
echo "The frontend image was built with NEXT_PUBLIC_API_URL=http://localhost:5000"
echo "It needs to be rebuilt with NEXT_PUBLIC_API_URL=/api"
echo ""
echo "To rebuild frontend:"
echo "  cd ~/portfolio/cicd/linux"
echo "  ./build-frontend.sh"
echo "  cd ~/portfolio"
echo "  docker compose pull"
echo "  docker compose up -d"
