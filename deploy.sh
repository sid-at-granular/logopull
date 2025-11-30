#!/bin/bash

# Deployment script for Azure Container Instances or App Service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found${NC}"
    echo "Please create .env.local with your Clerk keys"
    exit 1
fi

# Load environment variables
source .env.local

# Check required variables
if [ -z "$CLERK_SECRET_KEY" ] || [ -z "$VITE_CLERK_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ Error: CLERK_SECRET_KEY or VITE_CLERK_PUBLISHABLE_KEY not set${NC}"
    exit 1
fi

# Build the application
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

# Build Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" -t logopull:latest .

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "To run locally:"
echo "  docker-compose up"
echo ""
echo "To deploy to Azure Container Instances:"
echo "  az container create \\"
echo "    --resource-group <your-rg> \\"
echo "    --name logopull \\"
echo "    --image logopull:latest \\"
echo "    --dns-name-label <unique-name> \\"
echo "    --ports 8080 \\"
echo "    --environment-variables \\"
echo "      NODE_ENV=production \\"
echo "      PORT=8080 \\"
echo "      CLERK_SECRET_KEY='$CLERK_SECRET_KEY' \\"
echo "      VITE_CLERK_PUBLISHABLE_KEY='$VITE_CLERK_PUBLISHABLE_KEY' \\"
echo "      CLERK_PUBLISHABLE_KEY='$VITE_CLERK_PUBLISHABLE_KEY'"

