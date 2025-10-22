@echo off
echo Starting JointRight Development Environment...
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: Start MongoDB (assuming it's installed locally)
echo Starting MongoDB...
start "MongoDB" mongod --dbpath "data\db"

:: Wait a few seconds for MongoDB to start
timeout /t 5 /nobreak > nul

:: Start Backend Server
echo Starting Backend Server...
cd backend
start "Backend Server" npm run dev
cd ..

:: Wait a few seconds
timeout /t 3 /nobreak > nul

:: Start Frontend Development Server
echo Starting Frontend Development Server...
cd frontend
start "Frontend Server" npm start
cd ..

echo.
echo ================================
echo   Development servers started!
echo ================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo MongoDB:  mongodb://localhost:27017
echo.
echo Press any key to continue...
pause > nul