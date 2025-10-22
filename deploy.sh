#!/bin/bash

# JointRight Video Conferencing App Deployment Script
# This script builds and deploys the application using Docker

set -e  # Exit on any error

echo "🚀 Starting JointRight deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p backend/recordings

# Set proper permissions (Linux/Mac)
if [[ "$OSTYPE" != "msys" ]]; then
    chmod 755 backend/logs
    chmod 755 backend/uploads
    chmod 755 backend/recordings
fi

# Stop existing containers if running
print_status "Stopping existing containers..."
docker-compose down --remove-orphans

# Pull latest images
print_status "Pulling latest base images..."
docker-compose pull

# Build and start services
print_status "Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check MongoDB
if docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    print_status "✅ MongoDB is healthy"
else
    print_warning "⚠️  MongoDB health check failed"
fi

# Check Backend
if curl -f http://localhost:5000/api/health &> /dev/null; then
    print_status "✅ Backend is healthy"
else
    print_warning "⚠️  Backend health check failed"
fi

# Check Frontend
if curl -f http://localhost/health &> /dev/null; then
    print_status "✅ Frontend is healthy"
else
    print_warning "⚠️  Frontend health check failed"
fi

# Show running containers
print_status "Running containers:"
docker-compose ps

# Show logs
print_status "Recent logs:"
docker-compose logs --tail=10

print_status "🎉 Deployment completed!"
print_status "🌐 Frontend available at: http://localhost"
print_status "🔧 Backend API available at: http://localhost:5000"
print_status "📊 MongoDB available at: localhost:27017"

print_warning "Important: Make sure to update the following before production:"
print_warning "1. Change JWT_SECRET in docker-compose.yml"
print_warning "2. Update MongoDB credentials"
print_warning "3. Configure proper domain names"
print_warning "4. Set up SSL certificates"
print_warning "5. Configure email settings in backend/.env.production"

echo ""
print_status "To view logs: docker-compose logs -f [service_name]"
print_status "To stop: docker-compose down"
print_status "To restart: docker-compose restart [service_name]"