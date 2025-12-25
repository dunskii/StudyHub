#!/bin/bash
# StudyHub Development Setup Script (Bash)
# Usage: ./infrastructure/scripts/setup-dev.sh

set -e

echo "StudyHub Development Setup"
echo "=========================="

# Check prerequisites
echo -e "\nChecking prerequisites..."

missing=()

if ! command -v node &> /dev/null; then
    missing+=("Node.js")
fi

if ! command -v python3 &> /dev/null; then
    missing+=("Python")
fi

if ! command -v docker &> /dev/null; then
    missing+=("Docker")
fi

if [ ${#missing[@]} -ne 0 ]; then
    echo "Missing prerequisites: ${missing[*]}"
    echo "Please install them and try again."
    exit 1
fi

echo "All prerequisites found!"

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo -e "\nCreating .env file from example..."
    cp .env.example .env
    echo "Please update .env with your API keys!"
fi

# Start Docker services
echo -e "\nStarting Docker services (PostgreSQL, Redis)..."
docker-compose -f docker-compose.dev.yml up -d

# Setup Backend
echo -e "\nSetting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Setup Frontend
echo -e "\nSetting up frontend..."
cd frontend

if [ ! -f ".env" ]; then
    cp .env.example .env
fi

echo "Installing Node dependencies..."
npm install

cd ..

echo -e "\n=========================="
echo "Setup complete!"
echo -e "\nTo start development:"
echo "  Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  Frontend: cd frontend && npm run dev"
echo -e "\nServices running:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo "  pgAdmin:    http://localhost:5050 (admin@studyhub.local / admin)"
