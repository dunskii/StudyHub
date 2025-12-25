# StudyHub Development Setup Script (PowerShell)
# Usage: .\infrastructure\scripts\setup-dev.ps1

Write-Host "StudyHub Development Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

$missing = @()

if (!(Get-Command "node" -ErrorAction SilentlyContinue)) {
    $missing += "Node.js"
}

if (!(Get-Command "python" -ErrorAction SilentlyContinue)) {
    $missing += "Python"
}

if (!(Get-Command "docker" -ErrorAction SilentlyContinue)) {
    $missing += "Docker"
}

if ($missing.Count -gt 0) {
    Write-Host "Missing prerequisites: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Please install them and try again." -ForegroundColor Red
    exit 1
}

Write-Host "All prerequisites found!" -ForegroundColor Green

# Create .env file if not exists
if (!(Test-Path ".env")) {
    Write-Host "`nCreating .env file from example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please update .env with your API keys!" -ForegroundColor Yellow
}

# Start Docker services
Write-Host "`nStarting Docker services (PostgreSQL, Redis)..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d

# Setup Backend
Write-Host "`nSetting up backend..." -ForegroundColor Yellow
Set-Location backend

if (!(Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Set-Location ..

# Setup Frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Yellow
Set-Location frontend

if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
npm install

Set-Location ..

Write-Host "`n==========================" -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "`nTo start development:" -ForegroundColor Yellow
Write-Host "  Backend:  cd backend && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload"
Write-Host "  Frontend: cd frontend && npm run dev"
Write-Host "`nServices running:"
Write-Host "  PostgreSQL: localhost:5432"
Write-Host "  Redis:      localhost:6379"
Write-Host "  pgAdmin:    http://localhost:5050 (admin@studyhub.local / admin)"
