@echo off
echo ========================================
echo CreatorPlus Development Setup
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo Starting development services...
docker-compose up -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo Installing dependencies...
call npm install

echo.
echo Generating Prisma client...
call npx turbo db:generate

echo.
echo Running database migrations...
call npx turbo db:push

echo.
echo Seeding database...
call npx turbo db:seed

echo.
echo ========================================
echo Setup complete!
echo.
echo To start development:
echo   npm run dev
echo.
echo Services running at:
echo   PostgreSQL: localhost:5432
echo   Redis: localhost:6379
echo   Meilisearch: localhost:7700
echo   API: http://localhost:3001
echo   Web: http://localhost:3000
echo   API Docs: http://localhost:3001/api/docs
echo ========================================
pause
