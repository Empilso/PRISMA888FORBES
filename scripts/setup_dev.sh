#!/bin/bash

# SheepStack v3.0 - Development Environment Setup
# This script initializes the development environment

set -e

echo "🐑 SheepStack v3.0 - Development Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi
echo "✅ Docker found"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose found"

# Check uv (for local backend development)
if ! command -v uv &> /dev/null; then
    echo "⚠️  uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "✅ uv installed"
else
    echo "✅ uv found"
fi

# Check pnpm (for local frontend development)
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing pnpm..."
    npm install -g pnpm@8.15.0
    echo "✅ pnpm installed"
else
    echo "✅ pnpm found"
fi

# Setup backend
echo -e "\n${YELLOW}Setting up backend...${NC}"
cd backend
if [ ! -f ".python-version" ]; then
    echo "3.12" > .python-version
fi
uv sync
echo "✅ Backend dependencies installed"
cd ..

# Setup frontend
echo -e "\n${YELLOW}Setting up frontend...${NC}"
cd frontend
pnpm install
echo "✅ Frontend dependencies installed"
cd ..

# Create .env files if they don't exist
echo -e "\n${YELLOW}Creating environment files...${NC}"

if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
DATABASE_URL=postgresql://sheepstack_user:sheepstack_password@localhost:5432/sheepstack_db
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=sheepstack-backend
EOF
    echo "✅ Created backend/.env"
fi

if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created frontend/.env.local"
fi

# Start infrastructure
echo -e "\n${YELLOW}Starting infrastructure...${NC}"
cd infrastructure
docker compose up -d postgres jaeger
echo "⏳ Waiting for services to be healthy..."
sleep 10
cd ..

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start all services:"
echo "     cd infrastructure && docker compose up -d"
echo ""
echo "  2. Access services:"
echo "     - Backend API: http://localhost:8000"
echo "     - Frontend: http://localhost:3000"
echo "     - Kestra UI: http://localhost:8080"
echo "     - Jaeger UI: http://localhost:16686"
echo ""
echo "  3. View logs:"
echo "     docker compose -f infrastructure/docker-compose.yml logs -f"
echo ""
echo "Happy coding! 🚀"
